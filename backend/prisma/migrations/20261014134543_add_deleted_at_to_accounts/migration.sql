-- AlterTable
ALTER TABLE "account_mappings" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateIndex
CREATE INDEX "account_mappings_deleted_at_idx" ON "account_mappings"("deleted_at");

-- CreateIndex
CREATE INDEX "accounts_deleted_at_idx" ON "accounts"("deleted_at");
