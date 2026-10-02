import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePettyCashRequestDto } from './dto/create-request.dto';

@Injectable()
export class PettyCashRequestsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.pettyCashRequest.count();
    return 'PCR-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { accountId?: string; status?: string }) {
    const where: any = {};
    if (query?.accountId) where.accountId = query.accountId;
    if (query?.status) where.status = query.status;

    return this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        account: {
          select: {
            id: true, code: true, name: true,
            holder: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.pettyCashRequest.findUnique({
      where: { id },
      include: {
        account: {
          include: {
            holder: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('درخواست یافت نشد');
    return req;
  }

  async create(dto: CreatePettyCashRequestDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.pettyCashRequest.create({
      data: {
        accountId: dto.accountId,
        code,
        requestDate: new Date(dto.requestDate),
        amount: dto.amount,
        currentBalance: dto.currentBalance,
        reason: dto.reason,
        iban: dto.iban,
        createdById: userId,
      },
      include: {
        account: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async approve(id: string, approverId: string) {
    const req = await this.findOne(id);
    if (req.status !== 'PENDING') {
      throw new BadRequestException('فقط درخواست‌های در انتظار قابل تایید هستند');
    }
    return this.prisma.pettyCashRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, reason: string) {
    const req = await this.findOne(id);
    if (req.status !== 'PENDING') {
      throw new BadRequestException('فقط درخواست‌های در انتظار قابل رد هستند');
    }
    return this.prisma.pettyCashRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reason: req.reason + ' | دلیل رد: ' + reason,
      },
    });
  }

  async markPaid(id: string, sourceAccountId: string, userId?: string) {
    const req = await this.findOne(id);
    if (req.status !== 'APPROVED') {
      throw new BadRequestException('فقط درخواست تأییدشده قابل پرداخت است');
    }
    if (!sourceAccountId) {
      throw new BadRequestException('حساب مبدأ (بانک/صندوق) الزامی است');
    }

    // ۱) حساب مبدأ
    const sourceAccount = await this.prisma.account.findUnique({
      where: { id: sourceAccountId },
    });
    if (!sourceAccount) throw new BadRequestException('حساب مبدأ پیدا نشد');
    if (!sourceAccount.isPostable) {
      throw new BadRequestException('حساب مبدأ باید قابل استفاده در سند باشد');
    }

    // ۲) حساب معین تنخواه — از PettyCashAccount.accountId
    const pettyAccount = await this.prisma.pettyCashAccount.findUnique({
      where: { id: req.accountId },
      include: { account: true },
    });
    if (!pettyAccount) throw new BadRequestException('تنخواه پیدا نشد');

    let pettyLedgerAccountId = pettyAccount.accountId;
    // اگر حساب معین ندارد اولین تفصیلی/معین زیر 1.1.5 را بگیر
    if (!pettyLedgerAccountId) {
      const fallback = await this.prisma.account.findFirst({
        where: {
          OR: [
            { code: { startsWith: '1.1.5' }, isPostable: true },
            { code: { startsWith: '1.1.5' } },
          ],
        },
        orderBy: { code: 'asc' },
      });
      if (!fallback) {
        throw new BadRequestException('حساب تنخواه گردانها (1.1.5) در کدینگ پیدا نشد — ابتدا آن را بسازید');
      }
      pettyLedgerAccountId = fallback.id;
      await this.prisma.pettyCashAccount.update({
        where: { id: pettyAccount.id },
        data: { accountId: pettyLedgerAccountId },
      });
    }

    // ۳) سال مالی جاری
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { isCurrent: true, status: 'OPEN' },
    });
    if (!fy) {
      throw new BadRequestException('هیچ سال مالی جاری فعالی وجود ندارد');
    }

    return this.prisma.$transaction(async (tx) => {
      // ۴) کد سند حسابداری
      const year = new Date().getFullYear();
      const jePrefix = 'JE-PC-' + year + '-';
      const lastJe = await tx.journalEntry.findFirst({
        where: { code: { startsWith: jePrefix } },
        orderBy: { code: 'desc' },
        select: { code: true, entryNumber: true },
      });
      const lastNum = lastJe ? parseInt(lastJe.code.slice(jePrefix.length), 10) : 0;
      const entryNumber = lastJe ? lastJe.entryNumber + 1 : 1;
      const jeCode = jePrefix + String(lastNum + 1).padStart(4, '0');

      // ۵) ساخت سند دوبل
      const amount = Number(req.amount);
      const journalEntry = await tx.journalEntry.create({
        data: {
          code: jeCode,
          entryNumber,
          entryDate: new Date(),
          fiscalYearId: fy.id,
          description: 'شارژ تنخواه — ' + req.code + ' (' + pettyAccount.name + ')',
          reference: req.code,
          status: 'POSTED',
          sourceType: 'PETTY_CASH_CHARGE',
          sourceId: req.id,
          totalDebit: amount,
          totalCredit: amount,
          createdById: userId || null,
          lines: {
            create: [
              {
                accountId: pettyLedgerAccountId,
                description: 'شارژ تنخواه ' + pettyAccount.name,
                debit: amount,
                credit: 0,
              },
              {
                accountId: sourceAccountId,
                description: 'پرداخت برای ' + pettyAccount.name,
                debit: 0,
                credit: amount,
              },
            ],
          },
        },
      });

      // ۶) کد تراکنش تنخواه
      const txPrefix = 'PCF-' + year + '-';
      const lastTx = await tx.pettyCashTransaction.findFirst({
        where: { code: { startsWith: txPrefix } },
        orderBy: { code: 'desc' },
        select: { code: true },
      });
      const txLastNum = lastTx ? parseInt(lastTx.code.slice(txPrefix.length), 10) : 0;
      const txCode = txPrefix + String(txLastNum + 1).padStart(4, '0');

      // ۷) تراکنش تنخواه
      await tx.pettyCashTransaction.create({
        data: {
          accountId: req.accountId,
          code: txCode,
          type: 'FUNDING',
          status: 'APPROVED',
          txDate: new Date(),
          amount,
          description: 'شارژ تنخواه از ' + sourceAccount.name + ' — ' + req.code,
          approvedById: userId || null,
          approvedAt: new Date(),
          createdById: userId || null,
          journalEntryId: journalEntry.id,
        },
      });

      // ۸) افزایش موجودی تنخواه
      await tx.pettyCashAccount.update({
        where: { id: req.accountId },
        data: { balance: { increment: amount } },
      });

      // ۹) علامتگذاری درخواست
      return tx.pettyCashRequest.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    });
  }

  // تولید کد تراکنش
  private async generateTxCode(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PT-' + year + '-';
    const last = await tx.pettyCashTransaction.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = last ? parseInt(last.code.slice(prefix.length), 10) : 0;
    return prefix + String(lastNum + 1).padStart(4, '0');
  }
}
