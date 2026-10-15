import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePettyCashTransactionDto } from './dto/create-transaction.dto';
import { UpdatePettyCashTransactionDto } from './dto/update-transaction.dto';
import { PettyCashAccountsService } from './accounts.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class PettyCashTransactionsService {
  constructor(
    private prisma: PrismaService,
    private accountsService: PettyCashAccountsService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === 'FUNDING' ? 'PCF' :
                   type === 'EXPENSE' ? 'PCE' :
                   type === 'SETTLEMENT' ? 'PCS' : 'PCA';
    return generateCode(this.prisma, 'pettyCashTransaction', 'code', prefix + '-' + year + '-', { pad: 4 });
  }

  async findAll(query?: {
    accountId?: string;
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {};
    if (query?.accountId) where.accountId = query.accountId;
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.txDate = {};
      if (query.fromDate) where.txDate.gte = new Date(query.fromDate);
      if (query.toDate) where.txDate.lte = new Date(query.toDate);
    }

    return this.prisma.pettyCashTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ txDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const tx = await this.prisma.pettyCashTransaction.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            holder: { select: { id: true, fullName: true } },
          },
        },
        project: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!tx) throw new NotFoundException('تراکنش یافت نشد');
    return tx;
  }

  /**
   * اعتبارسنجی قوانین تنخواه
   */
  private async validateTransaction(
    accountId: string,
    type: string,
    amount: number,
  ): Promise<void> {
    const account = await this.accountsService.findOne(accountId);

    if (!account.isActive) {
      throw new BadRequestException('حساب تنخواه غیرفعال است');
    }

    if (type === 'EXPENSE') {
      // بررسی سقف هر خرید
      if (amount > Number(account.ceilingPerTx)) {
        throw new BadRequestException(
          `مبلغ خرید (${amount.toLocaleString()}) از سقف هر خرید (${Number(account.ceilingPerTx).toLocaleString()}) بیشتر است`,
        );
      }

      // بررسی سقف هفتگی
      const weeklyTotal = await this.accountsService.getWeeklyTotal(accountId);
      if (weeklyTotal + amount > Number(account.weeklyLimit)) {
        throw new BadRequestException(
          `مجموع خریدهای هفته (${(weeklyTotal + amount).toLocaleString()}) از سقف هفتگی (${Number(account.weeklyLimit).toLocaleString()}) بیشتر می‌شود`,
        );
      }

      // بررسی موجودی کافی
      if (Number(account.balance) < amount) {
        throw new BadRequestException(
          `موجودی تنخواه کافی نیست. موجودی فعلی: ${Number(account.balance).toLocaleString()} ریال`,
        );
      }
    }

    if (type === 'FUNDING' && amount <= 0) {
      throw new BadRequestException('مبلغ شارژ باید مثبت باشد');
    }
  }

  async create(dto: CreatePettyCashTransactionDto, userId?: string) {
    await this.validateTransaction(dto.accountId, dto.type, dto.amount);

    const code = await this.generateCode(dto.type);

    // تراکنش در یک transaction دیتابیس
    return this.prisma.$transaction(async (prisma) => {
      const tx = await prisma.pettyCashTransaction.create({
        data: {
          accountId: dto.accountId,
          code,
          type: dto.type as any,
          status: 'DRAFT',
          txDate: new Date(dto.txDate),
          amount: dto.amount,
          description: dto.description,
          recipient: dto.recipient,
          category: dto.category,
          invoiceNumber: dto.invoiceNumber,
          invoiceImage: dto.invoiceImage,
          projectId: dto.projectId,
          wbsItemId: dto.wbsItemId,
          partnerId: dto.partnerId,
          createdById: userId,
        },
        include: {
          account: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      // به‌روزرسانی موجودی
      const delta = dto.type === 'EXPENSE' ? -dto.amount : dto.amount;
      await prisma.pettyCashAccount.update({
        where: { id: dto.accountId },
        data: { balance: { increment: delta } },
      });

      return tx;
    });
  }

  async update(id: string, dto: UpdatePettyCashTransactionDto) {
    const existing = await this.findOne(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('فقط تراکنش‌های پیش‌نویس قابل ویرایش هستند');
    }

    const data: any = {};
    if (dto.txDate) data.txDate = new Date(dto.txDate);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.recipient !== undefined) data.recipient = dto.recipient;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.invoiceNumber !== undefined) data.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceImage !== undefined) data.invoiceImage = dto.invoiceImage;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.wbsItemId !== undefined) data.wbsItemId = dto.wbsItemId;
    if (dto.partnerId !== undefined) data.partnerId = dto.partnerId;

    // اگر مبلغ تغییر کرده
    if (dto.amount !== undefined && dto.amount !== Number(existing.amount)) {
      const newAmount: number = dto.amount;
      await this.validateTransaction(existing.accountId, existing.type, newAmount);
      data.amount = newAmount;

      return this.prisma.$transaction(async (prisma) => {
        // برگرداندن موجودی قبلی
        const oldDelta = existing.type === 'EXPENSE' ? Number(existing.amount) : -Number(existing.amount);
        await prisma.pettyCashAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: oldDelta } },
        });

        // اعمال مبلغ جدید
        const newDelta = existing.type === 'EXPENSE' ? -newAmount : newAmount;
        await prisma.pettyCashAccount.update({
          where: { id: existing.accountId },
          data: { balance: { increment: newDelta } },
        });

        return prisma.pettyCashTransaction.update({
          where: { id },
          data,
          include: {
            account: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
          },
        });
      });
    }

    return this.prisma.pettyCashTransaction.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async remove(id: string, userId?: string) {
    const tx = await this.findOne(id);
    if (tx.status !== 'DRAFT') {
      throw new BadRequestException('فقط تراکنش‌های پیش‌نویس قابل حذف هستند');
    }

    return this.prisma.$transaction(async (prisma) => {
      // برگرداندن موجودی
      const delta = tx.type === 'EXPENSE' ? Number(tx.amount) : -Number(tx.amount);
      await prisma.pettyCashAccount.update({
        where: { id: tx.accountId },
        data: { balance: { increment: delta } },
      });

      await prisma.pettyCashTransaction.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: userId ?? null },
      });
      return { success: true, softDeleted: true };
    });
  }

  async submit(id: string) {
    const tx = await this.findOne(id);
    if (tx.status !== 'DRAFT') {
      throw new BadRequestException('فقط تراکنش‌های پیش‌نویس قابل ارسال هستند');
    }
    return this.prisma.pettyCashTransaction.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, approverId: string, sourceAccountId?: string) {
    const tx = await this.findOne(id);
    if (tx.status !== 'SUBMITTED') {
      throw new BadRequestException('فقط تراکنش‌های ارسال‌شده قابل تایید هستند');
    }
    if (tx.journalEntryId) {
      throw new BadRequestException('این تراکنش قبلاً سند حسابداری دارد');
    }

    const approved = await this.prisma.pettyCashTransaction.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    const mappingCode =
      tx.type === 'FUNDING'
        ? 'PETTYCASH_FUND'
        : tx.type === 'EXPENSE'
          ? 'PETTYCASH_EXPENSE'
          : null;

    if (!mappingCode) {
      // SETTLEMENT / ADJUSTMENT فعلاً mapping حسابداری ندارن
      return approved;
    }

    try {
      const entry = await this.engine.postEvent(mappingCode, {
        amount: Number(tx.amount),
        entryDate: tx.txDate,
        description: tx.description,
        reference: tx.code,
        partnerId: tx.partnerId ?? undefined,
        projectId: tx.projectId ?? undefined,
        pettyCashId: tx.accountId,
        sourceId: tx.id,
        userId: approverId,
        bankAccountId: sourceAccountId || undefined,
        autoPost: true,
      });

      return this.prisma.pettyCashTransaction.update({
        where: { id },
        data: { journalEntryId: entry.id },
      });
    } catch (e) {
      // rollback به SUBMITTED تا کاربر بتونه دوباره تلاش کنه
      await this.prisma.pettyCashTransaction.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          approvedById: null,
          approvedAt: null,
        },
      });
      throw e;
    }
  }

  async reject(id: string, reason: string) {
    const tx = await this.findOne(id);
    if (tx.status !== 'SUBMITTED') {
      throw new BadRequestException('فقط تراکنش‌های ارسال‌شده قابل رد هستند');
    }
    return this.prisma.pettyCashTransaction.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });
  }

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.pettyCashTransaction.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.pettyCashTransaction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.pettyCashTransaction.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.pettyCashTransaction.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.pettyCashTransaction.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('رکورد یافت نشد');
    await this.prisma.pettyCashTransaction.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.pettyCashTransaction.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.pettyCashTransaction.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }

}
