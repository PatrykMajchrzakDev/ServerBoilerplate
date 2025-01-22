import { Prisma, PrismaClient } from "@prisma/client";
import { stripUserToFrontend } from "@/utils/destructureResponse";

const prisma = new PrismaClient();

type ExtendedUser = Prisma.UserGetPayload<{
  include: { account: true; userPreferences: true };
}>;

export class UserService {
  public async findUserById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    return user ? stripUserToFrontend(user) : null;
  }

  public async fullUserDetailsByID(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true, userPreferences: true },
    });
    return user as ExtendedUser;
  }

  public async fullUserDetailsByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: { account: true, userPreferences: true },
    });
    return user as ExtendedUser;
  }
}
