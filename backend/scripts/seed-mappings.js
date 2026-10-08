const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// code → { title, debitCode, creditCode }
const MAPPINGS = {
  SALE_CONTRACT_CASH:   { title: 'دریافت نقدی قرارداد فروش',   debitCode: '1.1.1', creditCode: '1.1.2' },
  SALE_CONTRACT_BANK:   { title: 'دریافت بانکی قرارداد فروش',  debitCode: '1.1.1', creditCode: '1.1.2' },
  SALE_INSTALLMENT_CASH:{ title: 'دریافت نقدی قسط',             debitCode: '1.1.1', creditCode: '1.1.2' },
  SALE_INSTALLMENT_BANK:{ title: 'دریافت بانکی قسط',            debitCode: '1.1.1', creditCode: '1.1.2' },
  PURCHASE_CASH:        { title: 'خرید نقدی',                   debitCode: '5.1.1', creditCode: '1.1.1' },
  PURCHASE_CREDIT:      { title: 'خرید نسیه',                   debitCode: '5.1.1', creditCode: '2.1.1' },
  PAYROLL_ACCRUAL:      { title: 'ثبت حقوق ماهانه',             debitCode: '5.2.1', creditCode: '2.1.2' },
  PAYROLL_PAYMENT:      { title: 'پرداخت حقوق',                 debitCode: '2.1.2', creditCode: '1.1.1' },
  PETTYCASH_FUND:       { title: 'تأمین تنخواه',                debitCode: '1.1.5', creditCode: '1.1.1' },
  PETTYCASH_EXPENSE:    { title: 'هزینه از تنخواه',             debitCode: '5.4.1', creditCode: '1.1.5' },
};

async function main() {
  console.log('Seeding account mappings...\n');
  let created = 0, updated = 0, skipped = 0;

  for (const [code, def] of Object.entries(MAPPINGS)) {
    const debit = await p.account.findFirst({ where: { code: def.debitCode }, select: { id: true, code: true, name: true } });
    const credit = await p.account.findFirst({ where: { code: def.creditCode }, select: { id: true, code: true, name: true } });

    if (!debit || !credit) {
      console.log('  ✗ ' + code + ' — missing account: ' + (!debit ? def.debitCode : def.creditCode));
      skipped++;
      continue;
    }

    const existing = await p.accountMapping.findUnique({ where: { code } });
    if (existing) {
      await p.accountMapping.update({
        where: { code },
        data: { title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  ↻ ' + code.padEnd(24) + ' ' + debit.code + ' → ' + credit.code);
      updated++;
    } else {
      await p.accountMapping.create({
        data: { code, title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  + ' + code.padEnd(24) + ' ' + debit.code + ' → ' + credit.code);
      created++;
    }
  }

  console.log('\n════════ SEED REPORT ════════');
  console.log('  created=' + created + ' updated=' + updated + ' skipped=' + skipped);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());