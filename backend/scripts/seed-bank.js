const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function ensureAccount({ code, name, parentCode, nature, isPostable = true }) {
  const exists = await p.account.findFirst({ where: { code } });
  if (exists) {
    console.log('  = ' + code + ' ' + name);
    return exists;
  }
  const parent = await p.account.findFirst({ where: { code: parentCode } });
  if (!parent) {
    console.log('  x ' + code + ' -- parent ' + parentCode + ' not found');
    return null;
  }
  const acc = await p.account.create({
    data: {
      code, name,
      parentId: parent.id,
      level: parent.level,
      nature,
      isPostable,
      isActive: true,
    },
  });
  console.log('  + ' + code + ' ' + name);
  return acc;
}

const NEW_MAPPINGS = {
  CHEQUE_ISSUED_PENDING:    { title: 'ثبت چک صادره (تعهد)',  debitCode: '2.1.5', creditCode: '2.1.6' },
  CHEQUE_PASSED:            { title: 'وصول چک صادره',         debitCode: '2.1.6', creditCode: '1.1.1' },
  CHEQUE_RETURNED:          { title: 'برگشت چک صادره',         debitCode: '2.1.6', creditCode: '2.1.5' },
  CHEQUE_CANCELLED:         { title: 'ابطال چک صادره',         debitCode: '2.1.6', creditCode: '2.1.5' },
  CHEQUE_RECEIVED:          { title: 'ثبت چک دریافتی',         debitCode: '1.1.6', creditCode: '1.1.2' },
  CHEQUE_COLLECTED:         { title: 'وصول چک دریافتی',        debitCode: '1.1.1', creditCode: '1.1.6' },
  CHEQUE_RECEIVED_RETURNED: { title: 'برگشت چک دریافتی',       debitCode: '1.1.2', creditCode: '1.1.6' },
};

async function main() {
  console.log('=== ensuring new accounts ===');
  await ensureAccount({ code: '1.1.6', name: 'اسناد دریافتنی', parentCode: '1.1', nature: 'DEBIT' });
  await ensureAccount({ code: '2.1.6', name: 'اسناد پرداختنی', parentCode: '2.1', nature: 'CREDIT' });

  console.log('');
  console.log('=== seeding cheque mappings ===');
  let created = 0, updated = 0, skipped = 0;
  for (const [code, def] of Object.entries(NEW_MAPPINGS)) {
    const debit = await p.account.findFirst({ where: { code: def.debitCode }, select: { id: true, code: true } });
    const credit = await p.account.findFirst({ where: { code: def.creditCode }, select: { id: true, code: true } });
    if (!debit || !credit) {
      console.log('  x ' + code + ' -- missing: ' + (!debit ? def.debitCode : def.creditCode));
      skipped++;
      continue;
    }
    const existing = await p.accountMapping.findUnique({ where: { code } });
    if (existing) {
      await p.accountMapping.update({
        where: { code },
        data: { title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  ~ ' + code.padEnd(28) + ' ' + debit.code + ' -> ' + credit.code);
      updated++;
    } else {
      await p.accountMapping.create({
        data: { code, title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  + ' + code.padEnd(28) + ' ' + debit.code + ' -> ' + credit.code);
      created++;
    }
  }
  console.log('');
  console.log('created=' + created + ' updated=' + updated + ' skipped=' + skipped);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());