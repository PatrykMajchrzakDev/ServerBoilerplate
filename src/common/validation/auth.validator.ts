//Handles validation for auth JSON objects

import { z } from "zod";

export const emailSchema = z.string().trim().email().min(1).max(255);
export const passwordSchema = z.string().trim().min(6).max(255);
export const verificationCodeSchema = z.string().trim().min(1).max(25);

// ==================================================
// =========== ZOD VALIDATION SCHEMAS ===============
// ==================================================

// Register schema
export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Password does not match",
    path: ["confirmPassword"],
  });

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userAgent: z.string().optional(),
});

// Verification email schema
export const verificationEmailSchema = z.object({
  code: verificationCodeSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});
