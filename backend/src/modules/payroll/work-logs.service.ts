import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWorkLogDto } from './dto/work-log.dto';

@Injectable()
export class WorkLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    employeeId?: string;
    projectId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: Prisma.DailyWorkLogWhereInput = {};
    if (query?.employeeId) where.employeeId = query.employeeId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.fromDate || query?.toDate) {
      where.workDate = {};
      if (query.fromDate) where.workDate.gte = new Date(query.fromDate);
      if (query.toDate) where.workDate.lte = new Date(query.toDate);
    }
    return this.prisma.dailyWorkLog.findMany({
      where,
      include: {
        employee: { select: { id: true, code: true, name: true } },
      },
      orderBy: { workDate: 'desc' },
      take: 1000,
    });
  }

  async findOne(id: string) {
    const w = await this.prisma.dailyWorkLog.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!w) throw new NotFoundException('کارکرد یافت نشد');
    return w;
  }

  async create(dto: CreateWorkLogDto, userId: string) {
    return this.prisma.dailyWorkLog.create({
      data: {
        employeeId: dto.employeeId,
        workDate: new Date(dto.workDate),
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        regularHours: dto.regularHours ?? 0,
        overtimeHours: dto.overtimeHours ?? 0,
        holidayHours: dto.holidayHours ?? 0,
        description: dto.description,
        status: (dto.status as Prisma.DailyWorkLogUncheckedCreateInput['status']) || 'PRESENT',
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: Partial<CreateWorkLogDto>) {
    await this.findOne(id);
    const data: Prisma.DailyWorkLogUncheckedUpdateInput = {};
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.wbsItemId !== undefined) data.wbsItemId = dto.wbsItemId;
    if (dto.regularHours !== undefined) data.regularHours = dto.regularHours;
    if (dto.overtimeHours !== undefined) data.overtimeHours = dto.overtimeHours;
    if (dto.holidayHours !== undefined) data.holidayHours = dto.holidayHours;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status as Prisma.DailyWorkLogUncheckedUpdateInput['status'];
    return this.prisma.dailyWorkLog.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.dailyWorkLog.delete({ where: { id } });
    return { success: true };
  }

  /**
   * جمع کارکرد یک پرسنل در یک بازه
   */
  async summary(employeeId: string, fromDate: string, toDate: string) {
    const logs = await this.prisma.dailyWorkLog.findMany({
      where: {
        employeeId,
        workDate: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });

    return logs.reduce(
      (acc, log) => ({
        totalRegularHours: acc.totalRegularHours + Number(log.regularHours),
        totalOvertimeHours: acc.totalOvertimeHours + Number(log.overtimeHours),
        totalHolidayHours: acc.totalHolidayHours + Number(log.holidayHours),
        daysWorked: acc.daysWorked + 1,
      }),
      { totalRegularHours: 0, totalOvertimeHours: 0, totalHolidayHours: 0, daysWorked: 0 },
    );
  }
}
