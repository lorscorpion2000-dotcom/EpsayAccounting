import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';

@Injectable()
export class FiscalYearsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.fiscalYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findCurrent() {
    return this.prisma.fiscalYear.findFirst({
      where: { isCurrent: true, status: 'OPEN' },
    });
  }

  async findOne(id: string) {
    const fy = await this.prisma.fiscalYear.findUnique({ where: { id } });
    if (!fy) throw new NotFoundException('سال مالی یافت نشد');
    return fy;
  }

  async create(dto: CreateFiscalYearDto) {
    if (dto.isCurrent) {
      await this.prisma.fiscalYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return this.prisma.fiscalYear.create({
      data: {
        code: dto.code,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async setCurrent(id: string) {
    const fy = await this.findOne(id);
    if (fy.status !== 'OPEN') {
      throw new BadRequestException('فقط سال مالی باز می‌تواند جاری شود');
    }
    await this.prisma.fiscalYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { isCurrent: true },
    });
  }

  async update(id: string, dto: Partial<CreateFiscalYearDto>) {
    await this.findOne(id);
    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    return this.prisma.fiscalYear.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.journalEntry.count({ where: { fiscalYearId: id } });
    if (count > 0) {
      throw new BadRequestException('این سال مالی اسناد دارد و قابل حذف نیست — می‌توانید ببندید');
    }
    return this.prisma.fiscalYear.delete({ where: { id } });
  }

  async close(id: string) {
    const fy = await this.findOne(id);
    if (fy.status === 'CLOSED') {
      throw new BadRequestException('این سال مالی قبلاً بسته شده است');
    }

    // بررسی عدم وجود اسناد DRAFT
    const draftCount = await this.prisma.journalEntry.count({
      where: { fiscalYearId: id, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      throw new BadRequestException('ابتدا ' + draftCount + ' سند پیش‌نویس را ثبت یا ابطال کنید');
    }

    await this.prisma.fiscalYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'CLOSED', isCurrent: false },
    });
  }

  async reopen(id: string) {
    const fy = await this.findOne(id);
    if (fy.status !== 'CLOSED') {
      throw new BadRequestException('این سال مالی بسته نیست');
    }
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'OPEN' },
    });
  }

  async summary(id: string) {
    const fy = await this.findOne(id);
    const [totalEntries, draftCount, postedCount, reversedCount] = await Promise.all([
      this.prisma.journalEntry.count({ where: { fiscalYearId: id } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'DRAFT' } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'POSTED' } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'REVERSED' } }),
    ]);
    return { totalEntries, draftCount, postedCount, reversedCount };
  }

  // ═══════════════════════════════════════════════════════════════
  // سند اختتامیه — بستن حسابهای موقت به سود و زیان انباشته
  // ═══════════════════════════════════════════════════════════════
  async generateClosingEntry(id: string, userId?: string) {
    const fy = await this.findOne(id);

    // پیدا کردن حساب سود و زیان انباشته (کد شروع میشود با 3.3)
    const retainedAccount = await this.prisma.account.findFirst({
      where: { code: { startsWith: '3.3' }, isPostable: true },
    });
    if (!retainedAccount) {
      throw new BadRequestException('حساب «سود و زیان انباشته» (3.3) در کدینگ پیدا نشد');
    }

    // محاسبه مانده حسابهای موقت (درآمد 4.x و هزینه 5.x)
    const lines = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: { fiscalYearId: id, status: { in: ['POSTED', 'REVERSED'] } },
      },
      _sum: { debit: true, credit: true },
    });

    // فیلتر کردن حسابهای موقت
    const accountIds = lines.map((l) => l.accountId);
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    const closingLines: any[] = [];
    let totalIncome = 0;   // مانده بستانکار درآمدها
    let totalExpense = 0;  // مانده بدهکار هزینهها

    for (const l of lines) {
      const acc = accountById.get(l.accountId);
      if (!acc) continue;
      const firstDigit = acc.code.charAt(0);
      if (firstDigit !== '4' && firstDigit !== '5') continue; // فقط موقت

      const debit = Number(l._sum.debit || 0);
      const credit = Number(l._sum.credit || 0);
      const balance = debit - credit;

      if (firstDigit === '4') {
        // درآمد — مانده بستانکار (balance منفی)
        if (balance < 0) {
          const amount = Math.abs(balance);
          totalIncome += amount;
          // برای بستن درآمد بستانکار: بدهکار میشود
          closingLines.push({
            accountId: acc.id,
            description: 'بستن حساب درآمد ' + acc.name,
            debit: amount,
            credit: 0,
          });
        }
      } else {
        // هزینه — مانده بدهکار (balance مثبت)
        if (balance > 0) {
          totalExpense += balance;
          // برای بستن هزینه: بستانکار میشود
          closingLines.push({
            accountId: acc.id,
            description: 'بستن حساب هزینه ' + acc.name,
            debit: 0,
            credit: balance,
          });
        }
      }
    }

    if (closingLines.length === 0) {
      throw new BadRequestException('حساب درآمد یا هزینهای با مانده برای بستن یافت نشد');
    }

    // انتقال سود یا زیان به حساب انباشته
    const netIncome = totalIncome - totalExpense;
    if (netIncome > 0) {
      // سود → بستانکار حساب انباشته
      closingLines.push({
        accountId: retainedAccount.id,
        description: 'انتقال سود دوره',
        debit: 0,
        credit: netIncome,
      });
    } else if (netIncome < 0) {
      // زیان → بدهکار حساب انباشته
      closingLines.push({
        accountId: retainedAccount.id,
        description: 'انتقال زیان دوره',
        debit: Math.abs(netIncome),
        credit: 0,
      });
    }

    // ساخت سند
    const totalDebit = closingLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = closingLines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('عدم توازن در محاسبه: بدهکار ' + totalDebit + ' ≠ بستانکار ' + totalCredit);
    }

    // شماره سند
    const fyCounter = await this.prisma.fiscalYear.update({
      where: { id },
      data: { nextEntryNumber: { increment: 1 } },
      select: { nextEntryNumber: true },
    });
    const entryNumber = fyCounter.nextEntryNumber - 1;
    const code = 'JE-CL-' + fy.code + '-' + String(entryNumber).padStart(4, '0');

    return this.prisma.journalEntry.create({
      data: {
        code,
        entryNumber,
        entryDate: fy.endDate,
        fiscalYearId: id,
        description: 'سند اختتامیه سال مالی ' + fy.name,
        reference: 'CLOSING-' + fy.code,
        status: 'DRAFT',
        sourceType: 'FISCAL_CLOSING',
        sourceId: id,
        totalDebit,
        totalCredit,
        createdById: userId,
        lines: { create: closingLines },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // سند افتتاحیه — انتقال مانده حسابهای دائمی به سال جدید
  // ═══════════════════════════════════════════════════════════════
  async generateOpeningEntry(id: string, userId?: string) {
    const currentFy = await this.findOne(id);

    // سال مالی قبلی (بسته یا جاری نیست)
    const prevFy = await this.prisma.fiscalYear.findFirst({
      where: {
        endDate: { lt: currentFy.startDate },
        id: { not: id },
      },
      orderBy: { endDate: 'desc' },
    });

    if (!prevFy) {
      throw new BadRequestException('سال مالی قبلی پیدا نشد — این اولین سال است');
    }

    // محاسبه مانده حسابهای دائمی (1.x, 2.x, 3.x) از سال قبل
    const lines = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: { fiscalYearId: prevFy.id, status: { in: ['POSTED', 'REVERSED'] } },
      },
      _sum: { debit: true, credit: true },
    });

    const accountIds = lines.map((l) => l.accountId);
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    const openingLines: any[] = [];
    for (const l of lines) {
      const acc = accountById.get(l.accountId);
      if (!acc) continue;
      const firstDigit = acc.code.charAt(0);
      if (firstDigit === '4' || firstDigit === '5') continue; // موقت را رد کن

      const debit = Number(l._sum.debit || 0);
      const credit = Number(l._sum.credit || 0);
      const balance = debit - credit;
      if (Math.abs(balance) < 0.01) continue;

      openingLines.push({
        accountId: acc.id,
        description: 'مانده ابتدای دوره از ' + prevFy.name,
        debit: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
      });
    }

    if (openingLines.length === 0) {
      throw new BadRequestException('هیچ ماندهای از سال قبل برای انتقال یافت نشد');
    }

    const totalDebit = openingLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = openingLines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('عدم توازن افتتاحیه: بدهکار ' + totalDebit + ' ≠ بستانکار ' + totalCredit);
    }

    const fyCounter = await this.prisma.fiscalYear.update({
      where: { id },
      data: { nextEntryNumber: { increment: 1 } },
      select: { nextEntryNumber: true },
    });
    const entryNumber = fyCounter.nextEntryNumber - 1;
    const code = 'JE-OP-' + currentFy.code + '-' + String(entryNumber).padStart(4, '0');

    return this.prisma.journalEntry.create({
      data: {
        code,
        entryNumber,
        entryDate: currentFy.startDate,
        fiscalYearId: id,
        description: 'سند افتتاحیه سال مالی ' + currentFy.name,
        reference: 'OPENING-' + currentFy.code,
        status: 'DRAFT',
        sourceType: 'FISCAL_OPENING',
        sourceId: id,
        totalDebit,
        totalCredit,
        createdById: userId,
        lines: { create: openingLines },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }

  async getLockedMonths(id: string): Promise<string[]> {
    const fy = await this.findOne(id);
    return (fy.lockedMonths as string[]) || [];
  }

  async lockMonth(id: string, monthKey: string) {
    const fy = await this.findOne(id);
    const locked: string[] = (fy.lockedMonths as string[]) || [];
    if (locked.includes(monthKey)) {
      throw new BadRequestException("PERIOD_ALREADY_LOCKED");
    }
    locked.push(monthKey);
    locked.sort();
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { lockedMonths: locked },
    });
  }

  async unlockMonth(id: string, monthKey: string) {
    const fy = await this.findOne(id);
    const locked: string[] = (fy.lockedMonths as string[]) || [];
    const idx = locked.indexOf(monthKey);
    if (idx < 0) {
      throw new BadRequestException("PERIOD_NOT_LOCKED");
    }
    locked.splice(idx, 1);
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { lockedMonths: locked },
    });
  }

}
