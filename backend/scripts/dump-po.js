const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

  const models = ['PurchaseOrder', 'PurchaseOrderLine', 'PurchaseInvoice', 'GoodsReceipt', 'GoodsReceiptLine', 'Partner', 'AccountMapping'];
  for (const name of models) {
    console.log('\n======== model ' + name + ' ========');
    const re = new RegExp('model\\s+' + name + '\\s*\\{[\\s\\S]*?\\n\\}');
    const m = schema.match(re);
    console.log(m ? m[0] : '(پیدا نشد)');
  }

  console.log('\n======== AccountMapping codes ========');
  const maps = await prisma.$queryRawUnsafe(`SELECT code, title FROM account_mappings ORDER BY code`);
  console.table(maps);

  console.log('\n======== نمونه PO ========');
  const pos = await prisma.purchaseOrder.findMany({
    take: 3,
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  }).catch((e) => { console.log('خطا:', e.message); return []; });
  if (pos.length === 0) console.log('(هیچ PO نیست)');
  else pos.forEach(p => {
    console.log(`  ${p.code ?? p.number} | status=${p.status} | supplier=${p.supplierId} | total=${p.totalAmount ?? p.total}`);
    console.log(`    lines: ${p.lines?.length ?? 0}`);
  });

  console.log('\n======== enumهای مرتبط ========');
  const enums = await prisma.$queryRawUnsafe(
    `SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname IN ('PurchaseOrderStatus','PurchaseInvoiceStatus','GoodsReceiptStatus','AccountDetailType')
     ORDER BY t.typname, e.enumsortorder`
  );
  const grouped = {};
  for (const r of enums) { grouped[r.typname] ??= []; grouped[r.typname].push(r.enumlabel); }
  for (const [k, v] of Object.entries(grouped)) console.log(`  ${k}: ${v.join(', ')}`);

  console.log('\n======== ستون‌های purchase_orders ========');
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='purchase_orders' ORDER BY ordinal_position`
  );
  console.table(cols);
}

main().catch(e => { console.error('X', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());