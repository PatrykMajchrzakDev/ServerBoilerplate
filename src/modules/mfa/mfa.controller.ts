import { asyncHandler } from "@/middleware/asyncHandler";
import { MfaService } from "./mfa.service";
import { Request, Response, response } from "express";
import { HTTPSTATUS } from "@/config/http.config";

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
}
