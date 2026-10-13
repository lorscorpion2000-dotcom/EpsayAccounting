-- CreateEnum
CREATE TYPE "OverheadAllocationMethod" AS ENUM ('PERCENT_CONTRACT', 'PERCENT_REVENUE', 'MANUAL');

-- CreateEnum
CREATE TYPE "OverheadAllocationStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "overhead_allocations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "period_month" VARCHAR(7) NOT NULL,
    "method" "OverheadAllocationMethod" NOT NULL DEFAULT 'MANUAL',
    "total_amount" DECIMAL(20,2) NOT NULL,
    "source_account_id" UUID,
    "dest_account_id" UUID,
    "description" VARCHAR(500),
    "status" "OverheadAllocationStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" UUID,
    "posted_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overhead_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overhead_allocation_items" (
    "id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "percent" DECIMAL(7,4) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overhead_allocation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "overhead_allocations_code_key" ON "overhead_allocations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "overhead_allocations_journal_entry_id_key" ON "overhead_allocations"("journal_entry_id");

-- CreateIndex
CREATE INDEX "overhead_allocations_status_idx" ON "overhead_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "overhead_allocations_fiscal_year_id_period_month_key" ON "overhead_allocations"("fiscal_year_id", "period_month");

-- CreateIndex
CREATE INDEX "overhead_allocation_items_allocation_id_idx" ON "overhead_allocation_items"("allocation_id");

-- CreateIndex
CREATE INDEX "overhead_allocation_items_project_id_idx" ON "overhead_allocation_items"("project_id");

-- AddForeignKey
ALTER TABLE "overhead_allocations" ADD CONSTRAINT "overhead_allocations_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overhead_allocations" ADD CONSTRAINT "overhead_allocations_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overhead_allocation_items" ADD CONSTRAINT "overhead_allocation_items_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "overhead_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overhead_allocation_items" ADD CONSTRAINT "overhead_allocation_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
