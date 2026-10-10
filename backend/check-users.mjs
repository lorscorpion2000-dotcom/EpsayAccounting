// E:\EpsayAccounting\check-users.mjs
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({
  select: {
    username: true,
    mustChangePassword: true,
    twoFactorEnabled: true,
    isActive: true,
  },
});
console.table(users);
await p.$disconnect();