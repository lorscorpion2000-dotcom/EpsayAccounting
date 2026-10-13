-- AlterTable: PurchaseOrder.supplierId → nullable
ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;

-- Drop old constraint (اگر بود)
ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_supplier_id_fkey";

-- Add new constraint with SET NULL
ALTER TABLE "purchase_orders" 
  ADD CONSTRAINT "purchase_orders_supplier_id_fkey" 
  FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;