-- AlterTable
ALTER TABLE "LegalContractItem" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "client_statement_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "company_profile" ALTER COLUMN "id" SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "daily_report_materials" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "daily_report_progresses" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "daily_report_requests" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "material_price_diffs" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "price_list_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "purchase_invoice_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "purchase_request_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "sales_invoice_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "subcontractor_statement_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "wbs_items" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "wbs_progress_snapshots" ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "worker_statement_items" ADD COLUMN     "unit_id" UUID;

-- AddForeignKey
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_materials" ADD CONSTRAINT "daily_report_materials_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_progresses" ADD CONSTRAINT "daily_report_progresses_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_statement_items" ADD CONSTRAINT "subcontractor_statement_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalContractItem" ADD CONSTRAINT "LegalContractItem_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_statement_items" ADD CONSTRAINT "client_statement_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_report_requests" ADD CONSTRAINT "daily_report_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wbs_progress_snapshots" ADD CONSTRAINT "wbs_progress_snapshots_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price_diffs" ADD CONSTRAINT "material_price_diffs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_statement_items" ADD CONSTRAINT "worker_statement_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
