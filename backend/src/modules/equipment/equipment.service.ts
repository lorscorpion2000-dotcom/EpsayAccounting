import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import {
  CreateEquipmentDto, UpdateEquipmentDto,
  CreateDailyLogDto, UpdateDailyLogDto,
  CreateMaintenanceDto,
} from './dto/equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

  // ─── Code generators ───
  private async nextEquipmentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'EQ-' + year + '-';
    const last = await this.prisma.equipment.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  private async nextLogCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'EQL-' + year + '-';
    const last = await this.prisma.equipmentDailyLog.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  private async nextMaintenanceCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'EQM-' + year + '-';
    const last = await this.prisma.equipmentMaintenance.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  // ═══════════════════════════════════════════
  // EQUIPMENT (شناسنامه)
  // ═══════════════════════════════════════════
  async listEquipments(query?: {
    search?: string;
    ownership?: string;
    status?: string;
    projectId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};
    if (query?.ownership) where.ownership = query.ownership;
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.currentProjectId = query.projectId;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { plateNumber: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.equipment.findMany({
      where,
      include: {
        owner: { select: { id: true, code: true, name: true } },
        currentProject: { select: { id: true, code: true, name: true } },
        _count: { select: { dailyLogs: true, maintenances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEquipment(id: string) {
    const eq = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        owner: true,
        currentProject: { select: { id: true, code: true, name: true } },
        maintenances: { orderBy: { maintenanceDate: 'desc' }, take: 20 },
      },
    });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');
    return eq;
  }

  async createEquipment(dto: CreateEquipmentDto) {
    const code = await this.nextEquipmentCode();
    return this.prisma.equipment.create({
      data: {
        code,
        name: dto.name,
        ownership: (dto.ownership as any) || 'OWNED',
        category: dto.category,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plateNumber: dto.plateNumber,
        serialNumber: dto.serialNumber,
        hourlyRate: dto.hourlyRate,
        dailyRate: dto.dailyRate,
        monthlyRate: dto.monthlyRate,
        fuelType: dto.fuelType,
        fuelNormPerHour: dto.fuelNormPerHour,
        ownerId: dto.ownerId,
        currentProjectId: dto.currentProjectId,
        status: (dto.status as any) || 'ACTIVE',
        isActive: dto.isActive ?? true,
        description: dto.description,
      },
    });
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto) {
    await this.getEquipment(id);
    const data: any = { ...dto };
    delete data.code; // code never editable
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async removeEquipment(id: string, options?: { force?: boolean }) {
    await this.getEquipment(id);
    const force = options?.force === true;

    const refs = await this.countEquipmentReferences(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (!force) {
      if (total > 0) {
        await this.prisma.equipment.update({
          where: { id },
          data: { isActive: false, status: 'RETIRED' as any },
        });
        return { success: true, softDeleted: true };
      }
      await this.prisma.equipment.delete({ where: { id } });
      return { success: true, hardDeleted: true };
    }

    // force (admin)
    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'EQUIPMENT_HAS_REFS',
        message: '\u0645\u0627\u0634\u06cc\u0646 \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647:\n' + details + '\n\n\u0627\u06af\u0631 \u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u06cc\u062f \u0647\u0645\u0647 \u067e\u0627\u06a9 \u0634\u0648\u062f\u060c \u0627\u0632 \u062f\u06a9\u0645\u0647 \u062a\u0623\u06cc\u06cc\u062f \u062f\u0648\u0645 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f.',
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.equipmentDailyLog.deleteMany({ where: { equipmentId: id } });
      await tx.equipmentMaintenance.deleteMany({ where: { equipmentId: id } });
      await (tx as any).dailyReportEquipment?.deleteMany({ where: { equipmentId: id } }).catch(() => {});
      await tx.equipment.delete({ where: { id } });
    });
    return { success: true, hardDeleted: true };
  }

  private async countEquipmentReferences(id: string) {
    const p = this.prisma;
    const [dailyLogs, maintenances, reportLinks] = await Promise.all([
      p.equipmentDailyLog.count({ where: { equipmentId: id } }),
      p.equipmentMaintenance.count({ where: { equipmentId: id } }),
      (p as any).dailyReportEquipment?.count({ where: { equipmentId: id } }).catch(() => 0) || Promise.resolve(0),
    ]);
    return { dailyLogs, maintenances, reportLinks };
  }

  async stats() {
    const [total, active, idle, maintenance, broken, retired] = await Promise.all([
      this.prisma.equipment.count({ where: { isActive: true } }),
      this.prisma.equipment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.equipment.count({ where: { status: 'IDLE' } }),
      this.prisma.equipment.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.equipment.count({ where: { status: 'BROKEN' } }),
      this.prisma.equipment.count({ where: { status: 'RETIRED' } }),
    ]);
    return { total, active, idle, maintenance, broken, retired };
  }

  // ═══════════════════════════════════════════
  // DAILY LOG (کارکرد روزانه)
  // ═══════════════════════════════════════════
  async listDailyLogs(query?: {
    equipmentId?: string;
    projectId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {};
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.logDate = {};
      if (query.fromDate) where.logDate.gte = new Date(query.fromDate);
      if (query.toDate) where.logDate.lte = new Date(query.toDate);
    }
    return this.prisma.equipmentDailyLog.findMany({
      where,
      include: {
        equipment: { select: { id: true, code: true, name: true, ownership: true, hourlyRate: true } },
        project: { select: { id: true, code: true, name: true } },
        wbsItem: { select: { id: true, code: true, title: true } },
        operator: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async getDailyLog(id: string) {
    const log = await this.prisma.equipmentDailyLog.findUnique({
      where: { id },
      include: {
        equipment: true,
        project: true,
        wbsItem: true,
        operator: true,
      },
    });
    if (!log) throw new NotFoundException('کارکرد یافت نشد');
    return log;
  }

  async createDailyLog(dto: CreateDailyLogDto, userId?: string) {
    // Validate equipment exists
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');

    // Check unique (equipmentId, logDate, shift)
    const existing = await this.prisma.equipmentDailyLog.findFirst({
      where: {
        equipmentId: dto.equipmentId,
        logDate: new Date(dto.logDate),
        shift: dto.shift ?? null,
      },
    });
    if (existing) {
      throw new BadRequestException('برای این ماشین در این تاریخ و شیفت قبلاً ثبت شده است');
    }

    const code = await this.nextLogCode();
    const computedCost = await this.computeCost(dto);

    return this.prisma.equipmentDailyLog.create({
      data: {
        code,
        equipmentId: dto.equipmentId,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        logDate: new Date(dto.logDate),
        shift: dto.shift,
        startMeter: dto.startMeter,
        endMeter: dto.endMeter,
        workHours: dto.workHours ?? 0,
        idleHours: dto.idleHours ?? 0,
        stopHours: dto.stopHours ?? 0,
        breakdownHours: dto.breakdownHours ?? 0,
        fuelLiters: dto.fuelLiters ?? 0,
        fuelCost: dto.fuelCost ?? 0,
        operatorId: dto.operatorId,
        workLocation: dto.workLocation,
        stopReason: dto.stopReason,
        notes: dto.notes,
        computedCost,
        status: 'DRAFT',
        createdById: userId,
      },
      include: { equipment: true, project: true },
    });
  }

  async updateDailyLog(id: string, dto: UpdateDailyLogDto) {
    const log = await this.getDailyLog(id);
    if (log.status !== 'DRAFT') {
      throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');
    }
    const data: any = { ...dto };
    if (dto.logDate) data.logDate = new Date(dto.logDate);
    data.computedCost = await this.computeCost({ ...log, ...dto } as any);
    return this.prisma.equipmentDailyLog.update({
      where: { id },
      data,
      include: { equipment: true, project: true },
    });
  }

  async removeDailyLog(id: string) {
    const log = await this.getDailyLog(id);
    if (log.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.equipmentDailyLog.delete({ where: { id } });
    return { success: true };
  }

  async confirmDailyLog(id: string, userId?: string) {
    const log = await this.getDailyLog(id);
    if (log.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تأیید است');

    // B3.d: idempotency
    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'EQUIPMENT_COST', sourceId: log.id },
      select: { id: true, code: true },
    });
    if (existing) {
      return this.prisma.equipmentDailyLog.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });
    }

    const cost = Number(log.computedCost);

    return this.prisma.$transaction(async (tx) => {
      // B3.d: JE در همان tx
      let je: any = null;
      if (cost > 0.01) {
        je = await this.engine.postEvent('EQUIPMENT_COST', {
          amount: cost,
          entryDate: log.logDate,
          description: 'کارکرد ماشین ' + (log.equipment?.code || '') + ' — ' + (log.equipment?.name || ''),
          reference: log.code,
          projectId: log.projectId,
          sourceId: log.id,
          userId,
          autoPost: true,
        }, tx);
      }

      const updated = await tx.equipmentDailyLog.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      return { ...updated, journalCode: je?.code || null };
    });
  }

  private async computeCost(dto: any): Promise<number> {
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) return 0;
    const hours = Number(dto.workHours || 0) + Number(dto.idleHours || 0) * 0.5;
    const rate = Number(eq.hourlyRate || 0);
    const fuel = Number(dto.fuelCost || 0);
    return hours * rate + fuel;
  }

  // ═══════════════════════════════════════════
  // MAINTENANCE (سوخت و تعمیرات)
  // ═══════════════════════════════════════════
  async listMaintenances(query?: {
    equipmentId?: string;
    projectId?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {};
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.fromDate || query?.toDate) {
      where.maintenanceDate = {};
      if (query.fromDate) where.maintenanceDate.gte = new Date(query.fromDate);
      if (query.toDate) where.maintenanceDate.lte = new Date(query.toDate);
    }
    return this.prisma.equipmentMaintenance.findMany({
      where,
      include: {
        equipment: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { maintenanceDate: 'desc' },
      take: 500,
    });
  }

  async getMaintenance(id: string) {
    const m = await this.prisma.equipmentMaintenance.findUnique({
      where: { id },
      include: { equipment: true, project: true },
    });
    if (!m) throw new NotFoundException('رکورد تعمیر یافت نشد');
    return m;
  }

  async createMaintenance(dto: CreateMaintenanceDto, userId?: string) {
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');

    const code = await this.nextMaintenanceCode();
    const cost = Number(dto.cost) || 0;

    // B3.e: JE + create اتمیک
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.equipmentMaintenance.create({
        data: {
          code,
          equipmentId: dto.equipmentId,
          type: dto.type as any,
          maintenanceDate: new Date(dto.maintenanceDate),
          description: dto.description,
          cost,
          parts: dto.parts,
          vendor: dto.vendor,
          invoiceNumber: dto.invoiceNumber,
          projectId: dto.projectId,
          nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : null,
          nextServiceHours: dto.nextServiceHours,
          notes: dto.notes,
          createdById: userId,
        },
        include: { equipment: true },
      });

      let journalCode: string | null = null;
      if (cost > 0.01) {
        const je = await this.engine.postEvent('EQUIPMENT_MAINTENANCE', {
          amount: cost,
          entryDate: created.maintenanceDate,
          description: 'تعمیرات ماشین ' + eq.code + ' — ' + eq.name,
          reference: created.code,
          projectId: dto.projectId || undefined,
          sourceId: created.id,
          userId,
          autoPost: true,
        }, tx);
        journalCode = je.code;
      }

      return { ...created, journalCode };
    });
  }

  async removeMaintenance(id: string) {
    await this.getMaintenance(id);
    await this.prisma.equipmentMaintenance.delete({ where: { id } });
    return { success: true };
  }

  // ═══════════════════════════════════════════
  // REPORT (کارکرد ماشین در بازه)
  // ═══════════════════════════════════════════
  async report(params: {
    fromDate?: string;
    toDate?: string;
    projectId?: string;
    equipmentId?: string;
  }) {
    const where: any = {};
    if (params.equipmentId) where.equipmentId = params.equipmentId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.fromDate || params.toDate) {
      where.logDate = {};
      if (params.fromDate) where.logDate.gte = new Date(params.fromDate);
      if (params.toDate) where.logDate.lte = new Date(params.toDate);
    }

    const logs = await this.prisma.equipmentDailyLog.findMany({
      where,
      include: { equipment: true, project: true },
    });

    const totalWorkHours = logs.reduce((s, l) => s + Number(l.workHours), 0);
    const totalIdleHours = logs.reduce((s, l) => s + Number(l.idleHours), 0);
    const totalStopHours = logs.reduce((s, l) => s + Number(l.stopHours), 0);
    const totalBreakdownHours = logs.reduce((s, l) => s + Number(l.breakdownHours), 0);
    const totalFuelLiters = logs.reduce((s, l) => s + Number(l.fuelLiters), 0);
    const totalCost = logs.reduce((s, l) => s + Number(l.computedCost), 0);

    // Group by equipment
    const byEquipment = new Map<string, any>();
    for (const l of logs) {
      const key = l.equipmentId;
      if (!byEquipment.has(key)) {
        byEquipment.set(key, {
          equipmentId: key,
          equipmentCode: l.equipment?.code,
          equipmentName: l.equipment?.name,
          workHours: 0, idleHours: 0, stopHours: 0, breakdownHours: 0,
          fuelLiters: 0, cost: 0, logCount: 0,
        });
      }
      const e = byEquipment.get(key);
      e.workHours += Number(l.workHours);
      e.idleHours += Number(l.idleHours);
      e.stopHours += Number(l.stopHours);
      e.breakdownHours += Number(l.breakdownHours);
      e.fuelLiters += Number(l.fuelLiters);
      e.cost += Number(l.computedCost);
      e.logCount += 1;
    }

    return {
      summary: {
        totalWorkHours, totalIdleHours, totalStopHours, totalBreakdownHours,
        totalFuelLiters, totalCost, totalLogs: logs.length,
      },
      byEquipment: Array.from(byEquipment.values()),
    };
  }
}