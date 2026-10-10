import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const rows = await p.dailyReport.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, code: true, status: true, deletedAt: true, createdAt: true },
  });
  console.log('═══ گزارش‌های روزانه ═══');
  for (const r of rows) {
    const tag = r.deletedAt ? '🗑 DELETED' : '✅ active';
    console.log(`${r.code} | ${r.status} | ${tag} | ${r.id}`);
  }
  console.log(`\nمجموع: ${rows.length}`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });