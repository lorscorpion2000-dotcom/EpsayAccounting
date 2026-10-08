import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// تست دسترسی به مدل‌ها
try {
  const [pi, chq, item, stock] = await Promise.all([
    p.purchaseInvoice.count(),
    p.cheque.count(),
    p.item.count(),
    p.stock.count(),
  ]);
  console.log('purchaseInvoice:', pi);
  console.log('cheque:', chq);
  console.log('item:', item);
  console.log('stock:', stock);
} catch (e) {
  console.log('ERR:', e.message);
}
await p.$disconnect();
