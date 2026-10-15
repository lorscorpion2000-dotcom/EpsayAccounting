-- AlterTable
ALTER TABLE "inventory_counts" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletedReason" TEXT;

-- AlterTable
ALTER TABLE "warehouse_transfers" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletedReason" TEXT;

-- CreateIndex
CREATE INDEX "inventory_counts_deletedAt_idx" ON "inventory_counts"("deletedAt");

-- CreateIndex
CREATE INDEX "inventory_counts_deletedBy_idx" ON "inventory_counts"("deletedBy");

-- CreateIndex
CREATE INDEX "warehouse_transfers_deletedAt_idx" ON "warehouse_transfers"("deletedAt");

-- CreateIndex
CREATE INDEX "warehouse_transfers_deletedBy_idx" ON "warehouse_transfers"("deletedBy");
