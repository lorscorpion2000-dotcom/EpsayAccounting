const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

  console.log('======== model PurchaseOrderItem ========');
  const m = schema.match(/model\s+PurchaseOrderItem\s*\{[\s\S]*?\n\}/);
  console.log(m ? m[0] : '(پیدا نشد)');

  console.log('\n======== model GoodsReceiptItem ========');
  const m2 = schema.match(/model\s+GoodsReceiptItem\s*\{[\s\S]*?\n\}/);
  console.log(m2 ? m2[0] : '(پیدا نشد)');

  console.log('\n======== enum POStatus ========');
  const r = await prisma.$queryRawUnsafe(
    `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = 'POStatus' ORDER BY e.enumsortorder`
  );
  console.log(r.map(x => x.enumlabel).join(', '));

  console.log('\n======== enum ReceiptStatus ========');
  const r2 = await prisma.$queryRawUnsafe(
    `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = 'ReceiptStatus' ORDER BY e.enumsortorder`
  );
  console.log(r2.map(x => x.enumlabel).join(', '));

  console.log('\n======== ستون‌های purchase_order_items ========');
  const c1 = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='purchase_order_items' ORDER BY ordinal_position`
  );
  console.table(c1);

  console.log('\n======== ستون‌های goods_receipt_items ========');
  const c2 = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='goods_receipt_items' ORDER BY ordinal_position`
  );
  console.table(c2);

  console.log('\n======== حساب‌های mapping PURCHASE_CREDIT ========');
  const mp = await prisma.accountMapping.findUnique({ where: { code: 'PURCHASE_CREDIT' } });
  if (mp) {
    const d = await prisma.account.findUnique({ where: { id: mp.debitAccountId } });
    const c = await prisma.account.findUnique({ where: { id: mp.creditAccountId } });
    console.log('  debit:', d?.code, d?.name);
    console.log('  credit:', c?.code, c?.name);
  }
}

main().catch(e => { console.error('X', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());