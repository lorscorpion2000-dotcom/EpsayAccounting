import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpenseCostType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { DetailAccountsService } from '../accounting/detail-accounts.service';
import { generateCode } from '../../shared/utils/code-generator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
    private detailAccounts: DetailAccountsService,
  ) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'expense', 'code', 'EXP-' + year + '-', { pad: 4 });
  }

  async findAll(query?: { projectId?: string; categoryId?: string; status?: string; fromDate?: string; toDate?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.expenseDate = {};
      if (query.fromDate) where.expenseDate.gte = new Date(query.fromDate);
      if (query.toDate) where.expenseDate.lte = new Date(query.toDate);
    }
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
        payFromAccount: { select: { id: true, code: true, name: true } },
        expenseAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        project: { select: { id: true, code: true, name: true } },
        wbsItem: { select: { id: true, code: true, title: true } },
        costCenter: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
        payFromAccount: { select: { id: true, code: true, name: true } },
        expenseAccount: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!e || e.deletedAt) throw new NotFoundException('هزینه یافت نشد');
    return e;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const code = await this.nextCode();
    const amount = Number(dto.amount);
    const costType = (dto.costType as any) ?? ExpenseCostType.COMPANY;
    if (costType === ExpenseCostType.CLIENT_PASS_THROUGH && !dto.clientId) {
      throw new BadRequestException('برای هزینه کارفرما، انتخاب کارفرما الزامی است');
    }
    const taxAmount = Number(dto.taxAmount || 0);
    const totalAmount = amount + taxAmount;
    if (totalAmount <= 0) throw new BadRequestException('مبلغ باید بیشتر از صفر باشد');

    return this.prisma.expense.create({
      data: {
        code,
        expenseDate: new Date(dto.expenseDate),
        categoryId: dto.categoryId,
        projectId: dto.projectId ?? null,
        wbsItemId: dto.wbsItemId ?? null,
        costCenterId: dto.costCenterId ?? null,
        supplierId: dto.supplierId ?? null,
        clientId: dto.clientId ?? null,
        costType: (dto.costType as any) ?? ExpenseCostType.COMPANY,
        amount, taxAmount, totalAmount,
        description: dto.description,
        payFromType: dto.payFromType,
        payFromAccountId: dto.payFromAccountId,
        expenseAccountId: dto.expenseAccountId,
        attachmentUrl: dto.attachmentUrl ?? null,
        invoiceNumber: dto.invoiceNumber ?? null,
        notes: dto.notes ?? null,
        createdById: userId,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const e = await this.findOne(id);
    if (e.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.expenseDate) data.expenseDate = new Date(dto.expenseDate);
    if (dto.categoryId) data.categoryId = dto.categoryId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId || null;
    if (dto.wbsItemId !== undefined) data.wbsItemId = dto.wbsItemId || null;
    if (dto.costCenterId !== undefined) data.costCenterId = dto.costCenterId || null;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId || null;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.payFromType) data.payFromType = dto.payFromType;
    if (dto.payFromAccountId) data.payFromAccountId = dto.payFromAccountId;
    if (dto.expenseAccountId) data.expenseAccountId = dto.expenseAccountId;
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl || null;
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber || null;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    if (dto.amount !== undefined || dto.taxAmount !== undefined) {
      const amount = Number(dto.amount ?? e.amount);
      const taxAmount = Number(dto.taxAmount ?? e.taxAmount);
      data.amount = amount;
      data.taxAmount = taxAmount;
      data.totalAmount = amount + taxAmount;
    }

    return this.prisma.expense.update({ where: { id }, data, include: { category: true } });
  }

  async remove(id: string, userId?: string) {
    const e = await this.findOne(id);
    if (e.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.expense.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('هزینه یافت نشد');
    if (!existing.deletedAt) throw new Error('هزینه حذف نشده است');
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.expense.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('هزینه یافت نشد');
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.expense.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }

  async submit(id: string) {
    const e = await this.findOne(id);
    if (e.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.expense.update({ where: { id }, data: { status: 'SUBMITTED' } });
  }

  async approve(id: string, userId: string) {
    const e = await this.findOne(id);
    if (e.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تأیید است');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });

    // F15: build JE + post + set journalEntryId
    let journal: any = null;
    try {
      journal = await this.createJE(id, userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.notification.create({
        data: {
          type: 'JE_FAILED',
          severity: 'CRITICAL',
          title: 'خطا در سند خودکار هزینه',
          message: 'برای هزینه ' + id + ': ' + msg,
          entity: 'Expense',
          entityId: id,
        },
      }).catch(() => {});
    }

    return { ...updated, journal };
  }

  async reject(id: string, reason: string, userId: string) {
    const e = await this.findOne(id);
    if (e.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        rejectedById: userId,
        rejectedAt: new Date(),
      },
    });
  }

  async cancel(id: string) {
    const e = await this.findOne(id);
    if (e.status === 'POSTED') throw new BadRequestException('ثبت‌شده قابل لغو نیست');
    return this.prisma.expense.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  private async createJE(expenseId: string, userId: string) {
    const e = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { supplier: { select: { name: true } }, category: true, client: { select: { name: true } } },
    });
    if (!e) throw new NotFoundException('هزینه یافت نشد');

    // idempotency
    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'EXPENSE', sourceId: expenseId },
      select: { id: true, code: true },
    });
    if (existing) return existing;

    const amount = Number(e.amount);
    const tax = Number(e.taxAmount);
    const total = Number(e.totalAmount);

    // ═══════════════════════════════════════════════════════
    // CLIENT_PASS_THROUGH: کارفرما بدهکار، تأمین‌کننده بستانکار
    // هیچ جابجایی نقدی رخ نمی‌دهد.
    // ═══════════════════════════════════════════════════════
    if ((e as any).costType === 'CLIENT_PASS_THROUGH') {
      if (!(e as any).clientId) {
        throw new Error('برای هزینه کارفرما، انتخاب کارفرما الزامی است');
      }

      // حساب واسط پاس‌تروگ اختصاصی کارفرما (زیر 1.1.6)
      const passThroughAcc = await this.detailAccounts.ensureDetailAccount(this.prisma, {
        detailType: 'PASS_THROUGH_CLIENT' as any,
        entityId: (e as any).clientId,
        entityName: (e as any).client?.name || 'کارفرما',
      });
      if (!passThroughAcc) throw new Error('حساب واسط پاس‌تروگ برای کارفرما ساخته نشد');

      // حساب تفصیلی تأمین‌کننده (SUPPLIER)
      let creditAccId: string | null = null;
      if (e.supplierId) {
        const supAcc = await this.detailAccounts.ensureDetailAccount(this.prisma, {
          detailType: 'SUPPLIER' as any,
          entityId: e.supplierId,
          entityName: e.supplier?.name || 'تأمین‌کننده',
        });
        if (!supAcc) throw new Error('حساب تفصیلی تأمین‌کننده ساخته نشد');
        creditAccId = supAcc.id;
      } else {
        // اگر تأمین‌کننده ندارد، از حساب پرداختنی تجاری استفاده کن
        const fallback = await this.prisma.account.findFirst({
          where: { code: '2.1.1.01', isPostable: true, isActive: true },
        });
        if (!fallback) throw new Error('حساب پرداختنی تجاری (2.1.1.01) پیدا نشد');
        creditAccId = fallback.id;
      }

      const lines: any[] = [
        {
          accountId: passThroughAcc.id,
          debit: total,
          credit: 0,
          description: 'هزینه کارفرما ' + e.code + ' — ' + e.category.name,
          projectId: e.projectId ?? undefined,
          partnerId: (e as any).clientId,
        },
        {
          accountId: creditAccId,
          debit: 0,
          credit: total,
          description: 'بستانکاری ' + (e.supplier?.name || 'طرف حساب') + ' — ' + e.code,
          projectId: e.projectId ?? undefined,
          partnerId: e.supplierId ?? undefined,
        },
      ];

      const je = await this.engine.postMultiLine('EXPENSE_CLIENT_PASS_THROUGH', {
        entryDate: e.expenseDate.toISOString().slice(0, 10),
        description: 'هزینه کارفرما ' + e.code + (e.client?.name ? ' — ' + e.client.name : ''),
        reference: e.code,
        sourceId: expenseId,
        lines,
        userId,
      });

      await this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'POSTED', journalEntryId: je.id },
      });
      return je;
    }

    // ═══════════════════════════════════════════════════════
    // COMPANY (پیش‌فرض): سند عادی هزینه با پرداخت نقدی
    // ═══════════════════════════════════════════════════════
    if (!e.payFromAccountId) {
      throw new Error('برای هزینه شرکت، انتخاب حساب پرداخت الزامی است');
    }

    // VAT account
    let vatAcc: any = null;
    if (tax > 0) {
      vatAcc = await this.prisma.account.findFirst({
        where: { code: '2.1.3.01', isPostable: true, isActive: true },
      });
      if (!vatAcc) {
        const m = await this.prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_VAT' } });
        if (m?.debitAccountId) vatAcc = await this.prisma.account.findUnique({ where: { id: m.debitAccountId } });
      }
      if (!vatAcc) throw new Error('حساب مالیات خرید (2.1.3.01) پیدا نشد');
    }

    const lines: any[] = [
      {
        accountId: e.expenseAccountId,
        debit: amount,
        credit: 0,
        description: 'هزینه ' + e.code + ' — ' + e.category.name,
        projectId: e.projectId ?? undefined,
        partnerId: e.supplierId ?? undefined,
      },
    ];
    if (tax > 0) {
      lines.push({ accountId: vatAcc.id, debit: tax, credit: 0, description: 'مالیات خرید' });
    }
    lines.push({
      accountId: e.payFromAccountId,
      debit: 0,
      credit: total,
      description: 'پرداخت هزینه ' + e.code,
      projectId: e.projectId ?? undefined,
      partnerId: e.supplierId ?? undefined,
    });

    const je = await this.engine.postMultiLine('EXPENSE', {
      entryDate: e.expenseDate.toISOString().slice(0, 10),
      description: 'هزینه ' + e.code + (e.supplier?.name ? ' — ' + e.supplier.name : ''),
      reference: e.code,
      sourceId: expenseId,
      lines,
      userId,
    });

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'POSTED', journalEntryId: je.id },
    });
    return je;
  }

  async stats(projectId?: string) {
    const where: any = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    const [total, draft, submitted, approved, posted, agg] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.expense.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.expense.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.expense.count({ where: { ...where, status: 'POSTED' } }),
      this.prisma.expense.aggregate({ where: { ...where, status: { in: ['APPROVED', 'POSTED'] } }, _sum: { totalAmount: true } }),
    ]);
    return { total, draft, submitted, approved, posted, totalAmount: Number(agg._sum.totalAmount || 0) };
  }
}
