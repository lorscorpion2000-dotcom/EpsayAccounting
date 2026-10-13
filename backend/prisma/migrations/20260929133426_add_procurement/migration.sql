-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_RFQ', 'RFQ_COMPLETED', 'ORDERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PRPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PRItemUnit" AS ENUM ('NUMBER', 'KILOGRAM', 'TON', 'METER', 'SQUARE_METER', 'CUBIC_METER', 'LITER', 'PACKAGE', 'SERVICE', 'LUMP_SUM');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "request_date" DATE NOT NULL,
    "required_date" DATE,
    "requester_id" UUID NOT NULL,
    "department" VARCHAR(100),
    "delivery_location" VARCHAR(200),
    "reason" VARCHAR(500),
    "status" "PRStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" UUID NOT NULL,
    "pr_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit" "PRItemUnit" NOT NULL,
    "priority" "PRPriority" NOT NULL DEFAULT 'NORMAL',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "pr_id" UUID NOT NULL,
    "rfq_date" DATE NOT NULL,
    "valid_until" DATE,
    "min_suppliers" INTEGER NOT NULL DEFAULT 3,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_responses" (
    "id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "responded_at" TIMESTAMP(3),
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "selected_at" TIMESTAMP(3),
    "selection_notes" VARCHAR(500),
    "total_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_response_items" (
    "id" UUID NOT NULL,
    "rfq_response_id" UUID NOT NULL,
    "pr_item_id" UUID NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "total_price" DECIMAL(20,2) NOT NULL,
    "delivery_days" INTEGER,
    "notes" VARCHAR(500),

    CONSTRAINT "rfq_response_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "pr_id" UUID,
    "project_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "po_date" DATE NOT NULL,
    "delivery_date" DATE,
    "subtotal" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 9,
    "tax_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "po_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit" "PRItemUnit" NOT NULL,
    "unit_price" DECIMAL(20,2) NOT NULL,
    "total_price" DECIMAL(20,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_code_key" ON "purchase_requests"("code");

-- CreateIndex
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");

-- CreateIndex
CREATE INDEX "purchase_requests_project_id_idx" ON "purchase_requests"("project_id");

-- CreateIndex
CREATE INDEX "purchase_request_items_pr_id_idx" ON "purchase_request_items"("pr_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_code_key" ON "rfqs"("code");

-- CreateIndex
CREATE INDEX "rfqs_pr_id_idx" ON "rfqs"("pr_id");

-- CreateIndex
CREATE INDEX "rfq_responses_rfq_id_idx" ON "rfq_responses"("rfq_id");

-- CreateIndex
CREATE INDEX "rfq_responses_supplier_id_idx" ON "rfq_responses"("supplier_id");

-- CreateIndex
CREATE INDEX "rfq_response_items_rfq_response_id_idx" ON "rfq_response_items"("rfq_response_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders"("code");

-- CreateIndex
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_po_id_idx" ON "purchase_order_items"("po_id");

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_wbs_item_id_fkey" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_response_items" ADD CONSTRAINT "rfq_response_items_rfq_response_id_fkey" FOREIGN KEY ("rfq_response_id") REFERENCES "rfq_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_response_items" ADD CONSTRAINT "rfq_response_items_pr_item_id_fkey" FOREIGN KEY ("pr_item_id") REFERENCES "purchase_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
