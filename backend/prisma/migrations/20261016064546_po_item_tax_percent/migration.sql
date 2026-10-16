-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 9;
