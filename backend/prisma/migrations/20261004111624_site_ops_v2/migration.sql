-- AlterTable
ALTER TABLE "daily_report_materials" ADD COLUMN     "exit_dest" VARCHAR(200),
ADD COLUMN     "exit_type" VARCHAR(30),
ADD COLUMN     "movement_type" VARCHAR(20),
ADD COLUMN     "qc_result" VARCHAR(20);

-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "end_time" VARCHAR(10),
ADD COLUMN     "start_time" VARCHAR(10);

-- CreateTable
CREATE TABLE "daily_report_entry_exits" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "person_name" VARCHAR(200),
    "organization" VARCHAR(200),
    "purpose" VARCHAR(300),
    "vehicle_type" VARCHAR(100),
    "plate_number" VARCHAR(32),
    "driver_name" VARCHAR(200),
    "cargo" VARCHAR(300),
    "entry_time" VARCHAR(10),
    "exit_time" VARCHAR(10),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_entry_exits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_requests" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "request_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" VARCHAR(1000),
    "quantity" DECIMAL(20,4),
    "unit" VARCHAR(32),
    "priority" VARCHAR(20),
    "required_date" DATE,
    "wbs_item_id" UUID,
    "amount" DECIMAL(20,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "manager_note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report_events" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" VARCHAR(2000),
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "duration_hrs" DECIMAL(6,2),
    "severity" VARCHAR(20),
    "actor_name" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_report_entry_exits_report_id_idx" ON "daily_report_entry_exits"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_requests_report_id_idx" ON "daily_report_requests"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_requests_request_type_idx" ON "daily_report_requests"("request_type");

-- CreateIndex
CREATE INDEX "daily_report_events_report_id_idx" ON "daily_report_events"("report_id");

-- CreateIndex
CREATE INDEX "daily_report_events_event_type_idx" ON "daily_report_events"("event_type");

-- AddForeignKey
ALTER TABLE "daily_report_entry_exits" ADD CONSTRAINT "daily_report_entry_exits_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_requests" ADD CONSTRAINT "daily_report_requests_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_events" ADD CONSTRAINT "daily_report_events_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
