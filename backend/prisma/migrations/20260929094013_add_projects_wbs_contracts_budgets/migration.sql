-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CLIENT', 'CONSULTANT', 'CONTRACTOR', 'SUPPLIER', 'EMPLOYEE', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('MAIN_CONTRACTOR', 'SELF_OWNER', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectUsage" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'OFFICE', 'HOSPITAL', 'INDUSTRIAL', 'CIVIL', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('LUMP_SUM', 'UNIT_PRICE', 'PERCENTAGE', 'TRUST');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WbsUnit" AS ENUM ('SQUARE_METER', 'CUBIC_METER', 'LINEAR_METER', 'TON', 'KILOGRAM', 'NUMBER', 'SERVICE', 'LUMP');

-- CreateEnum
CREATE TYPE "WbsLevel" AS ENUM ('PHASE', 'WORK_PACKAGE', 'ACTIVITY', 'SUB_ACTIVITY');

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'OTHER',
    "national_id" VARCHAR(20),
    "phone" VARCHAR(20),
    "email" VARCHAR(128),
    "address" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "ProjectType" NOT NULL DEFAULT 'MAIN_CONTRACTOR',
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "usage" "ProjectUsage",
    "client_id" UUID,
    "consultant_id" UUID,
    "address_province" VARCHAR(64),
    "address_city" VARCHAR(64),
    "address_full" VARCHAR(512),
    "total_area" DECIMAL(15,2),
    "floors_count" INTEGER,
    "start_date" DATE,
    "planned_end_date" DATE,
    "actual_end_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'LUMP_SUM',
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "base_amount" DECIMAL(20,2) NOT NULL,
    "coefficient" DECIMAL(5,4) NOT NULL DEFAULT 1.07,
    "sign_date" DATE,
    "duration_value" INTEGER,
    "duration_unit" VARCHAR(16),
    "start_date" DATE,
    "end_date" DATE,
    "payment_terms" TEXT,
    "prepayment_percent" DECIMAL(5,2),
    "prepayment_amount" DECIMAL(20,2),
    "prepayment_depreciation_percent" DECIMAL(5,2),
    "insurance_percent" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "retention_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "other_deductions" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wbs_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "level" "WbsLevel" NOT NULL,
    "unit" "WbsUnit",
    "quantity" DECIMAL(20,4),
    "unit_price" DECIMAL(20,2),
    "total_price" DECIMAL(24,2),
    "weight" DECIMAL(5,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wbs_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_budgets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "amount" DECIMAL(20,2) NOT NULL,
    "approved_at" DATE NOT NULL,
    "approved_by" UUID,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_code_key" ON "partners"("code");

-- CreateIndex
CREATE INDEX "partners_type_idx" ON "partners"("type");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");

-- CreateIndex
CREATE INDEX "contracts_project_id_idx" ON "contracts"("project_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "wbs_items_project_id_idx" ON "wbs_items"("project_id");

-- CreateIndex
CREATE INDEX "wbs_items_parent_id_idx" ON "wbs_items"("parent_id");

-- CreateIndex
CREATE INDEX "project_budgets_project_id_idx" ON "project_budgets"("project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wbs_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
