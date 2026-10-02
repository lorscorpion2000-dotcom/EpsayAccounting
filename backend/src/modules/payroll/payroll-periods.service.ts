import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';

@Injectable()
export class PayrollPeriodsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(year: number, month: number): Promise<string> {
    return 'PRD-' + year + '-' + String(month).padStart(2, '0');
  }

  async findAll(query?: { year?: number; status?: string; projectId?: string }) {
    const where: any = {};
    if (query?.year) where.year = query.year;
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.projectId = query.projectId;
    return this.prisma.payrollPeriod.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { records: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        records: {
          include: {
            employee: { select: { id: true, code: true, name: true } },
            employeeProfile: true,
          },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!p) throw new NotFoundException('دوره حقوق یافت نشد');
    return p;
  }

  async create(dto: CreatePayrollPeriodDto, userId: string) {
    const code = await this.generateCode(dto.year, dto.month);
    const exists = await this.prisma.payrollPeriod.findFirst({
      where: { year: dto.year, month: dto.month, projectId: dto.projectId || null },
    });
    if (exists) throw new BadRequestException('برای این ماه و پروژه قبلاً دوره ایجاد شده است');

    return this.prisma.payrollPeriod.create({
      data: {
        code,
        title: dto.title,
        year: dto.year,
        month: dto.month,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        projectId: dto.projectId,
        createdById: userId,
      },
    });
  }

  async remove(id: string) {
    const p = await this.findOne(id);
    if (p.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.payrollPeriod.delete({ where: { id } });
    return { success: true };
  }

  async approve(id: string) {
    const p = await this.findOne(id);
    if (p.status !== 'CALCULATED') {
      throw new BadRequestException('ابتدا محاسبه حقوق را انجام دهید');
    }
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async markPaid(id: string) {
    const p = await this.findOne(id);
    if (p.status !== 'APPROVED') throw new BadRequestException('ابتدا تایید شود');
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
