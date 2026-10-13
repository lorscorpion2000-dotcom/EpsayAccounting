-- CreateEnum
CREATE TYPE "PriceListStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "wbs_items" ADD COLUMN     "price_list_item_id" UUID;

-- CreateTable
CREATE TABLE "price_lists" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "year" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" "PriceListStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "unit" "WbsUnit" NOT NULL,
    "base_price" DECIMAL(20,2) NOT NULL,
    "category" VARCHAR(200),
    "chapter" VARCHAR(200),
    "notes" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_code_key" ON "price_lists"("code");

-- CreateIndex
CREATE INDEX "price_lists_year_idx" ON "price_lists"("year");

-- CreateIndex
CREATE INDEX "price_lists_status_idx" ON "price_lists"("status");

-- CreateIndex
CREATE INDEX "price_list_items_price_list_id_idx" ON "price_list_items"("price_list_id");

-- CreateIndex
CREATE INDEX "price_list_items_code_idx" ON "price_list_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_code_key" ON "price_list_items"("price_list_id", "code");

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_price_list_item_id_fkey" FOREIGN KEY ("price_list_item_id") REFERENCES "price_list_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
