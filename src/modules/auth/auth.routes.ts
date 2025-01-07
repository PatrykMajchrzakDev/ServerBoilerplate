//Handles auth routing

import { Router } from "express";
import { authController } from "./auth.module";

const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.get("/refresh", authController.refreshToken);
authRoutes.post("/verify/email", authController.verifyEmail);

export default authRoutes;
