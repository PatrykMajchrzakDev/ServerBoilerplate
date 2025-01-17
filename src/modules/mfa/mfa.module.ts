// This file just calls session service and controller

import { MfaController } from "@/modules/mfa/mfa.controller";
import { MfaService } from "@/modules/mfa/mfa.service";

const mfaService = new MfaService();
const mfaController = new MfaController(mfaService);

export { mfaService, mfaController };
