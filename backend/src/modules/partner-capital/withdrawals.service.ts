import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CapitalAccountsService } from './accounts.service';
import { CreateWithdrawalDto, UpdateWithdrawalDto } from './dto/withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private accounts: CapitalAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.partnerCapitalWithdrawal.count();
    return 'WDR-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;

    return this.prisma.partnerCapitalWithdrawal.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const w = await this.prisma.partnerCapitalWithdrawal.findUnique({
      where: { id },
      include: { partner: true, account: true },
    });
    if (!w) throw new NotFoundException('برداشت یافت نشد');
    return w;
  }

  async create(dto: CreateWithdrawalDto, userId: string) {
    const code = await this.generateCode();

    return this.prisma.partnerCapitalWithdrawal.create({
      data: {
        code,
        accountId: dto.accountId,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        amount: dto.amount,
        withdrawalDate: new Date(dto.withdrawalDate),
        reason: dto.reason,
        targetProjectId: dto.targetProjectId,
        transferToContribution: dto.transferToContribution ?? false,
        status: 'DRAFT',
        createdById: userId,
      },
      include: { partner: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateWithdrawalDto) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: {
        amount: dto.amount,
        withdrawalDate: new Date(dto.withdrawalDate),
        reason: dto.reason,
        targetProjectId: dto.targetProjectId,
        transferToContribution: dto.transferToContribution,
      },
    });
  }

  async remove(id: string, userId?: string) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.partnerCapitalWithdrawal.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('برداشت یافت نشد');
    if (!existing.deletedAt) throw new Error('برداشت حذف نشده است');
    await this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.partnerCapitalWithdrawal.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('برداشت یافت نشد');
    if (existing.status !== 'DRAFT') {
      throw new Error('فقط برداشت‌های پیش‌نویس قابل حذف قطعی هستند — چون تأییدشده موجودی حساب را تغییر داده');
    }
    await this.prisma.partnerCapitalWithdrawal.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.partnerCapitalWithdrawal.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.partnerCapitalWithdrawal.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }

  async submit(id: string) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const w = await this.findOne(id);
    if (w.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    return this.prisma.$transaction(async (tx) => {
      // برداشت از موجودی حساب
      await tx.partnerCapitalAccount.update({
        where: { id: w.accountId },
        data: { balance: { decrement: w.amount } },
      });

      // اگر انتقال به پروژه دیگر باشد
      if (w.transferToContribution && w.targetProjectId) {
        const targetAcc = await this.accounts.findOrCreate(w.partnerId, w.targetProjectId);
        const year = new Date().getFullYear();
        const count = await tx.partnerCapitalContribution.count();

        await tx.partnerCapitalContribution.create({
          data: {
            code: 'CON-' + year + '-' + String(count + 1).padStart(4, '0'),
            accountId: targetAcc.id,
            partnerId: w.partnerId,
            projectId: w.targetProjectId,
            type: 'CASH',
            category: 'CASH_DEPOSIT',
            amount: w.amount,
            contributionDate: new Date(),
            description: 'انتقال از پروژه دیگر (برداشت ' + w.code + ')',
            referenceCode: w.code,
            status: 'APPROVED',
            approvedById: userId,
            approvedAt: new Date(),
          },
        });

        await tx.partnerCapitalAccount.update({
          where: { id: targetAcc.id },
          data: { balance: { increment: w.amount } },
        });
      }

      return tx.partnerCapitalWithdrawal.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
    });
  }

  async reject(id: string, reason: string) {
    const w = await this.findOne(id);
    if (w.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { status: 'CANCELLED', rejectedReason: reason },
    });
  }
}
