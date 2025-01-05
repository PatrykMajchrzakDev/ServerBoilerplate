// HANDLES AUTH RELATED FUNCTIONALITY

import { asyncHandler } from "@/middleware/asyncHandler";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { HTTPSTATUS } from "@/config/http.config";
import {
  loginSchema,
  registerSchema,
} from "@/common/validation/auth.validator";
import { stripUserToFrontend } from "@/utils/destructureResponse";
import { setAuthenticationCookies } from "@/utils/cookie";

// Parent class invoking auth
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // Validates JSON, runs REGISTER method from ./auth.service.ts
  // and returns message with object if successfull.

  // ============== REGISTER ===============
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

  // ================ LOGIN ================
  public login = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const userAgent = req.headers["user-agent"];
      const body = loginSchema.parse({
        ...req.body,
        userAgent,
      });

      // Destructure object from auth.service.ts
      const { user, accessToken, refreshToken, mfaRequired } =
        await this.authService.login(body);

      // Set cookies
      return setAuthenticationCookies({ res, accessToken, refreshToken })
        .status(HTTPSTATUS.OK)
        .json({
          message: "User logged in successfully.",
          user: stripUserToFrontend(user),
          mfaRequired,
        });
    }
  );
}
