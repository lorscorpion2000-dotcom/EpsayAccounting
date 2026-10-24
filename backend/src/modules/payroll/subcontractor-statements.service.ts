import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubcontractorStatementDto } from './dto/subcontractor-statement.dto';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { resolvePartnerDetailAccount, resolveDefaultDetailAccount } from '../../shared/utils/account-detail-resolver';
import { generateCode } from '../../shared/utils/code-generator';

function errMsg(e: unknown, fallback = 'خطای نامشخص'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object' && e && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}

type JELine = {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  partnerId?: string;
  projectId?: string;
  costCenterId?: string;
};

@Injectable()
export class SubcontractorStatementsService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(projectId: string): Promise<string> {
    void projectId;
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'subcontractorStatement', 'code', 'SS-' + year + '-', { pad: 4 });
  }

  async findAll(query?: { projectId?: string; contractorId?: string; status?: string }) {
    const where: Prisma.SubcontractorStatementWhereInput = { deletedAt: null };
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.contractorId) where.contractorId = query.contractorId;
    if (query?.status) where.status = query.status as Prisma.SubcontractorStatementWhereInput['status'];
    return this.prisma.subcontractorStatement.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        contractor: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.subcontractorStatement.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        contractor: true,
        contract: {
          select: {
            id: true, code: true, kind: true, title: true,
            items: { orderBy: { rowNumber: 'asc' } },
          },
        },
        approvedBy: { select: { id: true, fullName: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    return s;
  }

  private computeTotals(dto: CreateSubcontractorStatementDto) {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const insurancePercent = dto.insurancePercent ?? 7;
    const taxPercent = dto.taxPercent ?? 3;
    const retentionPercent = dto.retentionPercent ?? 5;
    const prepaymentPercent = dto.prepaymentPercent ?? 0;
    const prepaymentDepreciation = dto.prepaymentDepreciation ?? 0;
    const otherDeduction = dto.otherDeduction ?? 0;

    const insuranceAmount = (totalAmount * insurancePercent) / 100;
    const taxAmount = (totalAmount * taxPercent) / 100;
    const retentionAmount = (totalAmount * retentionPercent) / 100;
    const prepaymentAmount = (totalAmount * prepaymentPercent) / 100;

    const totalDeduction =
      insuranceAmount +
      taxAmount +
      retentionAmount +
      prepaymentDepreciation +
      otherDeduction;

    const netPayable = totalAmount - totalDeduction;

    return {
      totalAmount,
      insuranceAmount,
      taxAmount,
      retentionAmount,
      prepaymentAmount,
      totalDeduction,
      netPayable,
    };
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

  async create(dto: CreateSubcontractorStatementDto, userId: string) {
    const code = await this.generateCode(dto.projectId);
    const totals = this.computeTotals(dto);
    const scCreateUnitMap = await this.resolveUnitIds(dto.items.map((it) => it.unit));

    return this.prisma.subcontractorStatement.create({
      data: {
        code,
        contractorId: dto.contractorId,
        contractId: dto.contractId,
        projectId: dto.projectId,
        statementNumber: dto.statementNumber,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        totalAmount: totals.totalAmount,
        prepaymentPercent: dto.prepaymentPercent ?? 0,
        prepaymentAmount: totals.prepaymentAmount,
        prepaymentDepreciation: dto.prepaymentDepreciation ?? 0,
        insurancePercent: dto.insurancePercent ?? 7,
        insuranceAmount: totals.insuranceAmount,
        taxPercent: dto.taxPercent ?? 3,
        taxAmount: totals.taxAmount,
        retentionPercent: dto.retentionPercent ?? 5,
        retentionAmount: totals.retentionAmount,
        otherDeduction: dto.otherDeduction ?? 0,
        totalDeduction: totals.totalDeduction,
        netPayable: totals.netPayable,
        description: dto.description,
        createdById: userId,
        items: {
          create: dto.items.map((item, idx) => ({
            rowNumber: idx + 1,
            wbsItemId: item.wbsItemId,
            description: item.description,
                        unitId: item.unit ? (scCreateUnitMap.get(item.unit) ?? null) : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            notes: item.notes,
          })),
        },
      },
      include: { items: { orderBy: { rowNumber: 'asc' } } },
    });
  }

  async update(id: string, dto: Partial<CreateSubcontractorStatementDto>, options?: { force?: boolean }) {
    const s = await this.findOne(id);
    const force = options?.force === true;
    if (!force && s.status !== 'DRAFT' && s.status !== 'SUBMITTED')
      throw new BadRequestException('فقط پیش‌نویس یا ارسال‌شده قابل ویرایش است. برای ویرایش صورت‌وضعیت تاییدشده، نیاز به دسترسی مدیر دارید.');

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.SubcontractorStatementUncheckedUpdateInput = {};
      if (dto.contractorId) data.contractorId = dto.contractorId;
      if (dto.contractId !== undefined) data.contractId = dto.contractId || null;
      if (dto.projectId) data.projectId = dto.projectId;
      if (dto.statementNumber) data.statementNumber = dto.statementNumber;
      if (dto.periodStart) data.periodStart = new Date(dto.periodStart);
      if (dto.periodEnd) data.periodEnd = new Date(dto.periodEnd);
      if (dto.description !== undefined) data.description = dto.description;

      if (dto.items) {
        await tx.subcontractorStatementItem.deleteMany({ where: { statementId: id } });

        const fullDto = { ...s, ...dto, items: dto.items } as unknown as CreateSubcontractorStatementDto;
        const totals = this.computeTotals(fullDto);
        const scUpdateUnitMap = await this.resolveUnitIds(dto.items.map((it) => it.unit));

        data.totalAmount = totals.totalAmount;
        data.insuranceAmount = totals.insuranceAmount;
        data.taxAmount = totals.taxAmount;
        data.retentionAmount = totals.retentionAmount;
        data.totalDeduction = totals.totalDeduction;
        data.netPayable = totals.netPayable;

        data.items = {
          create: dto.items.map((item, idx) => ({
            rowNumber: idx + 1,
            wbsItemId: item.wbsItemId,
            description: item.description,
                        unitId: item.unit ? (scUpdateUnitMap.get(item.unit) ?? null) : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            notes: item.notes,
          })),
        };
      }

      return tx.subcontractorStatement.update({
        where: { id },
        data,
        include: { items: { orderBy: { rowNumber: 'asc' } } },
      });
    });
  }

  async remove(id: string, userId?: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') {
      throw new BadRequestException('فقط پیش‌نویس قابل حذف است — برای تاییدشده از «حذف توسط مدیر» استفاده کنید');
    }
    await this.prisma.subcontractorStatement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.subcontractorStatement.findUnique({
      where: { id },
      ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
    });
    if (!existing) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    if (!existing.deletedAt) throw new Error('صورت‌وضعیت حذف نشده است');
    await this.prisma.subcontractorStatement.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: Record<string, unknown> = {}) {
    const existing = await this.prisma.subcontractorStatement.findUnique({
      where: { id },
      ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
    });
    if (!existing) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    if (existing.status !== 'DRAFT') {
      throw new Error('فقط پیش‌نویس قابل حذف قطعی است — چون تاییدشده سند حسابداری دارد');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.subcontractorStatementItem.deleteMany({ where: { statementId: id } });
      await tx.subcontractorStatement.delete({ where: { id } });
    });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.subcontractorStatement.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
      }),
      this.prisma.subcontractorStatement.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as unknown as { __withDeleted: never }),
      }),
    ]);
    return { items, total, take, skip };
  }

  async submit(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const s = await this.findOne(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    const updated = await this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });

    // ═══ سند خودکار ═══
    let journal: Awaited<ReturnType<SubcontractorStatementsService['createApprovalJE']>> | null = null;
    try {
      journal = await this.createApprovalJE(id, userId);
    } catch (e: unknown) {
      // ROLLBACK (F12/F13): تأیید بدون سند نباید باقی بماند
      await this.prisma.subcontractorStatement.update({
        where: { id },
        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },
      }).catch(() => {});
      throw new BadRequestException(
        'تأیید انجام نشد چون ثبت سند حسابداری ناموفق بود: ' + errMsg(e),
      );
    }

    return { ...updated, journal };
  }

  /**
   * ساخت JE چندخطی برای صورت‌وضعیت پیمانکار
   */
  private async createApprovalJE(statementId: string, userId: string) {
    const s = await this.findOne(statementId);

    // Idempotency: اگر سند قبلاً ساخته شده، همان را برگردان
    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'SUBCONTRACTOR_STATEMENT', sourceId: statementId },
      select: { id: true, code: true },
    });
    if (existing) return existing;

    // ═══ حساب‌های لازم ═══
    const [expAcc, payAcc, insAcc, taxAcc, retAcc] = await Promise.all([
      this.prisma.account.findUnique({ where: { code: '5.1.3' } }), // پیمانکاران جزء (هزینه)
      resolvePartnerDetailAccount(this.prisma, '2.1.5', s.contractorId, 'CREDIT', 'CONTRACTOR'),
      resolveDefaultDetailAccount(this.prisma, '2.1.4'),
      resolveDefaultDetailAccount(this.prisma, '2.1.3'),
      resolveDefaultDetailAccount(this.prisma, '2.1.7'),
    ]);

    if (!expAcc || !payAcc || !insAcc || !taxAcc || !retAcc) {
      throw new Error('حساب‌های لازم برای JE صورت‌وضعیت موجود نیستند');
    }

    const total = Number(s.totalAmount);
    const ins = Number(s.insuranceAmount);
    const tax = Number(s.taxAmount);
    const ret = Number(s.retentionAmount);
    const prepayDep = Number(s.prepaymentDepreciation || 0);
    const other = Number(s.otherDeduction || 0);
    const net = Number(s.netPayable);

    const lines: JELine[] = [];

    // Dr: هزینه
    lines.push({
      accountId: expAcc.id,
      debit: total,
      credit: 0,
      description: 'صورت‌وضعیت ' + s.code + ' — ' + (s.contractor?.name || ''),
      projectId: s.projectId ?? undefined,
      partnerId: s.contractorId,
    });

    // Cr: بدهی پیمانکار (خالص)
    if (net > 0) {
      lines.push({
        accountId: payAcc.id,
        debit: 0,
        credit: net,
        description: 'خالص قابل پرداخت',
        projectId: s.projectId ?? undefined,
        partnerId: s.contractorId,
      });
    }

    // Cr: بیمه
    if (ins > 0) {
      lines.push({
        accountId: insAcc.id,
        debit: 0,
        credit: ins,
        description: 'بیمه سهم پیمانکار (' + s.insurancePercent + '٪)',
        projectId: s.projectId ?? undefined,
      });
    }

    // Cr: مالیات
    if (tax > 0) {
      lines.push({
        accountId: taxAcc.id,
        debit: 0,
        credit: tax,
        description: 'مالیات تکلیفی (' + s.taxPercent + '٪)',
        projectId: s.projectId ?? undefined,
      });
    }

    // Cr: حسن انجام کار
    if (ret > 0) {
      lines.push({
        accountId: retAcc.id,
        debit: 0,
        credit: ret,
        description: 'حسن انجام کار (' + s.retentionPercent + '٪)',
        projectId: s.projectId ?? undefined,
      });
    }

    // Cr: پیش‌پرداخت / سایر (به بدهی پیمانکار اضافه می‌شود برای حفظ تراز)
    if (prepayDep + other > 0) {
      lines.push({
        accountId: payAcc.id,
        debit: 0,
        credit: prepayDep + other,
        description: 'کسر پیش‌پرداخت و سایر کسورات',
        projectId: s.projectId ?? undefined,
        partnerId: s.contractorId,
      });
    }

    // بررسی تراز
    const sumDr = lines.reduce((s2, l) => s2 + Number(l.debit || 0), 0);
    const sumCr = lines.reduce((s2, l) => s2 + Number(l.credit || 0), 0);
    if (Math.abs(sumDr - sumCr) > 0.01) {
      throw new Error('سند تراز نیست: Dr=' + sumDr + ' Cr=' + sumCr);
    }

    // ═══ درج JE ═══
    return this.engine.postMultiLine('SUBCONTRACTOR_STATEMENT', {
      entryDate: s.periodEnd.toISOString().slice(0, 10),
      description: 'صورت‌وضعیت پیمانکار ' + s.code + ' — ' + (s.contractor?.name || ''),
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
    return this.prisma.subcontractorStatement.update({
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
    return this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async stats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const [total, draft, submitted, approved, paid] = await Promise.all([
      this.prisma.subcontractorStatement.count({ where }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'PAID' } }),
    ]);
    return { total, draft, submitted, approved, paid };
  }
}

