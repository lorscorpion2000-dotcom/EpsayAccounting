import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-report.dto';
import { UpdateDailyReportDto } from './dto/create-report.dto';
import { DailyReportSectionsService } from './daily-report-sections.service';

@Injectable()
export class SiteOpsService {
  constructor(
    private prisma: PrismaService,
    private sections: DailyReportSectionsService,
  ) {}

  private async generateCode(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.dailyReport.count({ where: { projectId } });
    return 'DR-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; status?: string; fromDate?: string; toDate?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.reportDate = {};
      if (query.fromDate) where.reportDate.gte = new Date(query.fromDate);
      if (query.toDate) where.reportDate.lte = new Date(query.toDate);
    }
    return this.prisma.dailyReport.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { workers: true, equipments: true, materials: true, progresses: true, entryExits: true, requests: true, events: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        workers: { orderBy: { rowNumber: 'asc' } },
        equipments: { orderBy: { rowNumber: 'asc' } },
        materials: { orderBy: { rowNumber: 'asc' } },
        progresses: { orderBy: { rowNumber: 'asc' } },
        entryExits: { orderBy: { rowNumber: 'asc' } },
        requests: { orderBy: { rowNumber: 'asc' } },
        events: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!r) throw new NotFoundException('گزارش روزانه یافت نشد');
    return r;
  }

  // ─── Helper: create nested rows ───
  private buildWorkers(items: any[]) {
    return items.map((w, i) => ({
      rowNumber: i + 1, teamName: w.teamName, foreman: w.foreman,
      employeeId: w.employeeId,
      workerCount: w.workerCount, workHours: w.workHours ?? 8, overtime: w.overtime ?? 0,
      status: (w.status as any) || 'PRESENT', wbsItemId: w.wbsItemId, description: w.description,
    }));
  }
  private buildEquipments(items: any[]) {
    return items.map((e, i) => ({
      rowNumber: i + 1, equipmentId: e.equipmentId, name: e.name, plateNumber: e.plateNumber, operator: e.operator,
      hoursWorked: e.hoursWorked ?? 0, status: (e.status as any) || 'ACTIVE',
      wbsItemId: e.wbsItemId, fuelLiters: e.fuelLiters ?? 0, stopReason: e.stopReason,
      description: e.description,
    }));
  }
  private buildMaterials(items: any[]) {
    return items.map((m, i) => ({
      rowNumber: i + 1, itemName: m.itemName, unit: m.unit, quantity: m.quantity,
      itemId: m.itemId, warehouseId: m.warehouseId,
      supplier: m.supplier, vehiclePlate: m.vehiclePlate, billNumber: m.billNumber,
      movementType: m.movementType, qcResult: m.qcResult,
      exitType: m.exitType, exitDest: m.exitDest, description: m.description,
    }));
  }
  private buildProgresses(items: any[]) {
    return items.map((p, i) => ({
      rowNumber: i + 1, wbsItemId: p.wbsItemId, description: p.description,
      progressPct: p.progressPct, quantity: p.quantity, unit: p.unit,
      location: p.location, notes: p.notes,
    }));
  }
  private buildEntryExits(items: any[]) {
    return items.map((e, i) => ({
      rowNumber: i + 1, kind: e.kind,
      personName: e.personName, organization: e.organization, purpose: e.purpose,
      vehicleType: e.vehicleType, plateNumber: e.plateNumber, driverName: e.driverName, cargo: e.cargo,
      entryTime: e.entryTime, exitTime: e.exitTime, notes: e.notes,
    }));
  }
  private buildRequests(items: any[]) {
    return items.map((r, i) => ({
      rowNumber: i + 1, requestType: r.requestType, title: r.title, description: r.description,
      quantity: r.quantity, unit: r.unit, priority: r.priority,
      requiredDate: r.requiredDate ? new Date(r.requiredDate) : null,
      wbsItemId: r.wbsItemId, amount: r.amount, status: 'PENDING',
      pettyCashAccountId: r.pettyCashAccountId,
    }));
  }
  private buildEvents(items: any[]) {
    return items.map((e, i) => ({
      rowNumber: i + 1, eventType: e.eventType, title: e.title, description: e.description,
      startTime: e.startTime, endTime: e.endTime, durationHrs: e.durationHrs,
      severity: e.severity, actorName: e.actorName,
    }));
  }

  async create(dto: CreateDailyReportDto, userId: string) {
    const code = await this.generateCode(dto.projectId);
    const reportDate = new Date(dto.reportDate);

    const exists = await this.prisma.dailyReport.findFirst({
      where: { projectId: dto.projectId, reportDate },
    });
    if (exists) throw new BadRequestException('برای این پروژه در این تاریخ گزارش ثبت شده است');

    const data: any = {
      code,
      projectId: dto.projectId,
      reportDate,
      weather: dto.weather as any,
      tempMin: dto.tempMin,
      tempMax: dto.tempMax,
      startTime: dto.startTime,
      endTime: dto.endTime,
      operations: dto.operations,
      issues: dto.issues,
      incidents: dto.incidents,
      status: 'DRAFT',
      createdById: userId,
    };

    if (dto.workers?.length) data.workers = { create: this.buildWorkers(dto.workers) };
    if (dto.equipments?.length) data.equipments = { create: this.buildEquipments(dto.equipments) };
    if (dto.materials?.length) data.materials = { create: this.buildMaterials(dto.materials) };
    if (dto.progresses?.length) data.progresses = { create: this.buildProgresses(dto.progresses) };
    if (dto.entryExits?.length) data.entryExits = { create: this.buildEntryExits(dto.entryExits) };
    if (dto.requests?.length) data.requests = { create: this.buildRequests(dto.requests) };
    if (dto.events?.length) data.events = { create: this.buildEvents(dto.events) };

    const created = await this.prisma.dailyReport.create({
      data,
      include: {
        workers: true, equipments: true, materials: true, progresses: true,
        entryExits: true, requests: true, events: true,
      },
    });

    // ساخت ۹ بخش اولیه
    await this.sections.initSections(created.id);

    return created;
  }

  async update(id: string, dto: UpdateDailyReportDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط گزارش پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.reportDate) data.reportDate = new Date(dto.reportDate);
    if (dto.weather !== undefined) data.weather = dto.weather;
    if (dto.tempMin !== undefined) data.tempMin = dto.tempMin;
    if (dto.tempMax !== undefined) data.tempMax = dto.tempMax;
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime !== undefined) data.endTime = dto.endTime;
    if (dto.operations !== undefined) data.operations = dto.operations;
    if (dto.issues !== undefined) data.issues = dto.issues;
    if (dto.incidents !== undefined) data.incidents = dto.incidents;

    return this.prisma.$transaction(async (tx) => {
      if (dto.workers) {
        await tx.dailyReportWorker.deleteMany({ where: { reportId: id } });
        data.workers = { create: this.buildWorkers(dto.workers) };
      }
      if (dto.equipments) {
        await tx.dailyReportEquipment.deleteMany({ where: { reportId: id } });
        data.equipments = { create: this.buildEquipments(dto.equipments) };
      }
      if (dto.materials) {
        await tx.dailyReportMaterial.deleteMany({ where: { reportId: id } });
        data.materials = { create: this.buildMaterials(dto.materials) };
      }
      if (dto.progresses) {
        await tx.dailyReportProgress.deleteMany({ where: { reportId: id } });
        data.progresses = { create: this.buildProgresses(dto.progresses) };
      }
      if (dto.entryExits) {
        await tx.dailyReportEntryExit.deleteMany({ where: { reportId: id } });
        data.entryExits = { create: this.buildEntryExits(dto.entryExits) };
      }
      if (dto.requests) {
        await tx.dailyReportRequest.deleteMany({ where: { reportId: id } });
        data.requests = { create: this.buildRequests(dto.requests) };
      }
      if (dto.events) {
        await tx.dailyReportEvent.deleteMany({ where: { reportId: id } });
        data.events = { create: this.buildEvents(dto.events) };
      }
      return tx.dailyReport.update({ where: { id }, data });
    });
  }

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.dailyReport.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.dailyReport.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  async approve(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'DRAFT', rejectedReason: reason },
    });
  }

  // ═══════════════ Section-level approval ═══════════════
  listSections(reportId: string) {
    return this.sections.list(reportId);
  }

  approveSection(reportId: string, sectionType: string, userId: string) {
    return this.sections.approve(reportId, sectionType, userId);
  }

  rejectSection(reportId: string, sectionType: string, reason: string) {
    return this.sections.reject(reportId, sectionType, reason);
  }

  sectionsSummary(reportId: string) {
    return this.sections.summary(reportId);
  }

  async stats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const [total, draft, submitted, approved] = await Promise.all([
      this.prisma.dailyReport.count({ where }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.dailyReport.count({ where: { ...where, status: 'APPROVED' } }),
    ]);
    return { total, draft, submitted, approved };
  }
}
