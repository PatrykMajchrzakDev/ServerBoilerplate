import { config } from "@/config/app.config";
import { UnauthorizedException } from "@/utils/CatchError";
import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const prisma = new PrismaClient();

export class MfaService {
  public async generateMFASetup(req: Request) {
    // Get's user from req - logged in user (cookies)
    const user = req.user;

    // Error if not logged in or messed up cookies
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    // Checks if user does not have MFA already enabled
    if (user.enable2FA) {
      return {
        message: "MFA already enabled",
      };
    }

    // Checks if user has twoFactorSecret already
    let secretKey = user.twoFactorSecret;

    // If doesn't then create one and update user db
    if (!secretKey) {
      const secret = speakeasy.generateSecret({ name: "Your QR secret" });
      secretKey = secret.base32;

      await prisma.user.update({
        where: { id: user.id },
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
}
