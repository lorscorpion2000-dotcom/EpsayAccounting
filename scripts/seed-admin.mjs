// E:\EpsayAccounting\backend\prisma\seed-admin.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const USERNAME = 'admin';
  const PASSWORD = 'Admin@1234';

  // ─────────────────────────────────────────────
  // 1) بررسی وجود کاربر
  // ─────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { username: USERNAME } });
  if (existing) {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  ℹ کاربر admin از قبل وجود دارد');
    console.log('═══════════════════════════════════════');
    console.log('  نام کاربری: admin');
    console.log('  رمز عبور:   Admin@1234');
    console.log('═══════════════════════════════════════');
    return;
  }

  // ─────────────────────────────────────────────
  // 2) ساخت نقش admin اگر نیست
  // ─────────────────────────────────────────────
  let adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'مدیر سیستم با دسترسی کامل',
      },
    });
    console.log('✓ نقش admin ساخته شد');
  } else {
    console.log('ℹ نقش admin از قبل موجود است');
  }

  // ─────────────────────────────────────────────
  // 3) هش رمز عبور
  // ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ─────────────────────────────────────────────
  // 4) ساخت کاربر
  // ─────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      username: USERNAME,
      passwordHash,
      fullName: 'مدیر سیستم',
      email: 'admin@epsay.local',
      isActive: true,
    },
  });
  console.log('✓ کاربر ساخته شد:', user.username, '(id:', user.id + ')');

  // ─────────────────────────────────────────────
  // 5) اتصال کاربر به نقش
  // ─────────────────────────────────────────────
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });
  console.log('✓ نقش admin به کاربر متصل شد');

  // ─────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ✅ آماده ورود');
  console.log('═══════════════════════════════════════');
  console.log('  نام کاربری: admin');
  console.log('  رمز عبور:   Admin@1234');
  console.log('═══════════════════════════════════════');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ خطا:');
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());