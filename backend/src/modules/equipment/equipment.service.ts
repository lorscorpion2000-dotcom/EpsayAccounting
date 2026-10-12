import { Injectable } from '@nestjs/common';
import {
  CreateEquipmentDto, UpdateEquipmentDto,
  CreateDailyLogDto, UpdateDailyLogDto,
  CreateMaintenanceDto,
} from './dto/equipment.dto';
import { EquipmentCrudService } from './services/equipment-crud.service';
import { EquipmentDailyLogService } from './services/equipment-daily-log.service';
import { EquipmentMaintenanceService } from './services/equipment-maintenance.service';

/**
 * Facade برای سازگاری با controller.
 * منطق در سه سرویس زیرشاخه‌ای:
 *  - EquipmentCrudService       (شناسنامه ماشین + stats)
 *  - EquipmentDailyLogService   (کارکرد روزانه)
 *  - EquipmentMaintenanceService (تعمیرات)
 * (F8c — 522 خط → 4 فایل، بدون تغییر رفتار)
 */
@Injectable()
export class EquipmentService {
  constructor(
    private crud: EquipmentCrudService,
    private dailyLog: EquipmentDailyLogService,
    private maintenance: EquipmentMaintenanceService,
  ) {}

  // ─── Equipment ───
  listEquipments(q?: Parameters<EquipmentCrudService['listEquipments']>[0]) {
    return this.crud.listEquipments(q);
  }
  getEquipment(id: string) { return this.crud.getEquipment(id); }
  createEquipment(dto: CreateEquipmentDto) { return this.crud.createEquipment(dto); }
  updateEquipment(id: string, dto: UpdateEquipmentDto) { return this.crud.updateEquipment(id, dto); }
  removeEquipment(id: string, options?: { force?: boolean }) { return this.crud.removeEquipment(id, options); }
  stats() { return this.crud.stats(); }

  // ─── Daily Logs ───
  listDailyLogs(q?: Parameters<EquipmentDailyLogService['listDailyLogs']>[0]) {
    return this.dailyLog.listDailyLogs(q);
  }
  getDailyLog(id: string) { return this.dailyLog.getDailyLog(id); }
  createDailyLog(dto: CreateDailyLogDto, userId?: string) { return this.dailyLog.createDailyLog(dto, userId); }
  updateDailyLog(id: string, dto: UpdateDailyLogDto) { return this.dailyLog.updateDailyLog(id, dto); }
  removeDailyLog(id: string) { return this.dailyLog.removeDailyLog(id); }
  confirmDailyLog(id: string, userId?: string) { return this.dailyLog.confirmDailyLog(id, userId); }

  // ─── Maintenance ───
  listMaintenances(q?: Parameters<EquipmentMaintenanceService['listMaintenances']>[0]) {
    return this.maintenance.listMaintenances(q);
  }
  getMaintenance(id: string) { return this.maintenance.getMaintenance(id); }
  createMaintenance(dto: CreateMaintenanceDto, userId?: string) {
    return this.maintenance.createMaintenance(dto, userId);
  }
  removeMaintenance(id: string) { return this.maintenance.removeMaintenance(id); }

  // ─── Report ───
  report(params: {
    fromDate?: string;
    toDate?: string;
    projectId?: string;
    equipmentId?: string;
  }) {
    return this.dailyLog.report(params);
  }
}
