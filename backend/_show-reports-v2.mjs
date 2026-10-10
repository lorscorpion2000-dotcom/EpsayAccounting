import { PrismaClient } from '@prisma/client';

// flag bypass تا همه رو ببینیم
(globalThis as any).__BYPASS_SOFT_DELETE = true;
const p = new PrismaClient();

(async () => {
  const rows = await p.dailyReport.findMany({
    orderBy: { createdAt: 'desc' },
    select: { code: true, status: true, deletedAt: true },
  });
  console.log('═══ همه گزارش‌ها (با bypass) ═══');
  for (const r of rows) {
    console.log(`${r.code} | ${r.status} | ${r.deletedAt ? '🗑 DELETED' : '✅ active'}`);
  }
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });