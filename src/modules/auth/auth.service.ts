import { ErrorCode } from "@/common/enums/errorCodeEnum";
import { VerificationEnum } from "@/common/enums/verificationCodeEnum";
import { LoginDto, RegisterDto } from "@/common/interface/auth.interface";
import { BadRequestException } from "@/utils/CatchError";
import { fortyFiveMinutesFromNow, thirtyDaysFromNow } from "@/utils/date-time";
import { generateUniqueCode } from "@/utils/uuid";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { hashValue, compareValue } from "@/utils/bcrypt";
import { config } from "@/config/app.config";

const prisma = new PrismaClient();

// THIS ENTIRE AuthService CLASS HOLDS ALL METHODS USED FOR USER AUTHENTICATION

export class AuthService {
  // ================ REGISTER ================
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

    // TBD
    // Sending verification email link

    return newUser;
  }
  // ================ LOGIN ================
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
        "This email is linked with 3rd Party Provider e.g. Google or Miscrosoft",
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

    // Creates new session for logged in user (lasts 30 days)
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent,
        expiredAt: thirtyDaysFromNow(),
      },
    });

    // Creates new access token for user
    const accessToken = jwt.sign(
      {
        userId: user.id,
        sessionId: session.id,
      },
      config.JWT_SECRET,
      {
        audience: ["user"],
        expiresIn: config.JWT_EXPIRES_IN,
      }
    );

    // Refreshes existing user token if old exists
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId: session.id,
      },
      config.JWT_REFRESH_SECRET,
      {
        audience: ["user"],
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      }
    );
    return {
      user,
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }
}
