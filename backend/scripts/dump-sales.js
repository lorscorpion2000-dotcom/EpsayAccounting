const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

  const models = ['SalesContract','SalesContractItem','SalesUnit','SalesCustomer','SalesPayment','SalesInvoice'];
  for (const name of models) {
    console.log('\n======== model ' + name + ' ========');
    const re = new RegExp('model\\s+' + name + '\\s*\\{[\\s\\S]*?\\n\\}');
    const m = schema.match(re);
    console.log(m ? m[0] : '(پیدا نشد)');
  }

  console.log('\n======== enumهای Sales ========');
  const enums = await prisma.$queryRawUnsafe(
    `SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname ILIKE '%sales%' OR t.typname ILIKE '%installment%'
     ORDER BY t.typname, e.enumsortorder`
  );
  const grouped = {};
  for (const r of enums) { grouped[r.typname] ??= []; grouped[r.typname].push(r.enumlabel); }
  for (const [k, v] of Object.entries(grouped)) console.log(`  ${k}: ${v.join(', ')}`);

  console.log('\n======== جدول‌های sales ========');
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name ILIKE '%sale%'
     ORDER BY table_name`
  );
  console.log(tables.map(x => x.table_name).join(', '));

  console.log('\n======== mappingهای SALE ========');
  const maps = await prisma.$queryRawUnsafe(
    `SELECT code, title FROM account_mappings WHERE code LIKE 'SALE%' ORDER BY code`
  );
  console.table(maps);

  console.log('\n======== نمونه SalesContract ========');
  const contracts = await prisma.salesContract.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  }).catch((e) => { console.log('خطا:', e.message); return []; });
  if (contracts.length) {
    for (const c of contracts) {
      console.log(`  ${c.code ?? c.id} | status=${c.status} | total=${c.totalAmount ?? c.amount}`);
    }
  } else console.log('(هیچ قرارداد فروشی نیست)');

  console.log('\n======== حساب‌های درآمدی (nature=CREDIT, code 4.x/5.x) ========');
  const accs = await prisma.$queryRawUnsafe(
    `SELECT code, name, nature FROM accounts WHERE code LIKE '4.%' OR code LIKE '5.%' ORDER BY code`
  );
  console.table(accs);
}

main().catch(e => { console.error('X', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());