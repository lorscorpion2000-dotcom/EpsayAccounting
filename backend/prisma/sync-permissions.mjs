import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const MODULES_DIR = 'E:/EpsayAccounting/backend/src/modules';

function* walkControllers(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* walkControllers(full);
    else if (item.name.endsWith('.controller.ts')) yield full;
  }
}

function extractPermissions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const codes = new Set();
  const regex = /RequirePermissions\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const argRegex = /['"]([^'"]+)['"]/g;
    let am;
    while ((am = argRegex.exec(m[1])) !== null) codes.add(am[1]);
  }
  return Array.from(codes);
}

const ACTION_FA = {
  read: 'مشاهده', create: 'ایجاد', update: 'ویرایش',
  delete: 'حذف', manage: 'مدیریت', approve: 'تأیید',
  reject: 'رد', submit: 'ارسال', reverse: 'ابطال',
  post: 'ثبت', cancel: 'ابطال', activate: 'فعالسازی',
};

async function main() {
  console.log('=== Scanning all controllers ===\n');

  const allCodes = new Set();
  for (const file of walkControllers(MODULES_DIR)) {
    extractPermissions(file).forEach((c) => allCodes.add(c));
  }

  console.log('کدهای permission مورد نیاز: ' + allCodes.size);
  console.log('لیست:');
  Array.from(allCodes).sort().forEach((c) => console.log('  ' + c));
  console.log('');

  console.log('=== ساخت permissionهای جدید ===\n');
  let created = 0, skipped = 0;
  for (const code of allCodes) {
    const exists = await prisma.permission.findUnique({ where: { code } });
    if (exists) { skipped++; continue; }
    const parts = code.split('.');
    const action = parts[parts.length - 1];
    const module = parts.slice(0, -1).join('.') || code;
    const displayName = (ACTION_FA[action] || action) + ' ' + module;
    await prisma.permission.create({
      data: { code, displayName, module, action },
    });
    created++;
  }
  console.log('[OK] ' + created + ' جدید');
  console.log('[INFO] ' + skipped + ' از قبل');

  console.log('');
  console.log('=== اتصال به نقش admin ===\n');
  const adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
  const allPerms = await prisma.permission.findMany();
  let linked = 0;
  for (const p of allPerms) {
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: p.id },
    });
    if (!exists) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: p.id },
      });
      linked++;
    }
  }
  console.log('[OK] ' + linked + ' permission به admin اضافه شد');
  console.log('');

  // شمارش نهایی
  const finalPerms = await prisma.permission.findMany();
  const finalRolePerms = await prisma.rolePermission.count({
    where: { roleId: adminRole.id },
  });
  console.log('=======================================');
  console.log('  permission کل دیتابیس: ' + finalPerms.length);
  console.log('  permission admin: ' + finalRolePerms);
  console.log('=======================================');
  console.log('');
  console.log('  حالا فقط صفحه را Refresh کنید (Ctrl+Shift+R)');
  console.log('  Logout لازم نیست چون JwtStrategy از DB میخواند');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());