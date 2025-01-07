// HANDLES AUTH RELATED FUNCTIONALITY

import { asyncHandler } from "@/middleware/asyncHandler";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { HTTPSTATUS } from "@/config/http.config";
import {
  loginSchema,
  registerSchema,
  verificationEmailSchema,
} from "@/common/validation/auth.validator";
import { stripUserToFrontend } from "@/utils/destructureResponse";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthenticationCookies,
} from "@/utils/cookie";
import { UnauthorizedException } from "@/utils/CatchError";

// Parent class invoking auth
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // Validates JSON, runs REGISTER method from ./auth.service.ts
  // and returns message with object if successful.

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

  // =========== REFRESH TOKEN =============
  public refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      // gets variable from cookies
      const refreshToken = req.cookies.refreshToken as string | undefined;
      if (!refreshToken) {
        throw new UnauthorizedException("Missing refresh token");
      }

      // Destructure from given arguments
      const { accessToken, newRefreshToken } =
        await this.authService.refreshToken(refreshToken);

      // Sets new refresh token
      if (newRefreshToken) {
        res.cookie(
          "refreshToken",
          newRefreshToken,
          getRefreshTokenCookieOptions()
        );
      }

      // Return access token
      return res
        .status(HTTPSTATUS.OK)
        .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
        .json({ message: "Refresh access token successfully" });
    }
  );

  // ============ VERIFY EMAIL =============
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code } = verificationEmailSchema.parse(req.body);

      // Runs verifyEmail fn with provided arg
      await this.authService.verifyEmail(code);

      // Returns status and message when successfully verified
      return res.status(HTTPSTATUS.OK).json({
        message: "Email verified successfully",
      });
    }
  );
}
