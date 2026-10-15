// _ci-ensure-admin.mjs
// CI helper: ensures admin user has known password in test DB
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const p = new PrismaClient();
try {
  const admin = await p.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.error('admin not found after seed');
    process.exit(1);
  }
  const hash = await bcrypt.hash('Admin@1404', 10);
  await p.user.update({
    where: { id: admin.id },
    data: { passwordHash: hash, lockedUntil: null, mustChangePassword: false },
  });
  console.log('admin password ensured');
} finally {
  await p.$disconnect();
}
