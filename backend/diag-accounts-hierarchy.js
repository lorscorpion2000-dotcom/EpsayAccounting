const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const tops = await p.account.findMany({
    where: { parentId: null },
    include: { children: { select: { id: true, code: true, name: true, isPostable: true } } },
    orderBy: { code: 'asc' },
  });
  for (const t of tops) {
    console.log('  ' + t.code + ' ' + t.name + '  (postable=' + t.isPostable + ')');
    for (const c of t.children) {
      console.log('    ├─ ' + c.code + ' ' + c.name + '  (postable=' + c.isPostable + ')');
    }
  }
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
