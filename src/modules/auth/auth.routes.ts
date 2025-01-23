//Handles auth routing

import { Router } from "express";
import { authController } from "./auth.module";
import { authenticateJWT } from "@/common/strategies/jwt.strategy";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/verify/email", authController.verifyEmail);
authRoutes.post("/resend/email-verification", authController.resendEmailVerification);
authRoutes.post("/password/forgot", authController.forgotPassword);
authRoutes.post("/password/reset", authController.resetPassword);
authRoutes.post("/logout", authenticateJWT, authController.logout);

authRoutes.get("/refresh", authController.refreshToken);

export default authRoutes;
