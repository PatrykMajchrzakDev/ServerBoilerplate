import { authenticateJWT } from "@/common/strategies/jwt.strategy";
import { Router } from "express";
import { mfaController } from "@/modules/mfa/mfa.module";

const mfaRoutes = Router();

mfaRoutes.get("/setup", authenticateJWT, mfaController.generateMFASetup);

export default mfaRoutes;
