import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Backend Service — سند اختتامیه و افتتاحیه
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/accounting/fiscal-years.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

if (!svc.includes('async generateClosingEntry')) {
  const methods = `
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
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { fiscalYearId: id },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    const entryNumber = (lastEntry?.entryNumber || 0) + 1;
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

    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { fiscalYearId: id },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    const entryNumber = (lastEntry?.entryNumber || 0) + 1;
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
`;

  const lastBrace = svc.lastIndexOf('}');
  svc = svc.slice(0, lastBrace) + methods + svc.slice(lastBrace);
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('OK fiscal-years.service.ts');
} else {
  console.log('SKIP service (already)');
}

// ═══════════════════════════════════════════════════════════════
// 2) Backend Controller — endpointها
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/modules/accounting/fiscal-years.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

// اضافه کردن CurrentUser import اگر نیست
if (!ctrl.includes("CurrentUser")) {
  ctrl = ctrl.replace(
    "import { RequirePermissions } from '../../common/decorators/permissions.decorator';",
    "import { RequirePermissions } from '../../common/decorators/permissions.decorator';\nimport { CurrentUser } from '../../common/decorators/current-user.decorator';"
  );
}

if (!ctrl.includes('generate-closing')) {
  const newEndpoints = `
  @Patch(':id/generate-closing')
  @RequirePermissions('accounting.update')
  generateClosing(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateClosingEntry(id, userId);
  }

  @Patch(':id/generate-opening')
  @RequirePermissions('accounting.update')
  generateOpening(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateOpeningEntry(id, userId);
  }
`;
  const lastBrace = ctrl.lastIndexOf('}');
  ctrl = ctrl.slice(0, lastBrace) + newEndpoints + ctrl.slice(lastBrace);
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('OK fiscal-years.controller.ts');
} else {
  console.log('SKIP controller (already)');
}

// ═══════════════════════════════════════════════════════════════
// 3) Frontend API
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/accounting/services/accounting.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('generate-closing')) {
  const anchor = `    summary: async (id: string) => {
      const { data } = await api.get('/fiscal-years/' + id + '/summary');
      return data;
    },`;
  if (api.includes(anchor)) {
    api = api.replace(anchor, anchor + `
    generateClosing: async (id: string) => {
      const { data } = await api.patch('/fiscal-years/' + id + '/generate-closing');
      return data;
    },
    generateOpening: async (id: string) => {
      const { data } = await api.patch('/fiscal-years/' + id + '/generate-opening');
      return data;
    },`);
    fs.writeFileSync(apiPath, api, 'utf8');
    console.log('OK accounting.api.ts');
  } else {
    console.log('!! api anchor not found');
  }
} else {
  console.log('SKIP api (already)');
}

console.log('');
console.log('=== DONE ===');