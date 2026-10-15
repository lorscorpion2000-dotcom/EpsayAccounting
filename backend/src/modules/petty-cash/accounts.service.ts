import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountDetailType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DetailAccountsService } from '../accounting/detail-accounts.service';
import { CreatePettyCashAccountDto } from './dto/create-account.dto';
import { UpdatePettyCashAccountDto } from './dto/update-account.dto';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class PettyCashAccountsService {
  constructor(
    private prisma: PrismaService,
    private detailAccounts: DetailAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'pettyCashAccount', 'code', 'PC-' + year + '-', { pad: 3 });
  }

  async findAll(query?: { holderId?: string; projectId?: string; active?: boolean }) {
    const where: any = {};
    if (query?.holderId) where.holderId = query.holderId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.active !== undefined) where.isActive = query.active;

    return this.prisma.pettyCashAccount.findMany({
      where,
      include: {
        holder: { select: { id: true, fullName: true, username: true } },
        employee: { select: { id: true, fullName: true, code: true } },
        partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { transactions: true, requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.pettyCashAccount.findUnique({
      where: { id },
      include: {
        holder: { select: { id: true, fullName: true, username: true, mobile: true } },
        employee: { select: { id: true, fullName: true, code: true } },
        partner: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { transactions: true, requests: true } },
      },
    });
    if (!account) throw new NotFoundException('حساب تنخواه یافت نشد');
    return account;
  }

  async create(dto: CreatePettyCashAccountDto) {
    const code = await this.generateCode();
    return this.prisma.$transaction(async (tx: any) => {
      const account = await tx.pettyCashAccount.create({
        data: {
          code,
          name: dto.name,
          holderId: dto.holderId || null,
          employeeId: dto.employeeId || null,
          partnerId: dto.partnerId || null,
          projectId: dto.projectId,
          ceilingPerTx: dto.ceilingPerTx ?? 200000000,
          weeklyLimit: dto.weeklyLimit ?? 300000000,
          isActive: dto.isActive ?? true,
          description: dto.description,
        },
        include: {
          holder: { select: { id: true, fullName: true } },
          employee: { select: { id: true, fullName: true, code: true } },
          partner: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      // ─── تفضیل خودکار تنخواه زیر معین 1.1.5 ───
      try {
        await this.detailAccounts.ensureDetailAccount(tx, {
          detailType: AccountDetailType.PETTY_CASH,
          entityId: account.id,
          entityName: account.name,
        });
      } catch (err) {
        console.error('[PettyCash] Failed to create detail account:', err);
      }

      return account;
    });
  }

  async update(id: string, dto: UpdatePettyCashAccountDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.holderId !== undefined) data.holderId = dto.holderId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.ceilingPerTx !== undefined) data.ceilingPerTx = dto.ceilingPerTx;
    if (dto.weeklyLimit !== undefined) data.weeklyLimit = dto.weeklyLimit;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.$transaction(async (tx: any) => {
      const account = await tx.pettyCashAccount.update({
        where: { id },
        data,
        include: {
          holder: { select: { id: true, fullName: true } },
          employee: { select: { id: true, fullName: true, code: true } },
          partner: { select: { id: true, name: true, code: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      });

      // ─── همگام‌سازی نام تفضیل ───
      if (dto.name) {
        const detail = await tx.account.findFirst({
          where: { detailType: AccountDetailType.PETTY_CASH, detailId: id },
        });
        if (detail && detail.name !== dto.name) {
          await tx.account.update({ where: { id: detail.id }, data: { name: dto.name } });
        }
      }

      // ─── همگام‌سازی isActive ───
      if (dto.isActive !== undefined) {
        const detail = await tx.account.findFirst({
          where: { detailType: AccountDetailType.PETTY_CASH, detailId: id },
        });
        if (detail && detail.isActive !== dto.isActive) {
          await tx.account.update({ where: { id: detail.id }, data: { isActive: dto.isActive } });
        }
      }

      return account;
    });
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    const txCount = await this.prisma.pettyCashTransaction.count({
      where: { accountId: id, deletedAt: null },
    });
    if (txCount > 0) {
      throw new BadRequestException('این حساب دارای تراکنش است و قابل حذف نیست');
    }
    await this.prisma.pettyCashAccount.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  /**
   * محاسبه مجموع خریدهای هفته جاری
   */
  async getWeeklyTotal(accountId: string): Promise<number> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // شنبه = 0 در ایران
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((dayOfWeek + 1) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await this.prisma.pettyCashTransaction.aggregate({
      where: {
        accountId,
        type: 'EXPENSE',
        status: { in: ['SUBMITTED', 'APPROVED'] },
        txDate: { gte: startOfWeek },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.pettyCashAccount.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.pettyCashAccount.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.pettyCashAccount.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.pettyCashAccount.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.pettyCashAccount.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new Error('رکورد یافت نشد');
    await this.prisma.pettyCashAccount.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.pettyCashAccount.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.pettyCashAccount.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }

}