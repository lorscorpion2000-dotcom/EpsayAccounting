const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MAPS = {
  SALES_INVOICE_REVENUE: { title: 'درآمد فروش واحدها',  debitCode: '1.1.2', creditCode: '4.2.1' },
  SALES_VAT:             { title: 'مالیات فروش (VAT)',  debitCode: '1.1.2', creditCode: '2.1.3' },
  SALES_RECEIPT:         { title: 'دریافت از مشتری',     debitCode: '1.1.1', creditCode: '1.1.2' },
};

async function ensure(code, def) {
  const debit  = await p.account.findFirst({ where: { code: def.debitCode } });
  const credit = await p.account.findFirst({ where: { code: def.creditCode } });
  if (!debit || !credit) { console.log('  x ' + code + ' — missing'); return; }
  const ex = await p.accountMapping.findUnique({ where: { code } });
  if (ex) {
    await p.accountMapping.update({ where: { code }, data: { title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true } });
    console.log('  ~ ' + code.padEnd(24) + ' ' + debit.code + ' → ' + credit.code);
  } else {
    await p.accountMapping.create({ data: { code, title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true } });
    console.log('  + ' + code.padEnd(24) + ' ' + debit.code + ' → ' + credit.code);
  }
}

async function main() {
  console.log('=== sales mappings ===');
  for (const [code, def] of Object.entries(MAPS)) await ensure(code, def);
  console.log('\n🎉 seed-sales تمام شد');
}
main().catch(e => { console.error('X', e); process.exit(1); }).finally(() => p.$disconnect());