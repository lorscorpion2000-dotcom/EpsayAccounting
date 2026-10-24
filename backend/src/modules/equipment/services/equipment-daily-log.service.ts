import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../../accounting/engine/accounting-engine.service';
import {
  CreateDailyLogDto, UpdateDailyLogDto,
} from '../dto/equipment.dto';

interface ComputeCostInput {
  equipmentId: string;
  workHours?: unknown;
  idleHours?: unknown;
  fuelCost?: unknown;
}

export interface EquipmentAggregate {
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  workHours: number;
  idleHours: number;
  stopHours: number;
  breakdownHours: number;
  fuelLiters: number;
  cost: number;
  logCount: number;
}

@Injectable()
export class EquipmentDailyLogService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

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

  async listDailyLogs(query?: {
    equipmentId?: string;
    projectId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: Prisma.EquipmentDailyLogWhereInput = {};
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status as Prisma.EquipmentDailyLogWhereInput['status'];
    if (query?.fromDate || query?.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query?.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query?.toDate) dateFilter.lte = new Date(query.toDate);
      where.logDate = dateFilter;
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
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) throw new NotFoundException('ماشین یافت نشد');

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
    const data = { ...dto } as unknown as Prisma.EquipmentDailyLogUncheckedUpdateInput;
    if (dto.logDate) data.logDate = new Date(dto.logDate);
    data.computedCost = await this.computeCost({ ...log, ...dto } as unknown as ComputeCostInput);
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
      let je: { code: string } | null = null;
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

  private async computeCost(dto: ComputeCostInput): Promise<number> {
    const eq = await this.prisma.equipment.findUnique({ where: { id: dto.equipmentId } });
    if (!eq) return 0;
    const hours = Number(dto.workHours || 0) + Number(dto.idleHours || 0) * 0.5;
    const rate = Number(eq.hourlyRate || 0);
    const fuel = Number(dto.fuelCost || 0);
    return hours * rate + fuel;
  }

  // ─── Report (تجمیع کارکرد) ───
  async report(params: {
    fromDate?: string;
    toDate?: string;
    projectId?: string;
    equipmentId?: string;
  }) {
    const where: Prisma.EquipmentDailyLogWhereInput = {};
    if (params.equipmentId) where.equipmentId = params.equipmentId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.fromDate || params.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.fromDate) dateFilter.gte = new Date(params.fromDate);
      if (params.toDate) dateFilter.lte = new Date(params.toDate);
      where.logDate = dateFilter;
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

    const byEquipment = new Map<string, EquipmentAggregate>();
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
      const e = byEquipment.get(key)!;
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
