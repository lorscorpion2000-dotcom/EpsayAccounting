import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  const rows = await p.project.findMany({
    select: { code: true, name: true, status: true, deletedAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('═══ پروژه‌ها ═══');
  for (const x of rows) {
    const tag = x.deletedAt ? `🗑 DELETED (${x.deletedAt.toISOString().slice(0,10)})` : '✅ active';
    console.log(`${x.code} | ${x.name?.padEnd(25)} | ${x.status} | ${tag}`);
  }
  console.log(`\nمجموع: ${rows.length} (active: ${rows.filter(r => !r.deletedAt).length}, deleted: ${rows.filter(r => r.deletedAt).length})`);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });