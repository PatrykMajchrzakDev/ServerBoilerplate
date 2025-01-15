import { HTTPSTATUS } from "@/config/http.config";
import { asyncHandler } from "@/middleware/asyncHandler";
import { SessionService } from "@/modules/session/session.service";
import { NotFoundException, UnauthorizedException } from "@/utils/CatchError";
import { Request, Response } from "express";
import { z } from "zod";

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }

  // // ========== GET ALL SESSIONS ============
  public getAllSessions = asyncHandler(async (req: Request, res: Response) => {
    // Get userId and sessionId from request object
    const userId = req.user?.id;
    if (!userId) {
      throw new NotFoundException("Could not find user sessions");
    }
    const sessionId = req.sessionId;

    // Fetch all active sessions for the user
    const { sessions } = await this.sessionService.getAllSessions(userId);

    // Map through sessions and add an `isCurrent` flag if the session matches the current session ID
    const modifySessions = sessions.map((session) => ({
      ...session, // Spread the session data
      ...(session.id === sessionId && { isCurrent: true }), // Add `isCurrent` flag conditionally
    }));
    return res.status(HTTPSTATUS.OK).json({
      message: "Retrieved all sessions successfully",
      sessions: modifySessions,
    });
  });

  // =============== GET SESSION ===============
  public getSession = asyncHandler(async (req: Request, res: Response) => {
    // Session ID from req body
    const sessionId = req?.sessionId;

    // Error if no session id
    if (!sessionId) {
      throw new NotFoundException("Session ID not found. Please login first");
    }

    // Return user object
    const { user } = await this.sessionService.getSessionById(sessionId);
    return res.status(HTTPSTATUS.OK).json({
      message: "Session retrieved successfully",
      user,
    });
  });

  public deleteSession = asyncHandler(async (req: Request, res: Response) => {
    // Get from req body
    const sessionId = z.string().parse(req.params.id);
    const userId = req.user?.id;

    // Throw error if one of them is missing
    if (!sessionId || !userId) {
      throw new NotFoundException("Session ID or userID not found");
    }

    // Pass sessionId and userId to delete session service
    await this.sessionService.deleteSession(sessionId, userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Session removed successfully",
    });
  });
}
