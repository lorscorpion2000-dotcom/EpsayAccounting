-- AlterTable
ALTER TABLE "daily_report_equipments" ADD COLUMN     "equipment_id" UUID;

-- AddForeignKey
ALTER TABLE "daily_report_equipments" ADD CONSTRAINT "daily_report_equipments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
