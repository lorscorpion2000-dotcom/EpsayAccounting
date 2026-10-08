import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const ROLES = ['accountant', 'project_manager', 'viewer', 'warehouse_keeper', 'site_supervisor', 'purchaser', 'hr', 'approver', 'pettywork'];

const roles = await p.role.findMany({
  where: { code: { in: ROLES } },
  include: { permissions: { include: { permission: true } } },
});

for (const r of roles) {
  const codes = r.permissions.map(x => x.permission.code).sort();
  console.log('═══════════════════════════════════════');
  console.log('ROLE:', r.code, '(' + r.displayName + ')');
  console.log('═══════════════════════════════════════');
  console.log(codes.join('\n'));
  console.log();
}

await p.$disconnect();
