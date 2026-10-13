-- CreateEnum
CREATE TYPE "EquipmentOwnership" AS ENUM ('OWNED', 'RENTED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'REPAIR', 'OVERHAUL', 'TIRE', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentLogStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED');

-- AlterEnum
ALTER TYPE "EquipmentStatus" ADD VALUE 'RETIRED';

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "ownership" "EquipmentOwnership" NOT NULL DEFAULT 'OWNED',
    "category" VARCHAR(100),
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "year" INTEGER,
    "plate_number" VARCHAR(32),
    "serial_number" VARCHAR(64),
    "hourly_rate" DECIMAL(20,2),
    "daily_rate" DECIMAL(20,2),
    "monthly_rate" DECIMAL(20,2),
    "fuel_type" VARCHAR(32),
    "fuel_norm_per_hour" DECIMAL(10,2),
    "owner_id" UUID,
    "current_project_id" UUID,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_daily_logs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "equipment_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "log_date" DATE NOT NULL,
    "shift" VARCHAR(16),
    "start_meter" DECIMAL(12,2),
    "end_meter" DECIMAL(12,2),
    "work_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "idle_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "stop_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "breakdown_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "fuel_liters" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fuel_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "operator_id" UUID,
    "work_location" VARCHAR(300),
    "stop_reason" VARCHAR(500),
    "notes" VARCHAR(500),
    "daily_report_id" UUID,
    "computed_cost" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "status" "EquipmentLogStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_maintenances" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "equipment_id" UUID NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
    "maintenance_date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "cost" DECIMAL(20,2) NOT NULL,
    "parts" JSONB,
    "vendor" VARCHAR(200),
    "invoice_number" VARCHAR(64),
    "project_id" UUID,
    "next_service_date" DATE,
    "next_service_hours" DECIMAL(12,2),
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_code_key" ON "equipment"("code");

-- CreateIndex
CREATE INDEX "equipment_ownership_idx" ON "equipment"("ownership");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_current_project_id_idx" ON "equipment"("current_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_daily_logs_code_key" ON "equipment_daily_logs"("code");

-- CreateIndex
CREATE INDEX "equipment_daily_logs_log_date_idx" ON "equipment_daily_logs"("log_date");

-- CreateIndex
CREATE INDEX "equipment_daily_logs_project_id_idx" ON "equipment_daily_logs"("project_id");

-- CreateIndex
CREATE INDEX "equipment_daily_logs_status_idx" ON "equipment_daily_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_daily_logs_equipment_id_log_date_shift_key" ON "equipment_daily_logs"("equipment_id", "log_date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_maintenances_code_key" ON "equipment_maintenances"("code");

-- CreateIndex
CREATE INDEX "equipment_maintenances_equipment_id_idx" ON "equipment_maintenances"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_maintenances_maintenance_date_idx" ON "equipment_maintenances"("maintenance_date");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_current_project_id_fkey" FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_daily_logs" ADD CONSTRAINT "equipment_daily_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_daily_logs" ADD CONSTRAINT "equipment_daily_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_daily_logs" ADD CONSTRAINT "equipment_daily_logs_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_daily_logs" ADD CONSTRAINT "equipment_daily_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_maintenances" ADD CONSTRAINT "equipment_maintenances_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_maintenances" ADD CONSTRAINT "equipment_maintenances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
