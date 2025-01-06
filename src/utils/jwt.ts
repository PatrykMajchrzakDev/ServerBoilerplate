import { config } from "@/config/app.config";
import { Session, User } from "@prisma/client";
import { SignOptions, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

// Define the structure for an access token payload containing userId and sessionId.
export type AccessTokenPayload = {
  userId: User["id"];
  sessionId: Session["id"];
};

// Define the structure for a refresh token payload containing only sessionId.
export type RefreshTokenPayload = {
  sessionId: Session["id"];
};

// Define a type that combines JWT signing options and a secret key.
type SignOptionsAndSecret = SignOptions & {
  secret: string;
};

// Default JWT signing options applied to both access and refresh tokens.
// The audience specifies that the token is for a user.
const defaults: SignOptions = {
  audience: ["user"],
};

// Configuration for signing an access token.
// `expiresIn` and `secret` values are fetched from app.config.ts
export const accessTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: config.JWT_EXPIRES_IN,
  secret: config.JWT_SECRET,
};

// Configuration for signing a refresh token with a different secret and expiry time.
export const refreshTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  secret: config.JWT_REFRESH_SECRET,
};

/**
 * Generates a signed JWT token.
 *
 * param payload - The data to include in the token (AccessPayload or RefreshTokenPayload).
 * param options - Optional signing options (e.g., secret key and expiry).
 */
export const signJwtToken = (
  payload: AccessTokenPayload | RefreshTokenPayload, // Token data (userId and sessionId)
  options?: SignOptionsAndSecret
) => {
  // Destructure the secret key and options; fallback to accessTokenSignOptions if not provided
  const { secret, ...opts } = options || accessTokenSignOptions;
  // Create and return the signed JWT token using payload, secret, and options
  return jwt.sign(payload, secret, { ...defaults, ...opts });
};

/**
 * Verifies a given JWT token and extracts its payload if valid.
 *
 * param token - The JWT token to verify.
 * param options - Optional verification options (e.g., secret key).
 */
export const verifyJwtToken = <TPayload extends object = AccessTokenPayload>(
  token: string,
  options?: VerifyOptions & { secret: string }
) => {
  try {
    // Extract secret and options, defaulting to the standard JWT_SECRET if not provided
    const { secret = config.JWT_SECRET, ...opts } = options || {};

    // Attempt to verify the token using the provided secret and options
    const payload = jwt.verify(token, secret, {
      ...defaults,
      ...opts,
    }) as TPayload;

    // Return the decoded payload if verification is successful
    return { payload };

    // Catch and return error message if verification fails
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
};
