import { config } from "@/config/app.config";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/CatchError";
import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { userService } from "@/modules/user/user.module";
import { thirtyDaysFromNow } from "@/utils/date-time";
import { refreshTokenSignOptions, signJwtToken } from "@/utils/jwt";

const prisma = new PrismaClient();

export class MfaService {
  // =============== GENERATE MFA SETUP ===============
  public async generateMFASetup(req: Request) {
    // Get's user from req - logged in user (cookies)
    const user = req.user;

    // Error if not logged in or messed up cookies
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    // Get full user details
    const fullUserDetails = await userService.fullUserDetailsByID(user.id);

    // Error if not logged in or messed up cookies
    if (!fullUserDetails) {
      throw new UnauthorizedException(
        "User not authorized or there is no user"
      );
    }

    // Checks if user does not have MFA already enabled
    if (fullUserDetails.userPreferences?.enable2FA) {
      return {
        message: "MFA already enabled",
      };
    }

    // Checks if user has twoFactorSecret already
    let secretKey = fullUserDetails.account?.twoFactorSecret;

    // If doesn't then create one and update user db
    if (!secretKey) {
      const secret = speakeasy.generateSecret({ name: "Your QR secret" });
      secretKey = secret.base32;

      await prisma.account.update({
        where: { userId: user.id },
        data: {
          twoFactorSecret: secretKey,
        },
      });
    }

    // Generates url based on provided info and options
    const url = speakeasy.otpauthURL({
      secret: secretKey,
      label: `${user.name}`,
      issuer: config.DOMAIN_NAME,
      encoding: "base32",
    });

    // Generates QR code based on provided URL
    const qrImageUrl = await qrcode.toDataURL(url);

    // Returns variables to controller
    return {
      message: "Scan the QR code or use the setup key.",
      secret: secretKey,
      qrImageUrl,
    };
  }

  // ================ VERIFY MFA SETUP ================
  public async verifyMFASetup(req: Request, code: string, secretKey: string) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    // Get full user details
    const fullUserDetails = await userService.fullUserDetailsByID(user.id);

    // Error if not logged in or messed up cookies
    if (!fullUserDetails) {
      throw new UnauthorizedException(
        "User not authorized or there is no user"
      );
    }

    if (fullUserDetails.userPreferences?.enable2FA) {
      return {
        message: "MFA is already enabled ",
        userPreferences: {
          enable2FA: fullUserDetails.userPreferences.enable2FA,
        },
      };
    }
    const isValid = speakeasy.totp.verify({
      secret: secretKey,
      encoding: "base32",
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.");
    }

    const updatedUser = await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { enable2FA: true },
    });

    return {
      message: "MFA setup completed successfully.",
      userPreferences: {
        enable2FA: updatedUser.enable2FA,
      },
    };
  }

  // ================ REVOKE MFA SETUP ================
  public async revokeMFASetup(req: Request) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    // Get full user details
    const fullUserDetails = await userService.fullUserDetailsByID(user.id);

    // Error if not logged in or messed up cookies
    if (!fullUserDetails) {
      throw new UnauthorizedException(
        "User not authorized or there is no user"
      );
    }

    if (!fullUserDetails.userPreferences?.enable2FA) {
      return {
        message: "MFA is not enabled",
        userPreferences: {
          enable2FA: fullUserDetails.userPreferences?.enable2FA,
        },
      };
    }
    const [updatedPreferences, updatedAccount] = await prisma.$transaction([
      prisma.userPreferences.update({
        where: { userId: user.id },
        data: {
          enable2FA: false,
        },
      }),
      prisma.account.update({
        where: { userId: user.id },
        data: {
          twoFactorSecret: null,
        },
      }),
    ]);

    return {
      message: "MFA revoked successfully",
      userPreferences: {
        enable2FA: updatedPreferences.enable2FA,
      },
    };
  }

  // ================ VERIFY MFA LOGIN ================
  public async verifyMFALogin(code: string, email: string, userAgent?: string) {
    const user = await userService.fullUserDetailsByEmail(email);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.userPreferences?.enable2FA && !user.account?.twoFactorSecret) {
      throw new UnauthorizedException("MFA not enabled for this user");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.account?.twoFactorSecret!,
      encoding: "base32",
      token: code,
    });

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.");
    }

    // Creates new session for logged in user (lasts 30 days)
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent,
        expiredAt: thirtyDaysFromNow(),
        userRole: user.role,
      },
    });

    // Creates new access token for user
    const accessToken = signJwtToken({
      userId: user.id,
      sessionId: session.id,
      role: user.role,
    });

    // Refreshes existing user token if old exists
    const refreshToken = signJwtToken(
      {
        sessionId: session.id,
      },
      refreshTokenSignOptions
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
