import { PrismaClient } from "@prisma/client";
import { stripUserToFrontend } from "@/utils/destructureResponse";

const prisma = new PrismaClient();

export class UserService {
  public async findUserById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    return user ? stripUserToFrontend(user) : null;
  }
}
