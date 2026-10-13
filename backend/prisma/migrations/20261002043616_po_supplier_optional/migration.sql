-- DropForeignKey
ALTER TABLE "rfq_responses" DROP CONSTRAINT "rfq_responses_supplier_id_fkey";

-- AlterTable
ALTER TABLE "rfq_responses" ALTER COLUMN "supplier_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "rfq_responses" ADD CONSTRAINT "rfq_responses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
