//Handles auth routing

import { Router } from "express";
import { authController } from "./auth.module";
import { authenticateJWT } from "@/common/strategies/jwt.strategy";
import { config } from "@/config/app.config";
import passport from "passport";

const authRoutes = Router();

const failedUrl = `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure`;

// ================= EMAIL ROUTES ==================
authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/verify/email", authController.verifyEmail);
authRoutes.post(
  "/resend/email-verification",
  authController.resendEmailVerification
);
authRoutes.post("/password/forgot", authController.forgotPassword);
authRoutes.post("/password/reset", authController.resetPassword);
authRoutes.post("/logout", authenticateJWT, authController.logout);

authRoutes.get("/refresh", authController.refreshToken);

// ================= GOOGLE ROUTES ==================

// Login via Google
authRoutes.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google redirect to me
authRoutes.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: failedUrl,
  }),
  authController.googleLoginCallback
);

export default authRoutes;
