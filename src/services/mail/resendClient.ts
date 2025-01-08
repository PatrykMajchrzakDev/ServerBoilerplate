import { config } from "@/config/app.config";
import { Resend } from "resend";

export const resend = new Resend(config.RESEND_EMAIL_API_KEY);
