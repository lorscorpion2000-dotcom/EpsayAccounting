import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PayrollTaxService } from './payroll-tax.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { resolvePartnerDetailAccount, resolveDefaultDetailAccount } from '../../shared/utils/account-detail-resolver';
import { generateCode } from '../../shared/utils/code-generator';
import {
  CreateWorkerStatementDto,
  PreviewWorkerStatementDto,
} from './dto/worker-statement.dto';

@Injectable()
export class WorkerStatementsService {
  constructor(
    private prisma: PrismaService,
    private taxService: PayrollTaxService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'workerStatement', 'code', 'WS-' + year + '-', { pad: 4 });
  }

  async findAll(query?: { projectId?: string; partnerId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.status) where.status = query.status;
    return this.prisma.workerStatement.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, code: true, title: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.workerStatement.findUnique({
      where: { id },
      include: {
        partner: true,
        project: { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, code: true, title: true, kind: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    return s;
  }

  /**
   * پیش‌نمایش: محاسبه‌ی خودکار از Attendance/WorkLog + آیتم‌های قرارداد
   */
  async preview(dto: PreviewWorkerStatementDto) {
    const partner = await this.prisma.partner.findUnique({ where: { id: dto.partnerId } });
    if (!partner) throw new NotFoundException('پرسنل یافت نشد');

    const start = new Date(dto.periodStart);
    const end = new Date(dto.periodEnd);

    // ─── جمع حضور و کارکرد ───
    const [attendances, workLogs] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { employeeId: dto.partnerId, attendanceDate: { gte: start, lte: end } },
      }),
      this.prisma.dailyWorkLog.findMany({
        where: { employeeId: dto.partnerId, workDate: { gte: start, lte: end } },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId: dto.partnerId,
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
        },
      }),
    ]);

    let workDays = 0;
    let overtimeHours = 0;
    let holidayHours = 0;
    let absentDays = 0;
    let leaveDays = 0;

    attendances.forEach((a) => {
      if (a.status === 'PRESENT') workDays++;
      if (a.status === 'ABSENT') absentDays++;
      if (a.status === 'LEAVE') leaveDays++;
      overtimeHours += Number(a.overtimeHours);
    });

    workLogs.forEach((w) => {
      overtimeHours += Number(w.overtimeHours);
      holidayHours += Number(w.holidayHours);
    });

    // ─── آیتم‌های قرارداد (اگر انتخاب شده) ───
    let contractItems: any[] = [];
    let contract: any = null;
    if (dto.contractId) {
      contract = await this.prisma.legalContract.findUnique({
        where: { id: dto.contractId },
        include: { items: { orderBy: { rowNumber: 'asc' } } },
      });
      if (!contract) throw new NotFoundException('قرارداد یافت نشد');
      contractItems = contract.items;
    }

    // ─── ساخت آیتم‌ها با مقادیر پیش‌فرض ───
    // مقادیر پیش‌فرض:
    // - ردیف‌هایی که با "روز" یا واحد روز مشخص شده → تعداد = workDays
    // - ردیف‌های ساعتی → = overtimeHours (برای اضافه‌کار)
    const items = contractItems.map((it) => {
      let qty = 0;
      const desc = (it.description || '').toLowerCase();
      const unit = (it.unit || '').toLowerCase();

      if (desc.includes('اضافه') || desc.includes('اضافه‌کار')) {
        qty = overtimeHours;
      } else if (desc.includes('تعطیل')) {
        qty = holidayHours;
      } else if (unit.includes('روز') || unit.includes('day')) {
        qty = workDays;
      } else if (unit.includes('ساعت') || unit.includes('hour')) {
        qty = workDays * 8; // ۸ ساعت در روز فرض
      } else {
        qty = 1;
      }

      return {
        description: it.description,
        unit: it.unit || '',
        quantity: qty,
        unitPrice: Number(it.unitPrice),
        totalPrice: qty * Number(it.unitPrice),
        contractItemId: it.id,
        notes: it.notes || '',
      };
    });

    const totalEarnings = items.reduce((s, it) => s + it.totalPrice, 0);

    // ─── بیمه ───
    const insPercent = await this.getInsurancePercent();
    const insuranceAmount = (totalEarnings * insPercent) / 100;

    // ─── مالیات (پله‌ای) ───
    // پایه‌ی مالیات = حقوق پس از کسر بیمه‌ی کارگر
    const taxableBase = totalEarnings - insuranceAmount;
    const taxResult = await this.taxService.calculateTax(taxableBase);

    const totalDeductions = insuranceAmount + taxResult.taxAmount;
    const netPayable = totalEarnings - totalDeductions;

    return {
      partner,
      contract,
      period: {
        start: dto.periodStart,
        end: dto.periodEnd,
      },
      summary: {
        workDays,
        overtimeHours,
        holidayHours,
        absentDays,
        leaveDays,
      },
      items,
      totals: {
        totalEarnings,
        insurancePercent: insPercent,
        insuranceAmount,
        taxableBase,
        taxAmount: taxResult.taxAmount,
        taxDetails: taxResult.details,
        totalDeductions,
        netPayable,
      },
    };
  }

  private async getInsurancePercent(): Promise<number> {
    try {
      const active = await this.taxService.getActive();
      return Number(active.insuranceEmployeePercent) || 7;
    } catch {
      return 7;
    }
  }


  private async resolveUnitIds(codes: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
    if (unique.length === 0) return new Map();
    const units = await this.prisma.unit.findMany({
      where: { OR: [{ code: { in: unique } }, { name: { in: unique } }, { symbol: { in: unique } }] },
      select: { id: true, code: true, name: true, symbol: true },
    });
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.code && unique.includes(u.code)) map.set(u.code, u.id);
      if (u.name && unique.includes(u.name)) map.set(u.name, u.id);
      if (u.symbol && unique.includes(u.symbol)) map.set(u.symbol, u.id);
    }
    return map;
  }

  async create(dto: CreateWorkerStatementDto, userId: string) {
    const code = await this.generateCode();

    // محاسبه‌ی مقادیر
    const totalEarnings = dto.items.reduce(
      (s, it) => s + Number(it.quantity) * Number(it.unitPrice),
      0,
    );
    const insPercent = dto.insurancePercent ?? await this.getInsurancePercent();
    const insuranceAmount = (totalEarnings * insPercent) / 100;
    const taxableBase = totalEarnings - insuranceAmount;
    const taxResult = await this.taxService.calculateTax(taxableBase);

    const totalDeductions = insuranceAmount + taxResult.taxAmount;
    const netPayable = totalEarnings - totalDeductions;

    // محاسبه‌ی خلاصه کارکرد از Attendance
    const start = new Date(dto.periodStart);
    const end = new Date(dto.periodEnd);
    const attendances = await this.prisma.attendance.findMany({
      where: { employeeId: dto.partnerId, attendanceDate: { gte: start, lte: end } },
    });
    const workLogs = await this.prisma.dailyWorkLog.findMany({
      where: { employeeId: dto.partnerId, workDate: { gte: start, lte: end } },
    });

    let workDays = 0, absentDays = 0, leaveDays = 0, overtimeHours = 0, holidayHours = 0;
    attendances.forEach((a) => {
      if (a.status === 'PRESENT') workDays++;
      if (a.status === 'ABSENT') absentDays++;
      if (a.status === 'LEAVE') leaveDays++;
      overtimeHours += Number(a.overtimeHours);
    });
    workLogs.forEach((w) => {
      overtimeHours += Number(w.overtimeHours);
      holidayHours += Number(w.holidayHours);
    });

    const wsCreateUnitMap = await this.resolveUnitIds(dto.items.map((it) => it.unit));
    return this.prisma.workerStatement.create({
      data: {
        code,
        partnerId: dto.partnerId,
        contractId: dto.contractId,
        projectId: dto.projectId,
        statementNumber: dto.statementNumber,
        periodStart: start,
        periodEnd: end,
        totalEarnings,
        insurancePercent: insPercent,
        totalInsurance: insuranceAmount,
        totalTax: taxResult.taxAmount,
        totalDeductions,
        netPayable,
        workDays,
        overtimeHours,
        holidayHours,
        absentDays,
        leaveDays,
        description: dto.description,
        createdById: userId,
        items: {
          create: dto.items.map((it, idx) => ({
            rowNumber: idx + 1,
            description: it.description,
            unit: it.unit,
            unitId: it.unit ? (wsCreateUnitMap.get(it.unit) ?? null) : null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: Number(it.quantity) * Number(it.unitPrice),
            contractItemId: it.contractItemId,
            notes: it.notes,
          })),
        },
      },
      include: { items: { orderBy: { rowNumber: 'asc' } } },
    });
  }

  async update(id: string, dto: Partial<CreateWorkerStatementDto>) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.contractId !== undefined) data.contractId = dto.contractId || null;
      if (dto.projectId !== undefined) data.projectId = dto.projectId || null;
      if (dto.statementNumber !== undefined) data.statementNumber = dto.statementNumber;
      if (dto.periodStart) data.periodStart = new Date(dto.periodStart);
      if (dto.periodEnd) data.periodEnd = new Date(dto.periodEnd);
      if (dto.description !== undefined) data.description = dto.description;

      if (dto.items) {
        await tx.workerStatementItem.deleteMany({ where: { statementId: id } });

        const wsUpdateUnitMap = await this.resolveUnitIds(dto.items.map((it) => it.unit));
        const totalEarnings = dto.items.reduce(
          (s2, it) => s2 + Number(it.quantity) * Number(it.unitPrice),
          0,
        );
        const insPercent = dto.insurancePercent ?? Number(s.insurancePercent);
        const insuranceAmount = (totalEarnings * insPercent) / 100;
        const taxableBase = totalEarnings - insuranceAmount;
        const taxResult = await this.taxService.calculateTax(taxableBase);
        const totalDeductions = insuranceAmount + taxResult.taxAmount;

        data.totalEarnings = totalEarnings;
        data.insurancePercent = insPercent;
        data.totalInsurance = insuranceAmount;
        data.totalTax = taxResult.taxAmount;
        data.totalDeductions = totalDeductions;
        data.netPayable = totalEarnings - totalDeductions;

        data.items = {
          create: dto.items.map((it, idx) => ({
            rowNumber: idx + 1,
            description: it.description,
            unit: it.unit,
            unitId: it.unit ? (wsUpdateUnitMap.get(it.unit) ?? null) : null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: Number(it.quantity) * Number(it.unitPrice),
            contractItemId: it.contractItemId,
            notes: it.notes,
          })),
        };
      }

      return tx.workerStatement.update({
        where: { id },
        data,
        include: { items: { orderBy: { rowNumber: 'asc' } } },
      });
    });
  }

  async remove(id: string, userId?: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.workerStatement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async submit(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.workerStatement.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const s = await this.findOne(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    const updated = await this.prisma.workerStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });

    // ═══ سند خودکار ═══
    let journal: any = null;
    try {
      journal = await this.createApprovalJE(id, userId);
    } catch (e: any) {
      console.error('[WorkerStatement] JE failed:', e?.message);
    }

    return { ...updated, journal };
  }

  /**
   * ساخت JE چندخطی برای صورت‌وضعیت پرسنل
   * Dr: حقوق و دستمزد (5.2.x)
   * Cr: بدهی پرسنلی (2.1.2)
   * Cr: بیمه تأمین اجتماعی (2.1.4)
   * Cr: مالیات و عوارض (2.1.3)
   */
  private async createApprovalJE(statementId: string, userId: string) {
    const s: any = await this.findOne(statementId);

    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'WORKER_STATEMENT', sourceId: statementId },
      select: { id: true, code: true },
    });
    if (existing) return existing;

    // پیدا کردن حساب‌ها
    const salaryAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '5.2.1' },
          { code: { startsWith: '5.2.' }, isPostable: true, isActive: true },
        ],
      },
      orderBy: { code: 'asc' },
    });
    const payAcc = await resolvePartnerDetailAccount(this.prisma, '2.1.2', s.partnerId, 'CREDIT', 'EMPLOYEE');
    const insAcc = await resolveDefaultDetailAccount(this.prisma, '2.1.4');
    const taxAcc = await resolveDefaultDetailAccount(this.prisma, '2.1.3');

    if (!salaryAcc || !payAcc || !insAcc || !taxAcc) {
      throw new Error('حساب‌های لازم برای JE صورت‌وضعیت پرسنل موجود نیستند');
    }

    const total = Number(s.totalEarnings);
    const ins = Number(s.totalInsurance);
    const tax = Number(s.totalTax);
    const net = Number(s.netPayable);

    const lines: any[] = [];

    lines.push({
      accountId: salaryAcc.id,
      debit: total,
      credit: 0,
      description: 'صورت‌وضعیت پرسنل ' + s.code + ' — ' + (s.partner?.name || ''),
      projectId: s.projectId,
      partnerId: s.partnerId,
    });

    if (net > 0) {
      lines.push({
        accountId: payAcc.id,
        debit: 0,
        credit: net,
        description: 'خالص قابل پرداخت به پرسنل',
        projectId: s.projectId,
        partnerId: s.partnerId,
      });
    }
    if (ins > 0) {
      lines.push({
        accountId: insAcc.id,
        debit: 0,
        credit: ins,
        description: 'بیمه سهم کارگر (' + s.insurancePercent + '٪)',
        projectId: s.projectId,
      });
    }
    if (tax > 0) {
      lines.push({
        accountId: taxAcc.id,
        debit: 0,
        credit: tax,
        description: 'مالیات حقوق',
        projectId: s.projectId,
      });
    }

    const sumDr = lines.reduce((x, l) => x + Number(l.debit || 0), 0);
    const sumCr = lines.reduce((x, l) => x + Number(l.credit || 0), 0);
    if (Math.abs(sumDr - sumCr) > 0.01) {
      // اگر تراز نشد، تفاضل را به بدهی پرسنلی می‌زنیم (معمولاً گردکردن)
      const diff = sumDr - sumCr;
      const payLine = lines.find((l) => l.accountId === payAcc.id);
      if (payLine) payLine.credit = Number(payLine.credit || 0) + diff;
    }

    return this.engine.postMultiLine('WORKER_STATEMENT', {
      entryDate: s.periodEnd.toISOString().slice(0, 10),
      description: 'صورت‌وضعیت پرسنل ' + s.code + ' — ' + (s.partner?.name || ''),
      reference: s.code,
      sourceId: statementId,
      lines,
      userId,
    });
  }

  async reject(id: string, reason: string) {
    const s = await this.findOne(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    const existingDesc = (s as { description?: string | null }).description || '';
    return this.prisma.workerStatement.update({
      where: { id },
      data: {
        status: 'DRAFT',
        description: existingDesc ? existingDesc + ' | رد: ' + reason : 'رد: ' + reason,
      },
    });
  }

  async markPaid(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'APPROVED') throw new BadRequestException('ابتدا تایید شود');
    return this.prisma.workerStatement.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async stats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const [total, draft, submitted, approved, paid] = await Promise.all([
      this.prisma.workerStatement.count({ where }),
      this.prisma.workerStatement.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.workerStatement.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.workerStatement.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.workerStatement.count({ where: { ...where, status: 'PAID' } }),
    ]);
    return { total, draft, submitted, approved, paid };
  }
}
