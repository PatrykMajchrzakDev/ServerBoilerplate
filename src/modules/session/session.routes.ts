import { Router } from "express";
import { authenticateJWT } from "@/common/strategies/jwt.strategy";
import { sessionController } from "./session.module";

const sessionRoutes = Router();

sessionRoutes.get("/all", authenticateJWT, sessionController.getAllSessions);
sessionRoutes.get("/", authenticateJWT, sessionController.getSession);
sessionRoutes.delete("/:id", authenticateJWT, sessionController.deleteSession);

export default sessionRoutes;
