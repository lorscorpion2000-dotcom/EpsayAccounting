/*
  Warnings:

  - The `unit` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unit` column on the `price_list_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unit` column on the `wbs_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[fixed_asset_id]` on the table `purchase_invoice_items` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `unit` on the `purchase_invoice_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unit` on the `purchase_order_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unit` on the `purchase_request_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DailyReportSectionType" AS ENUM ('HEADER', 'PROGRESS', 'WORKERS', 'EQUIPMENTS', 'MATERIALS', 'ENTRY_EXIT', 'REQUESTS', 'EVENTS', 'ATTACHMENTS');

-- CreateEnum
CREATE TYPE "DailyReportSectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FORWARDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ForwardingTarget" AS ENUM ('WAREHOUSE_RECEIPT', 'WAREHOUSE_ISSUE', 'PROCUREMENT_PR', 'PETTY_CASH', 'PAYROLL_ATTENDANCE', 'EQUIPMENT_LOG', 'PROGRESS_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkerStatementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "advance_requests" DROP CONSTRAINT "advance_requests_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_project_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_reports" DROP CONSTRAINT "daily_reports_project_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_work_logs" DROP CONSTRAINT "daily_work_logs_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_profiles" DROP CONSTRAINT "employee_profiles_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "partner_capital_accounts" DROP CONSTRAINT "partner_capital_accounts_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "permits" DROP CONSTRAINT "permits_project_id_fkey";

-- DropForeignKey
ALTER TABLE "petty_cash_requests" DROP CONSTRAINT "petty_cash_requests_account_id_fkey";

-- DropForeignKey
ALTER TABLE "petty_cash_transactions" DROP CONSTRAINT "petty_cash_transactions_account_id_fkey";

-- DropForeignKey
ALTER TABLE "phase_checklists" DROP CONSTRAINT "phase_checklists_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_budgets" DROP CONSTRAINT "project_budgets_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_partner_shares" DROP CONSTRAINT "project_partner_shares_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "project_partner_shares" DROP CONSTRAINT "project_partner_shares_project_id_fkey";

-- DropForeignKey
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_pr_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_item_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "technical_documents" DROP CONSTRAINT "technical_documents_project_id_fkey";

-- DropForeignKey
ALTER TABLE "wbs_items" DROP CONSTRAINT "wbs_items_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "wbs_items" DROP CONSTRAINT "wbs_items_project_id_fkey";

-- AlterTable
ALTER TABLE "SalesContract" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "SalesCustomer" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "SalesUnit" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "adjustment_indices" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "advance_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "attachments" ALTER COLUMN "entity_id" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "cheques" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "daily_report_equipments" ADD COLUMN     "fuel_liters" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "stop_reason" VARCHAR(500),
ADD COLUMN     "wbs_item_id" UUID;

-- AlterTable
ALTER TABLE "daily_report_materials" ADD COLUMN     "item_id" UUID,
ADD COLUMN     "warehouse_id" UUID;

-- AlterTable
ALTER TABLE "daily_report_progresses" ADD COLUMN     "location" VARCHAR(300),
ADD COLUMN     "quantity" DECIMAL(20,4),
ADD COLUMN     "unit" VARCHAR(32);

-- AlterTable
ALTER TABLE "daily_report_requests" ADD COLUMN     "petty_cash_account_id" UUID;

-- AlterTable
ALTER TABLE "daily_report_workers" ADD COLUMN     "contractor_id" UUID,
ADD COLUMN     "contractor_rate" DECIMAL(20,2),
ADD COLUMN     "employee_id" UUID,
ADD COLUMN     "kind" VARCHAR(20) NOT NULL DEFAULT 'OWN';

-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "daily_work_logs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "employee_profiles" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "project_id" UUID;

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "equipment_daily_logs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "equipment_maintenances" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "fiscal_years" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "fixed_assets" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "goods_issues" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "goods_receipt_items" ADD COLUMN     "addition_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deduction_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "line_total" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "loading_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "goods_receipts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "grand_total" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_addition" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_deduction" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_discount" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_loading" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_shipping" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_tax" DECIMAL(24,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "guarantees" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "insurances" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "item_categories" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32) NOT NULL DEFAULT 'NUMBER';

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "overhead_allocations" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "alias_name" VARCHAR(200),
ADD COLUMN     "bank_account_number" VARCHAR(32),
ADD COLUMN     "bank_card_number" VARCHAR(19),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "job_description" VARCHAR(500),
ADD COLUMN     "shaba_number" VARCHAR(26);

-- AlterTable
ALTER TABLE "payroll_periods" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "payroll_records" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "permits" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "petty_cash_accounts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "phase_checklists" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "price_list_items" DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32);

-- AlterTable
ALTER TABLE "price_lists" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "purchase_invoice_items" ADD COLUMN     "addition_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deduction_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fixed_asset_id" UUID,
ADD COLUMN     "is_capital" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "line_total" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "loading_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "useful_life_months" INTEGER,
DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32) NOT NULL;

-- AlterTable
ALTER TABLE "purchase_invoices" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "total_addition" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_discount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_loading" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_shipping" DECIMAL(20,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_order_items" DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32) NOT NULL;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "purchase_request_items" DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32) NOT NULL;

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "subcontractor_statements" ADD COLUMN     "contract_id" TEXT;

-- AlterTable
ALTER TABLE "technical_documents" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_enabled_at" TIMESTAMP(3),
ADD COLUMN     "two_factor_recovery_codes" JSONB,
ADD COLUMN     "two_factor_secret" TEXT;

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "wbs_items" DROP COLUMN "unit",
ADD COLUMN     "unit" VARCHAR(32);

-- DropEnum
DROP TYPE "ItemUnit";

-- DropEnum
DROP TYPE "PRItemUnit";

-- DropEnum
DROP TYPE "WbsUnit";

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "symbol" VARCHAR(16),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_sections" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "section_type" "DailyReportSectionType" NOT NULL,
    "status" "DailyReportSectionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "forwarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_forwardings" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "section_type" "DailyReportSectionType" NOT NULL,
    "row_number" INTEGER NOT NULL,
    "target_type" "ForwardingTarget" NOT NULL,
    "target_id" UUID,
    "target_code" VARCHAR(64),
    "target_model" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "error_message" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_report_forwardings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_attachments" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "section_type" "DailyReportSectionType",
    "row_number" INTEGER,
    "filename" VARCHAR(255) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "size" INTEGER,
    "mimetype" VARCHAR(100),
    "description" VARCHAR(500),
    "uploaded_by_id" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalContractItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "total_price" DECIMAL(24,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalContractItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wbs_progress_snapshots" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID NOT NULL,
    "report_id" UUID,
    "snapshot_date" DATE NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "unit" VARCHAR(32),
    "progress_pct" DECIMAL(5,2),
    "description" VARCHAR(500),
    "location" VARCHAR(300),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wbs_progress_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_statements" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "status" "WorkerStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "partner_id" UUID NOT NULL,
    "contract_id" TEXT,
    "project_id" UUID,
    "statement_number" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_earnings" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_insurance" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "insurance_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "work_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "holiday_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "absent_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "leave_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "worker_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_statement_items" (
    "id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "unit" VARCHAR(32),
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "total_price" DECIMAL(24,2) NOT NULL,
    "contract_item_id" TEXT,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "worker_statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_tax_settings" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "title" VARCHAR(128) NOT NULL DEFAULT '',
    "monthly_exemption" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "insurance_employee_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "insurance_employer_percent" DECIMAL(5,2) NOT NULL DEFAULT 23,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" UUID NOT NULL,
    "setting_id" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "from_amount" DECIMAL(24,2) NOT NULL,
    "to_amount" DECIMAL(24,2),
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE INDEX "units_is_active_idx" ON "units"("is_active");

-- CreateIndex
CREATE INDEX "daily_report_sections_report_id_idx" ON "daily_report_sections"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_sections_status_idx" ON "daily_report_sections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_report_sections_report_id_section_type_key" ON "daily_report_sections"("report_id", "section_type");

-- CreateIndex
CREATE INDEX "daily_report_forwardings_report_id_idx" ON "daily_report_forwardings"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_forwardings_status_idx" ON "daily_report_forwardings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_report_forwardings_report_id_section_type_row_number__key" ON "daily_report_forwardings"("report_id", "section_type", "row_number", "target_type");

-- CreateIndex
CREATE INDEX "daily_report_attachments_report_id_idx" ON "daily_report_attachments"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_attachments_report_id_section_type_idx" ON "daily_report_attachments"("report_id", "section_type");

-- CreateIndex
CREATE INDEX "LegalContractItem_contractId_idx" ON "LegalContractItem"("contractId");

-- CreateIndex
CREATE INDEX "wbs_progress_snapshots_project_id_idx" ON "wbs_progress_snapshots"("project_id");

-- CreateIndex
CREATE INDEX "wbs_progress_snapshots_wbs_item_id_idx" ON "wbs_progress_snapshots"("wbs_item_id");

-- CreateIndex
CREATE INDEX "wbs_progress_snapshots_snapshot_date_idx" ON "wbs_progress_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "wbs_progress_snapshots_report_id_wbs_item_id_key" ON "wbs_progress_snapshots"("report_id", "wbs_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_statements_code_key" ON "worker_statements"("code");

-- CreateIndex
CREATE INDEX "worker_statements_status_idx" ON "worker_statements"("status");

-- CreateIndex
CREATE INDEX "worker_statements_partner_id_idx" ON "worker_statements"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_statements_partner_id_period_start_period_end_key" ON "worker_statements"("partner_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "worker_statement_items_statement_id_idx" ON "worker_statement_items"("statement_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_tax_settings_year_key" ON "payroll_tax_settings"("year");

-- CreateIndex
CREATE INDEX "tax_brackets_setting_id_idx" ON "tax_brackets"("setting_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_brackets_setting_id_order_key" ON "tax_brackets"("setting_id", "order");

-- CreateIndex
CREATE INDEX "daily_report_equipments_wbs_item_id_idx" ON "daily_report_equipments"("wbs_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoice_items_fixed_asset_id_key" ON "purchase_invoice_items"("fixed_asset_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wbs_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "petty_cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "petty_cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_sections" ADD CONSTRAINT "daily_report_sections_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_forwardings" ADD CONSTRAINT "daily_report_forwardings_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "daily_report_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_attachments" ADD CONSTRAINT "daily_report_attachments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_workers" ADD CONSTRAINT "daily_report_workers_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_work_logs" ADD CONSTRAINT "daily_work_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statements" ADD CONSTRAINT "subcontractor_statements_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "LegalContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_partner_shares" ADD CONSTRAINT "project_partner_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_partner_shares" ADD CONSTRAINT "project_partner_shares_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_accounts" ADD CONSTRAINT "partner_capital_accounts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_documents" ADD CONSTRAINT "technical_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_checklists" ADD CONSTRAINT "phase_checklists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalContractItem" ADD CONSTRAINT "LegalContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "LegalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_progress_snapshots" ADD CONSTRAINT "wbs_progress_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_progress_snapshots" ADD CONSTRAINT "wbs_progress_snapshots_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_statements" ADD CONSTRAINT "worker_statements_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_statements" ADD CONSTRAINT "worker_statements_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "LegalContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_statements" ADD CONSTRAINT "worker_statements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_statement_items" ADD CONSTRAINT "worker_statement_items_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "worker_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_brackets" ADD CONSTRAINT "tax_brackets_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "payroll_tax_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
