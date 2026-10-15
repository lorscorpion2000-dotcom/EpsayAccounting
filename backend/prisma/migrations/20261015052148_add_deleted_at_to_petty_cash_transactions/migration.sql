-- AlterTable
ALTER TABLE "petty_cash_transactions" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;
