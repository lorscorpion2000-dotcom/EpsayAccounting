// backend/check-f2-4b.mjs
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const codes = ['approvals.update', 'approvals.read', 'approvals.approve', 'dailyreport.approve'];

for (const code of codes) {
  const perm = await p.permission.findUnique({ where: { code } });
  if (!perm) {
    console.log('❌ ' + code.padEnd(25) + ' — وجود ندارد');
    continue;
  }
  const rps = await p.rolePermission.findMany({
    where: { permissionId: perm.id },
    include: { role: { select: { code: true } } },
  });
  const roles = rps.map(r => r.role.code).sort();
  console.log('✓ ' + code.padEnd(25) + ' → ' + (roles.length ? roles.join(', ') : '(هیچ نقشی!)'));
}
await p.$disconnect();