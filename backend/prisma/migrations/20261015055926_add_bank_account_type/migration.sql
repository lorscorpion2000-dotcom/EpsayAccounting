-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('BANK', 'CASH_REGISTER');

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "type" "BankAccountType" NOT NULL DEFAULT 'BANK';
