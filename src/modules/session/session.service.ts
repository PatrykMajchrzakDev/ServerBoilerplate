import { NotFoundException } from "@/utils/CatchError";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class SessionService {
  // ============= GET ALL USER SESSIONS ==============
  public async getAllSessions(userId: string) {
    // Gets all user active sessions
    const sessions = await prisma.session.findMany({
      where: { userId: userId, expiredAt: { gt: new Date() } },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        createdAt: true,
        expiredAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { sessions };
  }

  // ============== GET SINGLE SESSION ================
  public async getSessionById(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        user: {
          select: {
            // User fields (all except password)
            id: true,
            name: true,
            email: true,
            role: true,
            membership: true,
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true,

            // Account relation (all except twoFactorSecret, id and createdAt)
            account: {
              select: {
                userId: true,
                provider: true,
                providerAccountId: true,
              },
            },

            // UserPreferences relation (all fields but id)
            userPreferences: {
              select: {
                userId: true,
                enable2FA: true,
                emailNotification: true,
              },
            },
          },
        },
        // Session related fields
        userId: true,
        userAgent: true,
        createdAt: true,
        userRole: true,
      },
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    return {
      user: {
        ...session.user,
        // Explicitly exclude password even if not selected
        account: {
          ...session.user.account,
          // Explicitly exclude twoFactorSecret even if not selected
          twoFactorSecret: undefined,
        },
      },
    };
  }

  // ================ DELETE SESSION ==================
  public async deleteSession(sessionId: string, userId: string) {
    // There is always gonna be one but the way Prisma handles .delete()
    // causes issues as it returns error rather than null
    // there won't be performance issues becouse of Prisma @indexes
    const deletedSession = await prisma.session.deleteMany({
      where: { id: sessionId, userId: userId },
    });

    if (deletedSession.count === 0) {
      throw new NotFoundException("Session not found");
    }
    return;
  }
}
