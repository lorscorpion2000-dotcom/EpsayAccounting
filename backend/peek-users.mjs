import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({
  include: {
    roles: {
      include: {
        role: { select: { code: true, displayName: true } },
      },
    },
  },
});
for (const u of users) {
  const roles = u.roles.map(r => r.role.code).join(', ');
  console.log(u.username || u.email, '=>', roles || '(NO ROLES)');
}
await p.$disconnect();
