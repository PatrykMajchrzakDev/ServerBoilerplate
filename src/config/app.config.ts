//Purpose of this file is to asign values to object properties and set some default values if needed

import { getEnv } from "@/utils/get-env";

const appConfig = () => ({
  // SERVER
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "3000"),
  DOMAIN_NAME: getEnv("DOMAIN_NAME"),
  SESSION_SECRET: getEnv("SESSION_SECRET"),

  // URLS
  BACKEND_BASE_URL: getEnv("BACKEND_BASE_URL", "http://localhost:3000"),
  FRONTEND_BASE_URL: getEnv("FRONTEND_BASE_URL", "http://localhost:5173"),
  BACKEND_API_PATH: getEnv("BACKEND_API_PATH", "/api/v1"),
  DATABASE_URL: getEnv("DATABASE_URL"),

  // JWT
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "1h"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),

  // GOOGLE
  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL"),
  FRONTEND_GOOGLE_CALLBACK_URL: getEnv("FRONTEND_GOOGLE_CALLBACK_URL"),

  // SERVICES
  RESEND_EMAIL_API_KEY: getEnv("RESEND_EMAIL_API_KEY"),
  MAILER_SENDER: getEnv("MAILER_SENDER"),
});

export const config = appConfig();
