const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const all = await p.account.findMany({ orderBy: { code: 'asc' } });
  const byId = new Map();
  for (const a of all) byId.set(a.id, a);
  function walk(parentId, indent) {
    for (const a of all.filter(x => x.parentId === parentId)) {
      const pad = '  '.repeat(indent);
      console.log(pad + a.code + ' ' + a.name + '  [postable=' + a.isPostable + ', detailType=' + (a.detailType || '—') + ']');
      if (indent < 3) walk(a.id, indent + 1);
    }
  }
  walk(null, 0);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
