import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const roles = await p.role.findMany({ include: { permissions: { include: { permission: true } } } });
for (const r of roles) {
  console.log('ROLE:', r.code, '| perms:', r.permissions.length);
  const codes = r.permissions.map(x => x.permission.code).sort();
  const interesting = codes.filter(c => c.includes('delete') || c.includes('purchase') || c.includes('journal'));
  console.log('  interesting:', interesting.join(', '));
}
await p.$disconnect();
