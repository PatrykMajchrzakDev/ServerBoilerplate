// HANDLES AUTH RELATED FUNCTIONALITY

import { asyncHandler } from "@/middleware/asyncHandler";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { HTTPSTATUS } from "@/config/http.config";
import { registerSchema } from "@/common/validation/auth.validator";
import { stripUserToFrontend } from "@/utils/destructureResponse";

// Parent class invoking auth
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // Validates JSON, runs REGISTER method from ./auth.service.ts
  // and returns message with object if successfull.
  public register = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const body = registerSchema.parse({
        ...req.body,
      });
      const user = await this.authService.register(body);
      return res.status(HTTPSTATUS.CREATED).json({
        message: "User registered successfully.",
        data: stripUserToFrontend(user),
      });
    }
  );
}
