import { Module } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { EquipmentCrudService } from './services/equipment-crud.service';
import { EquipmentDailyLogService } from './services/equipment-daily-log.service';
import { EquipmentMaintenanceService } from './services/equipment-maintenance.service';

@Module({
  imports: [AccountingModule],
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    EquipmentCrudService,
    EquipmentDailyLogService,
    EquipmentMaintenanceService,
  ],
  exports: [EquipmentService],
})
export class EquipmentModule {}
