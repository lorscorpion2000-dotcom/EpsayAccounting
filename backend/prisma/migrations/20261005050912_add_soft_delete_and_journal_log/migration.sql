-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "material_price_diffs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "partner_capital_accounts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "petty_cash_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "rfqs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "sales_receipts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateTable
CREATE TABLE "journal_deletion_logs" (
    "id" TEXT NOT NULL,
    "journal_id" TEXT NOT NULL,
    "journal_no" TEXT,
    "journal_date" DATE,
    "fiscal_year_id" TEXT,
    "status" TEXT,
    "description" TEXT,
    "total_debit" DECIMAL(18,2),
    "total_credit" DECIMAL(18,2),
    "lines_snapshot" JSONB,
    "journal_snapshot" JSONB,
    "reason" TEXT,
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "journal_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_deletion_logs_journal_id_idx" ON "journal_deletion_logs"("journal_id");

-- CreateIndex
CREATE INDEX "journal_deletion_logs_deleted_at_idx" ON "journal_deletion_logs"("deleted_at");

-- CreateIndex
CREATE INDEX "journal_deletion_logs_deleted_by_idx" ON "journal_deletion_logs"("deleted_by");
