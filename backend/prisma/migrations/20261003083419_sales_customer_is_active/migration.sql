-- AlterTable
ALTER TABLE "SalesCustomer" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "detail_id" SET DATA TYPE VARCHAR(64);
