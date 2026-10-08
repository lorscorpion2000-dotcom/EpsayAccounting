import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const roles = await p.role.findMany({
  include: { permissions: { include: { permission: true } } },
  orderBy: { code: 'asc' },
});

console.log('=== Roles and permission counts ===');
for (const r of roles) {
  const codes = r.permissions.map(x => x.permission.code).sort();
  const modules = new Set(codes.map(c => c.split('.')[0]));
  console.log(r.code.padEnd(20), '|', String(codes.length).padStart(3), 'perms |', [...modules].sort().slice(0, 10).join(', ') + (modules.size > 10 ? ',...' : ''));
}

await p.$disconnect();
