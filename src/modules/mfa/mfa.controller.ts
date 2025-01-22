import { asyncHandler } from "@/middleware/asyncHandler";
import { MfaService } from "@/modules/mfa/mfa.service";
import { Request, Response } from "express";
import { HTTPSTATUS } from "@/config/http.config";
import {
  verifyMFALoginSchema,
  verifyMFASchema,
} from "@/common/validation/mfa.validator";
import { setAuthenticationCookies } from "@/utils/cookie";
import { stripUserToFrontend } from "@/utils/destructureResponse";

export class MfaController {
  private mfaService: MfaService;

  constructor(mfaService: MfaService) {
    this.mfaService = mfaService;
  }

  // ============== GENERATES QR CODE ===============
  // ============== WITH USER SECRET ================
  public generateMFASetup = asyncHandler(
    async (req: Request, res: Response) => {
      // Get's user's secret, qrImg and message upon successful generation
      const { secret, qrImageUrl, message } =
        await this.mfaService.generateMFASetup(req);

      // Return all of them to FE
      return res.status(HTTPSTATUS.OK).json({
        message,
        secret,
        qrImageUrl,
      });
    }
  );

  // =============== VERIFY MFA SETUP ===============
  public verifyMFASetup = asyncHandler(async (req: Request, res: Response) => {
    // Get code and secretKey from body and verify schema via zod
    const { code, secretKey } = verifyMFASchema.parse({ ...req.body });

    // Run the mfa setup service
    const { userPreferences, message } = await this.mfaService.verifyMFASetup(
      req,
      code,
      secretKey
    );

    // Return message with updated user preferences if everything went OK
    return res.status(HTTPSTATUS.OK).json({
      message: message,
      userPreferences: userPreferences,
    });
  });

  // =============== REVOKE MFA SETUP ===============
  public revokeMFASetup = asyncHandler(async (req: Request, res: Response) => {
    // Pass req to revoke user MFA
    const { message, userPreferences } = await this.mfaService.revokeMFASetup(
      req
    );

    // Return if everything went OK
    return res.status(HTTPSTATUS.OK).json({
      message,
      userPreferences,
    });
  });

  // =============== VERIFY MFA LOGIN ===============
  public verifyMFALogin = asyncHandler(async (req: Request, res: Response) => {
    // Get code, email and userAgent from body and verify via zod
    const { code, email, userAgent } = verifyMFALoginSchema.parse({
      ...req.body,
      userAgent: req.headers["user-agent"],
    });

    // Pass above destructured vars as args and run MFA login service
    const { user, accessToken, refreshToken } =
      await this.mfaService.verifyMFALogin(code, email, userAgent);

    // Remove unnecessary user props
    const { account, userPreferences, ...strippedUser } = user;

    // Return message and user to frontend
    return setAuthenticationCookies({ res, accessToken, refreshToken })
      .status(HTTPSTATUS.OK)
      .json({
        message: "Verified and login successful.",
        userAgent,
        user: stripUserToFrontend(strippedUser),
      });
  });
}
