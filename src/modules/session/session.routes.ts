import { Router } from "express";
import { sessionController } from "./session.module";

const sessionRoutes = Router();

sessionRoutes.get("/all", sessionController.getAllSessions);
sessionRoutes.get("/single", sessionController.getSession);
sessionRoutes.delete("/:id", sessionController.deleteSession);

export default sessionRoutes;
