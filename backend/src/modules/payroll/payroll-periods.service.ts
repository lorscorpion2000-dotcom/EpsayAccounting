import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';

@Injectable()
export class PayrollPeriodsService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(year: number, month: number): Promise<string> {
    return 'PRD-' + year + '-' + String(month).padStart(2, '0');
  }

  async findAll(query?: { year?: number; status?: string; projectId?: string }) {
    const where: any = { deletedAt: null };
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

  async remove(id: string, userId?: string) {
    const p = await this.findOne(id);
    if (p.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.payrollPeriod.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async approve(id: string, userId?: string) {
    const p = await this.findOne(id);
    if (p.status !== 'CALCULATED') {
      throw new BadRequestException('ابتدا محاسبه حقوق را انجام دهید');
    }

    // ─── accrual JE per record (idempotent via JournalEntry lookup) ───
    const created: Array<{ recordId: string; entryId: string; code: string }> = [];
    for (const rec of p.records as any[]) {
      const existing = await this.prisma.journalEntry.findFirst({
        where: { sourceType: 'PAYROLL_ACCRUAL', sourceId: rec.id },
        select: { id: true, code: true },
      });
      if (existing) {
        created.push({ recordId: rec.id, entryId: existing.id, code: existing.code });
        continue;
      }

      const empName = rec.employee?.name ?? '';
      // اگر پرسنل به پروژه اختصاص دارد → حقوق کارگاهی، وگرنه ستادی
      const isFieldWorker = !!rec.employeeProfile?.projectId;
      const mappingCode = isFieldWorker ? 'PAYROLL_ACCRUAL_FIELD' : 'PAYROLL_ACCRUAL';
      const entry = await this.engine.postEvent(mappingCode, {
        amount: Number(rec.netSalary),
        entryDate: p.endDate,
        description: (isFieldWorker ? 'دستمزد کارگاهی ' : 'حقوق ستادی ') + empName + ' - ' + p.code,
        partnerId: rec.employeeId,
        projectId: rec.employeeProfile?.projectId || undefined,
        sourceId: rec.id,
        reference: p.code + '/' + rec.rowNumber,
        userId,
      });
      created.push({ recordId: rec.id, entryId: entry.id, code: entry.code });
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    return { ...updated, journalEntries: created };
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
