import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';

@Injectable()
export class PayrollPeriodsService {
  private accountCache = new Map<string, any>();

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
    if (exists) throw new BadRequestException('دوره برای این ماه و پروژه قبلاً ساخته شده');

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
    if (p.status !== 'DRAFT') throw new BadRequestException('فقط دوره پیش‌نویس قابل حذف است');
    await this.prisma.payrollPeriod.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  // ---------------- helpers ----------------

  private r2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private async getAccountByCode(code: string) {
    if (this.accountCache.has(code)) return this.accountCache.get(code);
    const acc = await this.prisma.account.findUnique({ where: { code } });
    if (!acc) throw new BadRequestException('حساب ' + code + ' یافت نشد');
    if (!acc.isPostable || !acc.isActive) {
      throw new BadRequestException('حساب ' + code + ' قابل ثبت نیست');
    }
    this.accountCache.set(code, acc);
    return acc;
  }

  private async getEmployerInsurancePercent(entryDate: Date): Promise<number> {
    const y = entryDate.getFullYear();
    const exact = await this.prisma.payrollTaxSetting.findFirst({
      where: { year: y, isActive: true },
    });
    const setting = exact ?? (await this.prisma.payrollTaxSetting.findFirst({
      where: { isActive: true },
      orderBy: { year: 'desc' },
    }));
    return setting ? Number(setting.insuranceEmployerPercent) || 23 : 23;
  }

  private async resolvePayrollAccounts(isFieldWorker: boolean) {
    const expenseCode = isFieldWorker ? '5.1.2' : '5.2.1';
    const employerInsExpenseCode = isFieldWorker ? '5.1.9' : '5.2.4';
    return {
      expense:             await this.getAccountByCode(expenseCode),
      employerInsExpense:  await this.getAccountByCode(employerInsExpenseCode),
      insurancePayable:    await this.getAccountByCode('2.1.2.02'),
      taxPayable:          await this.getAccountByCode('2.1.2.03'),
      advanceAsset:        await this.getAccountByCode('1.1.4.02'),
      netPayable:          await this.getAccountByCode('2.1.2.01'),
    };
  }

  private buildPayrollLines(rec: any, accounts: any, erPct: number) {
    const empName   = rec.employee?.name ?? '';
    const partnerId = rec.employeeId;
    const projectId = rec.employeeProfile?.projectId || undefined;

    const gross  = this.r2(Number(rec.grossSalary));
    const empIns = this.r2(Number(rec.insuranceAmount));
    const erIns  = this.r2((gross * erPct) / 100);
    const tax    = this.r2(Number(rec.taxAmount));
    const adv    = this.r2(Number(rec.advanceAmount));
    const other  = this.r2(Number(rec.otherDeduction));

    // net را از اجزا بازمحاسبه می‌کنیم تا تعادل ۱۰۰٪ تضمین شود
    const net = this.r2(gross - empIns - tax - adv - other);

    const lines: any[] = [
      {
        accountId: accounts.expense.id,
        debit: gross,
        description: 'حقوق و دستمزد ' + empName,
        partnerId,
        projectId,
      },
      {
        accountId: accounts.employerInsExpense.id,
        debit: erIns,
        description: 'هزینه بیمه کارفرما (' + erPct + '%) - ' + empName,
        partnerId,
        projectId,
      },
      {
        accountId: accounts.insurancePayable.id,
        credit: this.r2(empIns + erIns),
        description: 'بیمه تأمین اجتماعی (7% + ' + erPct + '%) - ' + empName,
        partnerId,
      },
    ];

    if (tax > 0) {
      lines.push({
        accountId: accounts.taxPayable.id,
        credit: tax,
        description: 'مالیات حقوق - ' + empName,
        partnerId,
      });
    }

    if (adv > 0) {
      lines.push({
        accountId: accounts.advanceAsset.id,
        credit: adv,
        description: 'کسر مساعده - ' + empName,
        partnerId,
      });
    }

    if (other > 0) {
      lines.push({
        accountId: accounts.advanceAsset.id,
        credit: other,
        description: 'سایر کسورات - ' + empName,
        partnerId,
      });
    }

    lines.push({
      accountId: accounts.netPayable.id,
      credit: net,
      description: 'خالص پرداختی - ' + empName,
      partnerId,
    });

    return { lines, gross, empIns, erIns, tax, adv, other, net };
  }

  // ---------------- approve ----------------

  async approve(id: string, userId?: string) {
    const p = await this.findOne(id);
    if (p.status !== 'CALCULATED') {
      throw new BadRequestException('ابتدا محاسبه‌ی دوره باید انجام شود');
    }

    const created: Array<{ recordId: string; entryId: string; code: string }> = [];
    const erPct = await this.getEmployerInsurancePercent(p.endDate);

    for (const rec of p.records as any[]) {
      const isFieldWorker = !!rec.employeeProfile?.projectId;
      const sourceType = isFieldWorker ? 'PAYROLL_ACCRUAL_FIELD' : 'PAYROLL_ACCRUAL';

      const existing = await this.prisma.journalEntry.findFirst({
        where: { sourceType, sourceId: rec.id, deletedAt: null },
        select: { id: true, code: true },
      });
      if (existing) {
        created.push({ recordId: rec.id, entryId: existing.id, code: existing.code });
        continue;
      }

      const empName = rec.employee?.name ?? '';
      const accounts = await this.resolvePayrollAccounts(isFieldWorker);
      const built = this.buildPayrollLines(rec, accounts, erPct);

      const entry = await this.engine.postMultiLine(sourceType, {
        entryDate: p.endDate.toISOString().slice(0, 10),
        description:
          (isFieldWorker ? 'دستمزد کارگاهی ' : 'حقوق ستادی ') + empName + ' - ' + p.code,
        sourceId: rec.id,
        reference: p.code + '/' + rec.rowNumber,
        lines: built.lines,
        userId,
        autoPost: false,
      } as any);

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
    if (p.status !== 'APPROVED') throw new BadRequestException('ابتدا تأیید دوره لازم است');
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}