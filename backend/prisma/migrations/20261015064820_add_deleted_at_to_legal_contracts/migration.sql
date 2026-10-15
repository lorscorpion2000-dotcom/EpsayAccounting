-- AlterTable
ALTER TABLE "LegalContract" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "LegalContractParty" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateIndex
CREATE INDEX "LegalContract_deleted_at_idx" ON "LegalContract"("deleted_at");
