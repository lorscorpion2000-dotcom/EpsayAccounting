import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';

const prisma = new PrismaClient();

function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

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

  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const hash = await bcrypt.hash(password, 12);

  let admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
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
        mustChangePassword: true,
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
  console.log(generated
    ? '  رمز موقت: ' + password + '  (در اولین ورود باید تغییر کند)'
    : '  رمز: مقدار ADMIN_PASSWORD (در اولین ورود باید تغییر کند)');
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
