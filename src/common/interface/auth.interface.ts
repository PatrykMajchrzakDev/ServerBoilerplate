import { UserRole } from "@/common/enums/userRoleEnum";

// ========================================================
// ================= LOGIN RELATED STUFF ==================
// ========================================================

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userAgent?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  userAgent?: string;
}

// ========================================================
// ================== USER RELATED STUFF ==================
// ========================================================
// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   password: string;
//   role: UserRole;
//   isEmailVerified: boolean;
//   enable2FA: boolean;
//   emailNotification: boolean;
//   twoFactorSecret?: string;
//   createdAt: Date;
//   updatedAt: Date;
//   provider: string;
//   googleId?: string;
//   sessions: UserSession[];
//   verificationCodes: UserVerificationCode[];
// }

// export interface UserSession {
//   id: string;
//   userId: string;
//   userAgent?: string;
//   createdAt: Date;
//   expiredAt: Date;
// }

// export interface UserVerificationCode {
//   id: string;
//   userId: string;
//   code: string;
//   type: string;
//   createdAt: Date;
//   expiresAt: Date;
// }
