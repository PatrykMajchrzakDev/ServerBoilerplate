import { ErrorCode } from "@/common/enums/errorCodeEnum";
import { VerificationEnum } from "@/common/enums/verificationCodeEnum";
import {
  LoginDto,
  RegisterDto,
  resetPasswordDto,
} from "@/common/interface/auth.interface";
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/CatchError";
import {
  ONE_DAY_IN_MS,
  anHourFromNow,
  calculateExpirationDate,
  fortyFiveMinutesFromNow,
  tenMinutesAgo,
  thirtyDaysFromNow,
} from "@/utils/date-time";
import { generateUniqueCode } from "@/utils/uuid";
import { Membership, PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashValue, compareValue } from "@/utils/bcrypt";
import { config } from "@/config/app.config";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signJwtToken,
  verifyJwtToken,
} from "@/utils/jwt";
import { sendEmail } from "@/services/mail/mailer";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "@/services/mail/templates/template";
import { HTTPSTATUS } from "@/config/http.config";
import { userService } from "../user/user.module";
import { ProviderEnum } from "@/common/enums/accountProviderEnum";
import {
  registerSchema,
  loginSchema,
  emailSchema,
  passwordSchema,
} from "@/common/validation/auth.validator";
import { UserRole } from "@/common/enums/userRoleEnum";

const prisma = new PrismaClient();

// THIS ENTIRE AuthService CLASS HOLDS ALL METHODS USED FOR USER AUTHENTICATION

export class AuthService {
  // ==================== REGISTER ====================
  public async register(registerData: RegisterDto) {
    const { name, email, password } = registerData;

    const validatedData = registerSchema.parse(registerData);

    if (!validatedData) {
      throw new BadRequestException(
        "Register validation unsuccessful",
        ErrorCode.VALIDATION_ERROR
      );
    }

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
        role: UserRole.USER, // Assign 'USER' role by default
        membership: Membership.REGULAR, //By default
        password: hashedPassword,
        account: {
          create: {
            provider: ProviderEnum.EMAIL,
          }, // Defaults will be used
        },
        userPreferences: {
          create: {}, // Defaults will be used
        },
      },
    });

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
    const verificationUrl = `${config.FRONTEND_BASE_URL}/verify-email?code=${userVerificationCode.code}`;
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

    const validatedData = loginSchema.parse(loginData);

    if (!validatedData) {
      throw new BadRequestException(
        "Login validation unsuccessful",
        ErrorCode.VALIDATION_ERROR
      );
    }

    const user = await userService.fullUserDetailsByEmail(email);

    // Checks if user exists
    if (!user) {
      throw new BadRequestException(
        "Invalid email or password",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    // only email users can put in password so check if password exists
    if (
      user.account?.provider !== ProviderEnum.EMAIL ||
      user.password === null
    ) {
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

    // Check if user enabled 2FA
    if (user.userPreferences?.enable2FA) {
      return {
        user: null,
        mfaRequired: true,
        accessToken: "",
        refreshToken: "",
      };
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

    const { account, userPreferences, ...strippedUser } = user;

    return {
      strippedUser,
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
      role: session.userRole,
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

  // ========== RESEND VERIFICATION EMAIL =============
  public async resendEmailVerification(email: string) {
    const validatedData = emailSchema.parse(email);

    if (!validatedData) {
      throw new BadRequestException(
        "Resend email validation unsuccessful",
        ErrorCode.VALIDATION_ERROR
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException(
        "Verification email has been sent, if provided email exists."
      );
    }

    if (user.isEmailVerified) {
      throw new BadRequestException(
        "Verification email has been sent, if provided email exists."
      );
    }

    // Check mail rate limit. It's set to 2 emails per 3 or 10mins
    // const timeAgo = threeMinutesAgo()
    const timeAgo = tenMinutesAgo();
    const maxAttempts = 2;

    // Count how many times user in the past "time ago" created verification code emails
    const count = await prisma.verificationCode.count({
      where: {
        userId: user.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        createdAt: { gt: timeAgo },
      },
    });

    // If created over 2 in the last "time ago" then throw error
    if (count >= maxAttempts) {
      throw new HttpException(
        "Too many requests. Try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS
      );
    }

    // Creates verification code to verify user
    const userVerificationCode = await prisma.verificationCode.create({
      data: {
        user: { connect: { id: user.id } }, // Correct relational linking
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
        code: generateUniqueCode(),
      },
    });

    // Sending verification email link
    const verificationUrl = `${config.FRONTEND_BASE_URL}/verify-email?code=${userVerificationCode.code}`;
    await sendEmail({
      to: user.email,
      ...verifyEmailTemplate(verificationUrl),
    });

    return user;
  }

  // =============== FORGOT PASSWORD ==================
  public async forgotPassword(email: string) {
    const validatedData = emailSchema.parse(email);

    if (!validatedData) {
      throw new BadRequestException(
        "Forgot password validation unsuccessful",
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Get user from provided email
    const user = await prisma.user.findUnique({ where: { email } });

    // Return error if user does not exist
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If user has PROVIDER different than EMAIL
    if (!user.password) {
      throw new BadRequestException(
        "User was registered via provider",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    // Check mail rate limit. It's set to 2 emails per 3 or 10mins
    // const timeAgo = threeMinutesAgo()
    const timeAgo = tenMinutesAgo();
    const maxAttempts = 2;

    // Count how many times user in the past "time ago" created forgot password emails
    const count = await prisma.verificationCode.count({
      where: {
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        createdAt: { gt: timeAgo },
      },
    });

    // If created over 2 in the last "time ago" then throw error
    if (count >= maxAttempts) {
      throw new HttpException(
        "Too many requests. Try again later",
        HTTPSTATUS.TOO_MANY_REQUESTS,
        ErrorCode.AUTH_TOO_MANY_ATTEMPTS
      );
    }

    // Get one hour from one date
    const expiresAt = anHourFromNow();

    // Create verification code and push to db
    const validCode = await prisma.verificationCode.create({
      data: {
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        expiresAt: expiresAt,
        code: generateUniqueCode(),
      },
    });

    // Link to frontend
    const resetLink = `${config.FRONTEND_BASE_URL}/reset-password?code=${
      validCode.code
    }&exp=${expiresAt.getTime()}`;

    // Send email with link to reset password
    const { data, error } = await sendEmail({
      to: user.email,
      ...passwordResetTemplate(resetLink),
    });

    // Throw error if email could not be sent
    if (!data?.id) {
      throw new InternalServerException(`${error?.name} ${error?.message}`);
    }

    // Return link and email id
    return {
      url: resetLink,
      emailId: data.id,
    };
  }

  // ================ RESET PASSWORD ==================
  public async resetPassword({ password, verificationCode }: resetPasswordDto) {
    const validatedData = passwordSchema.parse(password);

    if (!validatedData) {
      throw new BadRequestException(
        "Reset password validation unsuccessful",
        ErrorCode.VALIDATION_ERROR
      );
    }

    // find code and check if it's code for password reset
    // and if it hasn't expired
    const validCode = await prisma.verificationCode.findUnique({
      where: {
        code: verificationCode,
        type: VerificationEnum.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
      },
    });

    // Throw error if invalid or expired code
    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code");
    }

    // Hash new password
    const hashedPassword = await hashValue(password);

    // Update user's password in db
    const updatedUser = await prisma.user.update({
      where: {
        id: validCode.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    if (!updatedUser) {
      throw new BadRequestException("Failed to reset password");
    }

    // Deleting the verification code after successful password reset
    await prisma.verificationCode.deleteMany({
      where: {
        userId: validCode.userId,
        type: VerificationEnum.PASSWORD_RESET,
      },
    });

    // Delete all sessions for the user after password reset
    await prisma.session.deleteMany({ where: { userId: updatedUser.id } });

    return { user: updatedUser };
  }

  // =================== LOGOUT =======================
  public async logout(sessionId: string) {
    return await prisma.session.delete({ where: { id: sessionId } });
  }

  // ================ GOOGLE OAUTH ====================
  public async loginOrCreateAccountService(data: {
    provider: string;
    displayName: string;
    providerId: string;
    email: string;
  }) {
    const { providerId, provider, displayName, email } = data;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Create id for user. It is not done via uuid cause it's too long
        let id;
        let sameId;
        do {
          id = crypto.randomBytes(5).toString("hex");
          sameId = await prisma.user.findUnique({ where: { id } });
        } while (sameId);

        // Makes sure no user with same name exists
        let isNameUnique = false;
        let username = displayName;
        do {
          const nameExists = await prisma.user.findFirst({
            where: { name: displayName },
          });
          if (!nameExists) {
            // If no user exists, the username is unique
            isNameUnique = true;
          } else {
            // Append a random number (1-9999) to the username
            const randomNumber = Math.floor(Math.random() * 10000); // Generate a number between 0-9999
            username = `${displayName}${randomNumber}`;
          }
        } while (!isNameUnique);

        // Create a new user
        const newUser = await prisma.user.create({
          data: {
            id,
            name: username,
            email,
            role: UserRole.USER, // Assign 'USER' role by default
            membership: Membership.REGULAR, //By default
            account: {
              create: {
                provider: provider,
                providerAccountId: providerId,
              }, // Defaults will be used
            },
            userPreferences: {
              create: {}, // Defaults will be used
            },
          },
        });
        return { user: newUser };
      }

      return { user };
    } catch (error) {
      throw error;
    }
  }
}
