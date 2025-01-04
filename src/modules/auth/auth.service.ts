import { ErrorCode } from "@/common/enums/errorCodeEnum";
import { VerificationEnum } from "@/common/enums/verificationCodeEnum";
import { RegisterDto } from "@/common/interface/auth.interface";
import { BadRequestException } from "@/utils/CatchError";
import { fortyFiveMinutesFromNow } from "@/utils/date-time";
import { generateUniqueCode } from "@/utils/uuid";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashValue } from "@/utils/bcrypt";

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
}
