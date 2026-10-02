import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-report.dto';
import { UpdateDailyReportDto } from './dto/update-report.dto';

@Injectable()
export class SiteOpsService {
  constructor(private prisma: PrismaService) {}

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
        _count: { select: { workers: true, equipments: true, materials: true, progresses: true } },
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
      },
    });
    if (!r) throw new NotFoundException('گزارش روزانه یافت نشد');
    return r;
  }

  async create(dto: CreateDailyReportDto, userId: string) {
    const code = await this.generateCode(dto.projectId);
    const reportDate = new Date(dto.reportDate);

    const exists = await this.prisma.dailyReport.findFirst({
      where: { projectId: dto.projectId, reportDate },
    });
    if (exists) throw new BadRequestException('برای این پروژه در این تاریخ گزارش ثبت شده است');

    return this.prisma.dailyReport.create({
      data: {
        code,
        projectId: dto.projectId,
        reportDate,
        weather: dto.weather as any,
        tempMin: dto.tempMin,
        tempMax: dto.tempMax,
        operations: dto.operations,
        issues: dto.issues,
        incidents: dto.incidents,
        status: 'DRAFT',
        createdById: userId,
        workers: dto.workers?.length ? {
          create: dto.workers.map((w, i) => ({
            rowNumber: i + 1,
            teamName: w.teamName,
            foreman: w.foreman,
            workerCount: w.workerCount,
            workHours: w.workHours ?? 8,
            overtime: w.overtime ?? 0,
            status: (w.status as any) || 'PRESENT',
            wbsItemId: w.wbsItemId,
            description: w.description,
          })),
        } : undefined,
        equipments: dto.equipments?.length ? {
          create: dto.equipments.map((e, i) => ({
            rowNumber: i + 1,
            name: e.name,
            plateNumber: e.plateNumber,
            operator: e.operator,
            hoursWorked: e.hoursWorked ?? 0,
            status: (e.status as any) || 'ACTIVE',
            description: e.description,
          })),
        } : undefined,
        materials: dto.materials?.length ? {
          create: dto.materials.map((m, i) => ({
            rowNumber: i + 1,
            itemName: m.itemName,
            unit: m.unit,
            quantity: m.quantity,
            supplier: m.supplier,
            vehiclePlate: m.vehiclePlate,
            billNumber: m.billNumber,
            description: m.description,
          })),
        } : undefined,
        progresses: dto.progresses?.length ? {
          create: dto.progresses.map((p, i) => ({
            rowNumber: i + 1,
            wbsItemId: p.wbsItemId,
            description: p.description,
            progressPct: p.progressPct,
            notes: p.notes,
          })),
        } : undefined,
      },
      include: {
        workers: true,
        equipments: true,
        materials: true,
        progresses: true,
      },
    });
  }

  async update(id: string, dto: UpdateDailyReportDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط گزارش پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.reportDate) data.reportDate = new Date(dto.reportDate);
    if (dto.weather !== undefined) data.weather = dto.weather;
    if (dto.tempMin !== undefined) data.tempMin = dto.tempMin;
    if (dto.tempMax !== undefined) data.tempMax = dto.tempMax;
    if (dto.operations !== undefined) data.operations = dto.operations;
    if (dto.issues !== undefined) data.issues = dto.issues;
    if (dto.incidents !== undefined) data.incidents = dto.incidents;

    return this.prisma.$transaction(async (tx) => {
      if (dto.workers) {
        await tx.dailyReportWorker.deleteMany({ where: { reportId: id } });
        data.workers = { create: dto.workers.map((w, i) => ({
          rowNumber: i + 1, teamName: w.teamName, foreman: w.foreman,
          workerCount: w.workerCount, workHours: w.workHours ?? 8, overtime: w.overtime ?? 0,
          status: (w.status as any) || 'PRESENT', wbsItemId: w.wbsItemId, description: w.description,
        })) };
      }
      if (dto.equipments) {
        await tx.dailyReportEquipment.deleteMany({ where: { reportId: id } });
        data.equipments = { create: dto.equipments.map((e, i) => ({
          rowNumber: i + 1, name: e.name, plateNumber: e.plateNumber, operator: e.operator,
          hoursWorked: e.hoursWorked ?? 0, status: (e.status as any) || 'ACTIVE', description: e.description,
        })) };
      }
      if (dto.materials) {
        await tx.dailyReportMaterial.deleteMany({ where: { reportId: id } });
        data.materials = { create: dto.materials.map((m, i) => ({
          rowNumber: i + 1, itemName: m.itemName, unit: m.unit, quantity: m.quantity,
          supplier: m.supplier, vehiclePlate: m.vehiclePlate, billNumber: m.billNumber, description: m.description,
        })) };
      }
      if (dto.progresses) {
        await tx.dailyReportProgress.deleteMany({ where: { reportId: id } });
        data.progresses = { create: dto.progresses.map((p, i) => ({
          rowNumber: i + 1, wbsItemId: p.wbsItemId, description: p.description,
          progressPct: p.progressPct, notes: p.notes,
        })) };
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
