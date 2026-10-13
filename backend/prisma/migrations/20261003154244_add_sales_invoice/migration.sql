-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesReceiptMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "invoice_number" VARCHAR(64) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "customer_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "project_id" UUID,
    "partner_id" UUID,
    "subtotal" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 9,
    "tax_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "received_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" VARCHAR(500),
    "journal_entry_id" UUID,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit" VARCHAR(32),
    "unit_price" DECIMAL(20,2) NOT NULL,
    "total_price" DECIMAL(20,2) NOT NULL,
    "account_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_receipts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_id" UUID,
    "method" "SalesReceiptMethod" NOT NULL,
    "bank_account_id" UUID,
    "amount" DECIMAL(20,2) NOT NULL,
    "receipt_date" DATE NOT NULL,
    "reference" VARCHAR(128),
    "notes" VARCHAR(500),
    "journal_entry_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_code_key" ON "sales_invoices"("code");

-- CreateIndex
CREATE INDEX "sales_invoices_customer_id_idx" ON "sales_invoices"("customer_id");

-- CreateIndex
CREATE INDEX "sales_invoices_contract_id_idx" ON "sales_invoices"("contract_id");

-- CreateIndex
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices"("status");

-- CreateIndex
CREATE INDEX "sales_invoice_items_invoice_id_idx" ON "sales_invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_receipts_code_key" ON "sales_receipts"("code");

-- CreateIndex
CREATE INDEX "sales_receipts_customer_id_idx" ON "sales_receipts"("customer_id");

-- CreateIndex
CREATE INDEX "sales_receipts_invoice_id_idx" ON "sales_receipts"("invoice_id");

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "SalesCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "SalesContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_receipts" ADD CONSTRAINT "sales_receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "SalesCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_receipts" ADD CONSTRAINT "sales_receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_receipts" ADD CONSTRAINT "sales_receipts_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_receipts" ADD CONSTRAINT "sales_receipts_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
