import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const perms = await p.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
console.log('Total permissions:', perms.length);
const byModule = {};
for (const x of perms) {
  if (!byModule[x.module]) byModule[x.module] = [];
  byModule[x.module].push(x.action + (x.code.endsWith('.manage') ? '*' : ''));
}
for (const [mod, actions] of Object.entries(byModule).sort()) {
  console.log(mod + ': ' + [...new Set(actions)].sort().join(', '));
}
await p.$disconnect();
