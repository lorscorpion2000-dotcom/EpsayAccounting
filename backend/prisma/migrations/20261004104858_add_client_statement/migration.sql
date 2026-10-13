-- CreateEnum
CREATE TYPE "ClientStatementCategory" AS ENUM ('MATERIAL', 'LABOR', 'MISC', 'TRANSPORT', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "ClientStatementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "client_statements" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "contract_id" UUID,
    "statement_number" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "coefficient" DECIMAL(7,4) NOT NULL DEFAULT 1.07,
    "contractor_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "prepayment_deduction_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "subtotal_material" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "subtotal_labor" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "subtotal_misc" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "subtotal_transport" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "subtotal_equipment" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_before_coefficient" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_after_coefficient" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "contractor_share_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "prepayment_deduction_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "status" "ClientStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "journal_entry_id" UUID,
    "description" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_statement_items" (
    "id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "category" "ClientStatementCategory" NOT NULL,
    "row_number" INTEGER NOT NULL,
    "price_list_code" VARCHAR(64),
    "description" VARCHAR(500) NOT NULL,
    "unit" VARCHAR(32),
    "unit_price" DECIMAL(20,2) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL DEFAULT 1,
    "total_price" DECIMAL(24,2) NOT NULL,
    "item_date" DATE,
    "wbs_item_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_statements_code_key" ON "client_statements"("code");

-- CreateIndex
CREATE INDEX "client_statements_project_id_idx" ON "client_statements"("project_id");

-- CreateIndex
CREATE INDEX "client_statements_status_idx" ON "client_statements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "client_statements_project_id_statement_number_key" ON "client_statements"("project_id", "statement_number");

-- CreateIndex
CREATE INDEX "client_statement_items_statement_id_idx" ON "client_statement_items"("statement_id");

-- CreateIndex
CREATE INDEX "client_statement_items_category_idx" ON "client_statement_items"("category");

-- AddForeignKey
ALTER TABLE "client_statements" ADD CONSTRAINT "client_statements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statements" ADD CONSTRAINT "client_statements_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statement_items" ADD CONSTRAINT "client_statement_items_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "client_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statement_items" ADD CONSTRAINT "client_statement_items_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
