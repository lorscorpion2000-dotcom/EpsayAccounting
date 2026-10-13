/*
  Warnings:

  - You are about to drop the column `amount` on the `subcontractor_statement_items` table. All the data in the column will be lost.
  - You are about to drop the column `coefficient` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `insurance_deduction` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `other_deductions` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `period_from` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `period_to` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `prepayment_deduction` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `rejected_reason` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `retention_deduction` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `statement_date` on the `subcontractor_statements` table. All the data in the column will be lost.
  - You are about to drop the column `tax_deduction` on the `subcontractor_statements` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[project_id,contractor_id,statement_number]` on the table `subcontractor_statements` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `total_price` to the `subcontractor_statement_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_end` to the `subcontractor_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_start` to the `subcontractor_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statement_number` to the `subcontractor_statements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'DAILY_WAGE', 'HOURLY');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttendanceStatus2" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'SICK', 'MISSION', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'MARRIAGE', 'BEREAVEMENT', 'HAJJ');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'SETTLED');

-- DropIndex
DROP INDEX "subcontractor_statements_contractor_id_idx";

-- DropIndex
DROP INDEX "subcontractor_statements_project_id_idx";

-- AlterTable
ALTER TABLE "subcontractor_statement_items" DROP COLUMN "amount",
ADD COLUMN     "total_price" DECIMAL(24,2) NOT NULL;

-- AlterTable
ALTER TABLE "subcontractor_statements" DROP COLUMN "coefficient",
DROP COLUMN "insurance_deduction",
DROP COLUMN "notes",
DROP COLUMN "other_deductions",
DROP COLUMN "period_from",
DROP COLUMN "period_to",
DROP COLUMN "prepayment_deduction",
DROP COLUMN "rejected_reason",
DROP COLUMN "retention_deduction",
DROP COLUMN "statement_date",
DROP COLUMN "tax_deduction",
ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "insurance_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "insurance_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
ADD COLUMN     "other_deduction" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "period_end" DATE NOT NULL,
ADD COLUMN     "period_start" DATE NOT NULL,
ADD COLUMN     "prepayment_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "prepayment_depreciation" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "prepayment_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "retention_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "retention_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "statement_number" INTEGER NOT NULL,
ADD COLUMN     "tax_amount" DECIMAL(24,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 3,
ADD COLUMN     "total_deduction" DECIMAL(24,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "employee_code" VARCHAR(32) NOT NULL,
    "employee_type" "EmployeeType" NOT NULL DEFAULT 'FULL_TIME',
    "position" VARCHAR(128),
    "department" VARCHAR(128),
    "hire_date" DATE,
    "end_date" DATE,
    "base_salary" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "housing_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "food_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "child_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "other_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "daily_wage" DECIMAL(20,2),
    "hourly_wage" DECIMAL(20,2),
    "bank_account" VARCHAR(32),
    "bank_iban" VARCHAR(32),
    "bank_name" VARCHAR(128),
    "insurance_number" VARCHAR(32),
    "insurance_start" DATE,
    "has_insurance" BOOLEAN NOT NULL DEFAULT false,
    "marital_status" "MaritalStatus" NOT NULL DEFAULT 'SINGLE',
    "children_count" INTEGER NOT NULL DEFAULT 0,
    "national_id" VARCHAR(20),
    "birth_date" DATE,
    "birth_place" VARCHAR(128),
    "education" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "project_id" UUID,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "total_gross" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_insurance" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "total_advances" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "employee_profile_id" UUID,
    "row_number" INTEGER NOT NULL,
    "work_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "holiday_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "absent_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "leave_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "base_salary" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "housing_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "food_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "child_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "other_allow" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "overtime_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "holiday_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "bonus_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "insurance_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "insurance_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "advance_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "absent_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "other_deduction" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "check_in" VARCHAR(10),
    "check_out" VARCHAR(10),
    "work_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "AttendanceStatus2" NOT NULL DEFAULT 'PRESENT',
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_work_logs" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "project_id" UUID,
    "wbs_item_id" UUID,
    "regular_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "holiday_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "status" "AttendanceStatus2" NOT NULL DEFAULT 'PRESENT',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL DEFAULT 'ANNUAL',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "reason" VARCHAR(500),
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_requests" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "employee_id" UUID NOT NULL,
    "request_date" DATE NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "reason" VARCHAR(500),
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_partner_id_key" ON "employee_profiles"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employee_code_key" ON "employee_profiles"("employee_code");

-- CreateIndex
CREATE INDEX "employee_profiles_is_active_idx" ON "employee_profiles"("is_active");

-- CreateIndex
CREATE INDEX "employee_profiles_employee_type_idx" ON "employee_profiles"("employee_type");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_code_key" ON "payroll_periods"("code");

-- CreateIndex
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_year_month_project_id_key" ON "payroll_periods"("year", "month", "project_id");

-- CreateIndex
CREATE INDEX "payroll_records_period_id_idx" ON "payroll_records"("period_id");

-- CreateIndex
CREATE INDEX "payroll_records_employee_id_idx" ON "payroll_records"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_period_id_employee_id_key" ON "payroll_records"("period_id", "employee_id");

-- CreateIndex
CREATE INDEX "attendances_attendance_date_idx" ON "attendances"("attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_attendance_date_key" ON "attendances"("employee_id", "attendance_date");

-- CreateIndex
CREATE INDEX "daily_work_logs_employee_id_work_date_idx" ON "daily_work_logs"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "daily_work_logs_work_date_idx" ON "daily_work_logs"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_code_key" ON "leave_requests"("code");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "advance_requests_code_key" ON "advance_requests"("code");

-- CreateIndex
CREATE INDEX "advance_requests_employee_id_idx" ON "advance_requests"("employee_id");

-- CreateIndex
CREATE INDEX "advance_requests_status_idx" ON "advance_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_statements_project_id_contractor_id_statement_key" ON "subcontractor_statements"("project_id", "contractor_id", "statement_number");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_profile_id_fkey" FOREIGN KEY ("employee_profile_id") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_work_logs" ADD CONSTRAINT "daily_work_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_requests" ADD CONSTRAINT "advance_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statements" ADD CONSTRAINT "subcontractor_statements_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statement_items" ADD CONSTRAINT "subcontractor_statement_items_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
