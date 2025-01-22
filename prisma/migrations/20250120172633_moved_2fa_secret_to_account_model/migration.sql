/*
  Warnings:

  - You are about to drop the column `twoFactorSecret` on the `UserPreferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "twoFactorSecret";
