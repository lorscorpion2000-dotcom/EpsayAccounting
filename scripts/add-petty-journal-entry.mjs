import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) SCHEMA — افزودن accountId به PettyCashAccount
//    و journalEntryId به PettyCashTransaction
// ═══════════════════════════════════════════════════════════════
const schemaPath = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(schemaPath, 'utf8');
let schemaChanged = 0;

// 1.a) PettyCashAccount.accountId
if (!s.includes('pcAccountId')) {
  // anchor: holderId line in PettyCashAccount
  const oldPC = /(model PettyCashAccount \{[\s\S]*?)(holderId String\? @map\("holder_id"\) @db\.Uuid)/;
  const match = s.match(oldPC);
  if (match && !match[1].includes('accountId')) {
    s = s.replace(match[0], match[1] + match[2] + `\n\n  accountId String?  @map("account_id") @db.Uuid // حساب معین تنخواه در کدینگ\n  account   Account? @relation("PettyCashAccountLink", fields: [accountId], references: [id])`);
    schemaChanged++;
    console.log('✅ PettyCashAccount.accountId');
  }
}

// 1.b) Account — reverse relation
if (!s.includes('pettyCashLinkedAccounts')) {
  const accountRegex = /(model Account \{[\s\S]*?)(journalLines JournalLine\[\])/;
  const am = s.match(accountRegex);
  if (am) {
    s = s.replace(am[0], am[1] + am[2] + `\n  pettyCashLinkedAccounts PettyCashAccount[] @relation("PettyCashAccountLink")`);
    schemaChanged++;
    console.log('✅ Account.pettyCashLinkedAccounts');
  }
}

// 1.c) PettyCashTransaction.journalEntryId
if (!s.includes('journalEntryId String?')) {
  const oldTx = /(model PettyCashTransaction \{[\s\S]*?)(createdById String\? @map\("created_by_id"\) @db\.Uuid)/;
  const tm = s.match(oldTx);
  if (tm) {
    s = s.replace(tm[0], tm[1] + tm[2] + `\n\n  journalEntryId String?       @map("journal_entry_id") @db.Uuid // سند حسابداری مرتبط\n  journalEntry   JournalEntry? @relation("PettyCashTxJournal", fields: [journalEntryId], references: [id])`);
    schemaChanged++;
    console.log('✅ PettyCashTransaction.journalEntryId');
  }
}

// 1.d) JournalEntry — reverse relation
if (!s.includes('pettyCashTxes')) {
  const jeRegex = /(model JournalEntry \{[\s\S]*?)(createdById\s+String\?\s+@map\("created_by_id"\) @db\.Uuid)/;
  const jm = s.match(jeRegex);
  if (jm) {
    s = s.replace(jm[0], jm[1] + jm[2] + `\n  pettyCashTxes PettyCashTransaction[] @relation("PettyCashTxJournal")`);
    schemaChanged++;
    console.log('✅ JournalEntry.pettyCashTxes');
  }
}

if (schemaChanged) {
  fs.writeFileSync(schemaPath, s, 'utf8');
  console.log('✅ schema.prisma ذخیره شد');
}

// ═══════════════════════════════════════════════════════════════
// 2) requests.service.ts — markPaid با سند دوبل
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/petty-cash/requests.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
fs.writeFileSync(svcPath + '.bak-journal', svc, 'utf8');

// جایگزینی markPaid
const oldMarkPaid = svc.match(/async markPaid\([^)]*\)[\s\S]*?\n  \}/);

if (oldMarkPaid) {
  const newMarkPaid = `async markPaid(id: string, sourceAccountId: string, userId?: string) {
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
          description: 'شار تنخواه — ' + req.code + ' (' + pettyAccount.name + ')',
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
                description: 'شار تنخواه ' + pettyAccount.name,
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
          description: 'شار تنخواه از ' + sourceAccount.name + ' — ' + req.code,
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
  }`;

  svc = svc.replace(oldMarkPaid[0], newMarkPaid);
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('✅ markPaid با سند دوبل بازنویسی شد');
} else {
  console.log('❌ markPaid پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 3) requests.controller.ts — افزودن sourceAccountId
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/modules/petty-cash/requests.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

const payRegex = /@Patch\(':id\/pay'\)[\s\S]*?\n  \}/;
const payMatch = ctrl.match(payRegex);

if (payMatch) {
  const newPay = `@Patch(':id/pay')
  pay(
    @Param('id') id: string,
    @Body() body: { sourceAccountId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markPaid(id, body.sourceAccountId, userId);
  }`;
  ctrl = ctrl.replace(payMatch[0], newPay);
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('✅ controller pay بهروز شد');
}

console.log('');
console.log('=== DONE ===');