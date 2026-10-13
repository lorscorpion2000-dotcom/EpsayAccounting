-- CreateEnum
CREATE TYPE "AccountDetailType" AS ENUM ('PARTNER', 'ITEM', 'PETTY_CASH');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "detailType" "AccountDetailType",
ADD COLUMN     "detail_id" UUID;
