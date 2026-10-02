import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const USERNAME = 'admin';
  const PASSWORD = 'Admin@1234';
  const ROLE_CODE = 'admin';

  const existing = await prisma.user.findUnique({ where: { username: USERNAME } });
  if (existing) {
    console.log('');
    console.log('=======================================');
    console.log('  کاربر admin از قبل وجود دارد');
    console.log('  نام کاربری: admin');
    console.log('  رمز عبور:   Admin@1234');
    console.log('=======================================');
    return;
  }

  // ساخت یا یافتن نقش admin (با فیلد code بهجای name)
  let adminRole = await prisma.role.findFirst({ where: { code: ROLE_CODE } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        code: ROLE_CODE,
        displayName: 'مدیر سیستم',
        description: 'دسترسی کامل به همه بخشها',
        isSystem: true,
      },
    });
    console.log('[OK] نقش admin ساخته شد');
  } else {
    console.log('[INFO] نقش admin از قبل موجود است');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      username: USERNAME,
      passwordHash,
      fullName: 'مدیر سیستم',
      email: 'admin@epsay.local',
      isActive: true,
    },
  });
  console.log('[OK] کاربر ساخته شد: ' + user.username);

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });
  console.log('[OK] نقش admin به کاربر متصل شد');

  console.log('');
  console.log('=======================================');
  console.log('  آماده ورود');
  console.log('  نام کاربری: admin');
  console.log('  رمز عبور:   Admin@1234');
  console.log('=======================================');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());