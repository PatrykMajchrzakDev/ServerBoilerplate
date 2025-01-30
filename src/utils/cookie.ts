import { config } from "@/config/app.config";
import { CookieOptions, Response } from "express";
import { calculateExpirationDate } from "./date-time";

type CookiePayloadType = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const REFRESH_PATH = `${config.BACKEND_API_PATH}/auth/refresh`;

// Cookie options when site is in PRODUCTION state
const defaults: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production" ? true : false,
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
};

// Fn to calculate when refresh token expires
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT_REFRESH_EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);

  return { ...defaults, expires, path: REFRESH_PATH };
};

// Fn to calculate when access token expires
export const getAccessTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT_EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);

  return { ...defaults, expires, path: "/" };
};

// Fn to sets cookies
export const setAuthenticationCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookiePayloadType): Response =>
  res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

// Fn to clear exisiting cookies
export const clearAuthenticationCookies = (res: Response): Response =>
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken", { path: REFRESH_PATH });
