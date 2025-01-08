import { ErrorCode } from "@/common/enums/errorCodeEnum";
import { VerificationEnum } from "@/common/enums/verificationCodeEnum";
import { LoginDto, RegisterDto } from "@/common/interface/auth.interface";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/CatchError";
import {
  ONE_DAY_IN_MS,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  thirtyDaysFromNow,
} from "@/utils/date-time";
import { generateUniqueCode } from "@/utils/uuid";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { hashValue, compareValue } from "@/utils/bcrypt";
import { config } from "@/config/app.config";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} from "@/utils/jwt";
import { sendEmail } from "@/services/mail/mailer";
import { verifyEmailTemplate } from "@/services/mail/templates/template";

const prisma = new PrismaClient();

// THIS ENTIRE AuthService CLASS HOLDS ALL METHODS USED FOR USER AUTHENTICATION

export class AuthService {
  // ==================== REGISTER ====================
  public async register(registerData: RegisterDto) {
    const { name, email, password } = registerData;

    // Checks if same user does not already exist
    const existingEmail = await prisma.user.findUnique({ where: { email } });

    if (existingEmail) {
      throw new BadRequestException(
        "User with this email already exists",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }
    const existingName = await prisma.user.findUnique({ where: { name } });
    if (existingName) {
      throw new BadRequestException(
        "User with this name already exists",
        ErrorCode.AUTH_NAME_ALREADY_EXISTS
      );
    }

    // Create id for user. It is not done via uuid cause it's too long
    let id;
    let sameId;
    do {
      id = crypto.randomBytes(5).toString("hex");
      sameId = await prisma.user.findUnique({ where: { id } });
    } while (sameId);

    // Hashing password
    const hashedPassword = await hashValue(password);

    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        id,
        name,
        email,
        role: "USER", // Assign 'USER' role by default
        password: hashedPassword,
      },
    });

    const userId = newUser.id;

    // Creates verification code to verify user
    const userVerificationCode = await prisma.verificationCode.create({
      data: {
        user: { connect: { id: newUser.id } }, // Correct relational linking
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
        code: generateUniqueCode(),
      },
    });

    // Sending verification email link
    const verificationUrl = `${config.FRONTEND_BASE_URL}/confirm-account?code=${userVerificationCode.code}`;
    await sendEmail({
      to: newUser.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    return newUser;
  }
  // ===================== LOGIN ======================
  public async login(loginData: LoginDto) {
    // Destructure JSON data
    const { email, password, userAgent } = loginData;
    const user = await prisma.user.findUnique({ where: { email } });

    // Checks if user exists
    if (!user) {
      throw new BadRequestException(
        "Invalid email or password",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    // only local users can put in password so check if password exists
    if (user.provider.toLowerCase() !== "local") {
      throw new BadRequestException(
        "This email is linked with 3rd Party Provider e.g. Google or Microsoft",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    // Compares hashed user password with typed one by client
    const isPasswordValid = await compareValue(password, user.password);

    // Throw error is wrong password
    if (!isPasswordValid) {
      throw new BadRequestException(
        "Invalid email or password",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    // Delete all previous sessions so db is not cluttered with previous user sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Creates new session for logged in user (lasts 30 days)
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent,
        expiredAt: thirtyDaysFromNow(),
      },
    });

    // Creates new access token for user
    const accessToken = signJwtToken({
      userId: user.id,
      sessionId: session.id,
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
      mfaRequired: false,
    };
  }

  // ================ REFRESH TOKEN ===================
  public async refreshToken(refreshToken: string) {
    // Payload is returned if everything was ok. Here I pass refresh token
    // and refresh token secret to verify provided token
    const { payload } = verifyJwtToken<RefreshTokenPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Finds user session
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });
    const now = Date.now();

    if (!session) {
      throw new UnauthorizedException("Session does not exist");
    }

    if (session.expiredAt.getTime() < now) {
      throw new UnauthorizedException("Session expired");
    }

    // Checks if session require refresh
    const sessionRequireRefresh =
      session.expiredAt.getTime() - now < ONE_DAY_IN_MS;

    // If refresh is required then update time in DB
    if (sessionRequireRefresh) {
      await prisma.session.update({
        where: { id: payload.sessionId },
        data: {
          expiredAt: calculateExpirationDate(config.JWT_REFRESH_EXPIRES_IN),
        },
      });
    }

    // If refresh was required then sign with jwt
    const newRefreshToken = sessionRequireRefresh
      ? signJwtToken({ sessionId: session.id }, refreshTokenSignOptions)
      : undefined;

    // Check access token and sign with jwt
    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session.id,
    });

    // Return both access and refresh tokens
    return {
      accessToken,
      newRefreshToken,
    };
  }

  // ================= VERIFY EMAIL ===================
  public async verifyEmail(code: string) {
    // Find provided code if exists in db
    const validCode = await prisma.verificationCode.findUnique({
      where: { code },
    });

    // Error if code does not exists in db
    if (!validCode || validCode.expiresAt < new Date(Date.now())) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    // Update user property to true if code matches with provided code
    const updatedUser = await prisma.user.update({
      where: { id: validCode.userId },
      data: { isEmailVerified: true },
    });

    // Throw error if could not update
    if (!updatedUser) {
      throw new BadRequestException(
        "Unable to verify email address",
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Deleting the verification code after successful verification
    await prisma.verificationCode.delete({
      where: { id: validCode.id },
    });

    return {
      user: updatedUser,
    };
  }
}
