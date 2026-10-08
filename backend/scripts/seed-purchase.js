/* seed-purchase.js — mapping پرداخت به تأمین‌کننده + تأیید mapping PURCHASE_CREDIT */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MAPS = {
  PURCHASE_PAYMENT: { title: 'پرداخت به تأمین‌کننده', debitCode: '2.1.1', creditCode: '1.1.1.01' },
  PURCHASE_VAT:     { title: 'مالیات خرید (VAT)',     debitCode: '2.1.3', creditCode: '2.1.1' },
};

async function ensureMapping(code, def) {
  const debit  = await p.account.findFirst({ where: { code: def.debitCode } });
  const credit = await p.account.findFirst({ where: { code: def.creditCode } });
  if (!debit || !credit) {
    console.log('  x ' + code + ' — missing ' + (!debit ? def.debitCode : def.creditCode));
    return;
  }
  const existing = await p.accountMapping.findUnique({ where: { code } });
  if (existing) {
    await p.accountMapping.update({
      where: { code },
      data: { title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
    });
    console.log('  ~ ' + code.padEnd(20) + ' ' + debit.code + ' → ' + credit.code);
  } else {
    await p.accountMapping.create({
      data: { code, title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
    });
    console.log('  + ' + code.padEnd(20) + ' ' + debit.code + ' → ' + credit.code);
  }
}

async function main() {
  console.log('=== purchase mappings ===');
  for (const [code, def] of Object.entries(MAPS)) await ensureMapping(code, def);

  const credit = await p.accountMapping.findUnique({ where: { code: 'PURCHASE_CREDIT' } });
  if (credit) {
    const d = await p.account.findUnique({ where: { id: credit.debitAccountId } });
    const c = await p.account.findUnique({ where: { id: credit.creditAccountId } });
    console.log('\nPURCHASE_CREDIT موجود: ' + d?.code + ' → ' + c?.code);
  } else {
    console.log('\n⚠ PURCHASE_CREDIT تنظیم نشده — باید دستی ساخته شود');
  }
  console.log('\n🎉 seed-purchase تمام شد');
}
main().catch(e => { console.error('X', e); process.exit(1); }).finally(() => p.$disconnect());