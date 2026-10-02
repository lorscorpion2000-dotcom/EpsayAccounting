import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('═══ بازسازی admin ═══\n');

  let adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { code: 'admin', displayName: 'مدیر سیستم', description: 'دسترسی کامل', isSystem: true },
    });
    console.log('✓ نقش admin ساخته شد');
  } else {
    console.log('ℹ نقش admin موجود');
  }

  const password = 'Admin@1234';
  const hash = await bcrypt.hash(password, 10);

  let admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hash, isActive: true },
    });
    console.log('✓ رمز admin بازنشانی شد');
  } else {
    admin = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hash,
        fullName: 'مدیر سیستم',
        email: 'admin@epsay.local',
        isActive: true,
      },
    });
    console.log('✓ کاربر admin ساخته شد');
  }

  const link = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: adminRole.id },
  });
  if (!link) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    console.log('✓ نقش متصل شد');
  }

  const perms = await prisma.permission.count();
  const rolePerms = await prisma.rolePermission.count({ where: { roleId: adminRole.id } });
  console.log('\nمجوز کل: ' + perms + ' | برای admin: ' + rolePerms);
  console.log('\n═══════════════════════════════════════');
  console.log('  کاربر: admin');
  console.log('  رمز:   Admin@1234');
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());