-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "adjustment_indices" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "index_value" DECIMAL(20,4) NOT NULL,
    "base_year" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_calculations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "contract_id" UUID,
    "statement_id" UUID,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "base_amount" DECIMAL(24,2) NOT NULL,
    "base_index" DECIMAL(20,4) NOT NULL,
    "current_index" DECIMAL(20,4) NOT NULL,
    "coefficient" DECIMAL(10,4) NOT NULL,
    "adjusted_amount" DECIMAL(24,2) NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" UUID,
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_price_diffs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "contract_id" UUID,
    "statement_id" UUID,
    "material_type" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(32),
    "quantity" DECIMAL(20,4) NOT NULL,
    "base_price" DECIMAL(20,2) NOT NULL,
    "actual_price" DECIMAL(20,2) NOT NULL,
    "diff_amount" DECIMAL(24,2) NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" UUID,
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_price_diffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_indices_code_key" ON "adjustment_indices"("code");

-- CreateIndex
CREATE INDEX "adjustment_indices_category_idx" ON "adjustment_indices"("category");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_indices_year_month_category_key" ON "adjustment_indices"("year", "month", "category");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_calculations_code_key" ON "adjustment_calculations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_calculations_journal_entry_id_key" ON "adjustment_calculations"("journal_entry_id");

-- CreateIndex
CREATE INDEX "adjustment_calculations_project_id_idx" ON "adjustment_calculations"("project_id");

-- CreateIndex
CREATE INDEX "adjustment_calculations_status_idx" ON "adjustment_calculations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "material_price_diffs_code_key" ON "material_price_diffs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "material_price_diffs_journal_entry_id_key" ON "material_price_diffs"("journal_entry_id");

-- CreateIndex
CREATE INDEX "material_price_diffs_project_id_idx" ON "material_price_diffs"("project_id");

-- CreateIndex
CREATE INDEX "material_price_diffs_material_type_idx" ON "material_price_diffs"("material_type");

-- CreateIndex
CREATE INDEX "material_price_diffs_status_idx" ON "material_price_diffs"("status");

-- AddForeignKey
ALTER TABLE "adjustment_calculations" ADD CONSTRAINT "adjustment_calculations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_calculations" ADD CONSTRAINT "adjustment_calculations_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price_diffs" ADD CONSTRAINT "material_price_diffs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price_diffs" ADD CONSTRAINT "material_price_diffs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
