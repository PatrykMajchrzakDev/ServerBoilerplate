//Handles validation for auth JSON objects

import { z } from "zod";

export const emailSchema = z.string().trim().email().min(1).max(255);

// Name schema
export const userNameSchema = z
  .string()
  .trim()
  .min(3, "Minimum length of 3")
  .max(30, "Maximum length of 30");

// Password should be min 8, have lowercase, uppercase letters and numbers
export const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password should have at least 8 characters")
  .max(60, "Password should not be longer than 60 characters")
  .refine(
    (val) => /[a-z]/.test(val ?? ""),
    "Password should include lowercase letters"
  )
  .refine(
    (val) => /[A-Z]/.test(val ?? ""),
    "Password should include uppercase letters"
  )
  .refine((val) => /[0-9]/.test(val ?? ""), "Password should include numbers");
export const verificationCodeSchema = z.string().trim().min(1).max(25);

// ==================================================
// =========== ZOD VALIDATION SCHEMAS ===============
// ==================================================

// Register schema
export const registerSchema = z
  .object({
    name: userNameSchema,
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
