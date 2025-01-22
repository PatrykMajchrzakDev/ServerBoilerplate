import { authenticateJWT } from "@/common/strategies/jwt.strategy";
import { Router } from "express";
import { mfaController } from "@/modules/mfa/mfa.module";

const mfaRoutes = Router();

mfaRoutes.get("/setup", authenticateJWT, mfaController.generateMFASetup);
mfaRoutes.post("/verify", authenticateJWT, mfaController.verifyMFASetup);
mfaRoutes.put("/revoke", authenticateJWT, mfaController.revokeMFASetup);

mfaRoutes.post("/verify-login", mfaController.verifyMFALogin);

export default mfaRoutes;
