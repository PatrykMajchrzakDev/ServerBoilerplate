//Purpose of this file is to asign values to object properties and set some default values if needed

import { getEnv } from "@/utils/get-env";

const appConfig = () => ({
  // SERVER
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "3000"),

  // URLS
  BACKEND_BASE_URL: getEnv("BACKEND_BASE_URL", "http://localhost:3000"),
  FRONTEND_BASE_URL: getEnv("FRONTEND_BASE_URL", "http://localhost:5173"),
  BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
  DATABASE_URL: getEnv("DATABASE_URL"),

  // JWT
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "1h"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),

  // SERVICES
  RESEND_EMAIL_API_KEY: getEnv("RESEND_EMAIL_API_KEY"),
  MAILER_SENDER: getEnv("MAILER_SENDER"),
});

export const config = appConfig();
