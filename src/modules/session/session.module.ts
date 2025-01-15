// This file just calls session service and controller

import { SessionController } from "@/modules/session/session.controller";
import { SessionService } from "@/modules/session/session.service";

const sessionService = new SessionService();
const sessionController = new SessionController(sessionService);

export { sessionController, sessionService };
