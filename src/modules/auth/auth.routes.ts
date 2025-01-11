//Handles auth routing

import { Router } from "express";
import { authController } from "./auth.module";
import { authnticateJWT } from "@/common/strategies/jwt.strategy";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/verify/email", authController.verifyEmail);
authRoutes.post("/password/forgot", authController.forgotPassword);
authRoutes.post("/password/reset", authController.resetPassword);
authRoutes.post("/logout", authnticateJWT, authController.logout);

authRoutes.get("/refresh", authController.refreshToken);

export default authRoutes;
