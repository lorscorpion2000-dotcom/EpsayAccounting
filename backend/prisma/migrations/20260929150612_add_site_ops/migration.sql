-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY', 'WINDY', 'STORM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'SICK', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'IDLE', 'BROKEN', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "weather" "WeatherCondition",
    "temp_min" INTEGER,
    "temp_max" INTEGER,
    "operations" TEXT,
    "issues" TEXT,
    "incidents" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_workers" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "team_name" VARCHAR(200) NOT NULL,
    "foreman" VARCHAR(200),
    "worker_count" INTEGER NOT NULL,
    "work_hours" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "overtime" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "wbs_item_id" UUID,
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_equipments" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "plate_number" VARCHAR(32),
    "operator" VARCHAR(200),
    "hours_worked" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_materials" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "item_name" VARCHAR(300) NOT NULL,
    "unit" VARCHAR(32),
    "quantity" DECIMAL(20,4) NOT NULL,
    "supplier" VARCHAR(200),
    "vehicle_plate" VARCHAR(32),
    "bill_number" VARCHAR(64),
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_progresses" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "wbs_item_id" UUID,
    "description" VARCHAR(500) NOT NULL,
    "progress_pct" DECIMAL(5,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_code_key" ON "daily_reports"("code");

-- CreateIndex
CREATE INDEX "daily_reports_report_date_idx" ON "daily_reports"("report_date");

-- CreateIndex
CREATE INDEX "daily_reports_status_idx" ON "daily_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_project_id_report_date_key" ON "daily_reports"("project_id", "report_date");

-- CreateIndex
CREATE INDEX "daily_report_workers_report_id_idx" ON "daily_report_workers"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_equipments_report_id_idx" ON "daily_report_equipments"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_materials_report_id_idx" ON "daily_report_materials"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_progresses_report_id_idx" ON "daily_report_progresses"("report_id");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_workers" ADD CONSTRAINT "daily_report_workers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_equipments" ADD CONSTRAINT "daily_report_equipments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_materials" ADD CONSTRAINT "daily_report_materials_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_progresses" ADD CONSTRAINT "daily_report_progresses_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
