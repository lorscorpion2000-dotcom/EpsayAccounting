-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "subcontractor_statements" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "contractor_id" UUID NOT NULL,
    "statement_date" DATE NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "coefficient" DECIMAL(5,4) NOT NULL DEFAULT 1.07,
    "prepayment_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "insurance_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "tax_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "retention_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "net_payable" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_statement_items" (
    "id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "unit" VARCHAR(32),
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "amount" DECIMAL(24,2) NOT NULL,
    "wbs_item_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "father_name" VARCHAR(200),
    "national_code" VARCHAR(10),
    "mobile" VARCHAR(20),
    "address" VARCHAR(500),
    "position" VARCHAR(200),
    "department" VARCHAR(100),
    "hire_date" DATE,
    "base_salary" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "daily_wage" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "hourly_wage" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "insurance_no" VARCHAR(32),
    "bank_account" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "total_gross" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "base_salary" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "housing" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "food" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "children" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "overtime" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "gross" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "insurance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "working_days" INTEGER NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_statements_code_key" ON "subcontractor_statements"("code");

-- CreateIndex
CREATE INDEX "subcontractor_statements_project_id_idx" ON "subcontractor_statements"("project_id");

-- CreateIndex
CREATE INDEX "subcontractor_statements_contractor_id_idx" ON "subcontractor_statements"("contractor_id");

-- CreateIndex
CREATE INDEX "subcontractor_statements_status_idx" ON "subcontractor_statements"("status");

-- CreateIndex
CREATE INDEX "subcontractor_statement_items_statement_id_idx" ON "subcontractor_statement_items"("statement_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_code_key" ON "employees"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_national_code_key" ON "employees"("national_code");

-- CreateIndex
CREATE INDEX "employees_is_active_idx" ON "employees"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_code_key" ON "payrolls"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_year_month_key" ON "payrolls"("year", "month");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_items_employee_id_idx" ON "payroll_items"("employee_id");

-- AddForeignKey
ALTER TABLE "subcontractor_statements" ADD CONSTRAINT "subcontractor_statements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statements" ADD CONSTRAINT "subcontractor_statements_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statement_items" ADD CONSTRAINT "subcontractor_statement_items_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "subcontractor_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
