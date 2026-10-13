-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "acquisition_date" DATE NOT NULL,
    "acquisition_cost" DECIMAL(20,2) NOT NULL,
    "residual_value" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "useful_life_months" INTEGER NOT NULL,
    "depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "monthly_depreciation" DECIMAL(20,2) NOT NULL,
    "accumulated_depreciation" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "book_value" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "asset_account_id" UUID NOT NULL,
    "depreciation_account_id" UUID NOT NULL,
    "accumulated_deprec_account_id" UUID NOT NULL,
    "project_id" UUID,
    "cost_center_id" UUID,
    "acquisition_journal_entry_id" UUID,
    "disposal_date" DATE,
    "disposal_proceeds" DECIMAL(20,2),
    "disposal_journal_entry_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "fixed_asset_id" UUID NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "entry_date" DATE NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "accumulated_before" DECIMAL(20,2) NOT NULL,
    "accumulated_after" DECIMAL(20,2) NOT NULL,
    "book_value_after" DECIMAL(20,2) NOT NULL,
    "journal_entry_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_code_key" ON "fixed_assets"("code");

-- CreateIndex
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets"("status");

-- CreateIndex
CREATE INDEX "fixed_assets_project_id_idx" ON "fixed_assets"("project_id");

-- CreateIndex
CREATE INDEX "fixed_assets_acquisition_date_idx" ON "fixed_assets"("acquisition_date");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_code_key" ON "depreciation_entries"("code");

-- CreateIndex
CREATE INDEX "depreciation_entries_period_year_period_month_idx" ON "depreciation_entries"("period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_fixed_asset_id_period_year_period_mont_key" ON "depreciation_entries"("fixed_asset_id", "period_year", "period_month");

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_asset_account_id_fkey" FOREIGN KEY ("asset_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_depreciation_account_id_fkey" FOREIGN KEY ("depreciation_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_accumulated_deprec_account_id_fkey" FOREIGN KEY ("accumulated_deprec_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_acquisition_journal_entry_id_fkey" FOREIGN KEY ("acquisition_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_disposal_journal_entry_id_fkey" FOREIGN KEY ("disposal_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
