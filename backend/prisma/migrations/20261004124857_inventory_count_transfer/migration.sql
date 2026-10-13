-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseTransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "count_date" DATE NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "notes" VARCHAR(1000),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_count_items" (
    "id" UUID NOT NULL,
    "count_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "system_qty" DECIMAL(20,4) NOT NULL,
    "physical_qty" DECIMAL(20,4) NOT NULL,
    "difference" DECIMAL(20,4) NOT NULL,
    "unit_cost" DECIMAL(20,2) NOT NULL,
    "difference_cost" DECIMAL(24,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_transfers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "project_id" UUID,
    "transfer_date" DATE NOT NULL,
    "status" "WarehouseTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "driver_name" VARCHAR(200),
    "vehicle_plate" VARCHAR(32),
    "notes" VARCHAR(1000),
    "sent_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "received_by_id" UUID,
    "total_value" DECIMAL(24,2) NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_transfer_items" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit_cost" DECIMAL(20,2) NOT NULL,
    "total_cost" DECIMAL(24,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_counts_code_key" ON "inventory_counts"("code");

-- CreateIndex
CREATE INDEX "inventory_counts_warehouse_id_idx" ON "inventory_counts"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_counts_status_idx" ON "inventory_counts"("status");

-- CreateIndex
CREATE INDEX "inventory_count_items_count_id_idx" ON "inventory_count_items"("count_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_transfers_code_key" ON "warehouse_transfers"("code");

-- CreateIndex
CREATE INDEX "warehouse_transfers_from_warehouse_id_idx" ON "warehouse_transfers"("from_warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_transfers_to_warehouse_id_idx" ON "warehouse_transfers"("to_warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_transfers_status_idx" ON "warehouse_transfers"("status");

-- CreateIndex
CREATE INDEX "warehouse_transfer_items_transfer_id_idx" ON "warehouse_transfer_items"("transfer_id");

-- AddForeignKey
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfer_items" ADD CONSTRAINT "warehouse_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "warehouse_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_transfer_items" ADD CONSTRAINT "warehouse_transfer_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
