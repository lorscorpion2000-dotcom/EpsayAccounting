import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  console.log('═══ چک وضعیت soft-delete در DB ═══\n');

  // چند تا model
  const models = [
    { name: 'project', table: 'projects' },
    { name: 'partner', table: 'partners' },
    { name: 'item', table: 'items' },
    { name: 'contract', table: 'contracts' },
  ];

  for (const m of models) {
    try {
      const total = await p[m.name].count();
      const deleted = await p[m.name].count({ where: { deletedAt: { not: null } } });

      console.log(`${m.name.padEnd(15)} | total: ${total} | deleted: ${deleted}`);

      if (deleted > 0) {
        const samples = await p[m.name].findMany({
          where: { deletedAt: { not: null } },
          select: { id: true, deletedAt: true, deletedBy: true },
          take: 5,
        });
        for (const s of samples) {
          console.log(`   ⚠️  id: ${s.id.slice(0, 12)}... | deletedAt: ${s.deletedAt} | by: ${s.deletedBy?.slice(0, 12) || '—'}`);
        }
      }
    } catch (e) {
      console.log(`${m.name}: ❌ ${e.message.slice(0, 100)}`);
    }
  }

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });