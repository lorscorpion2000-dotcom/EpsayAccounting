// E:\EpsayAccounting\fix-b1-4-sync-perms.mjs
// B1.4 — اسکن همه @RequirePermissions در controllerها + پر کردن DB + اتصال به نقش‌ها
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const MODULES_DIR = 'E:/EpsayAccounting/backend/src/modules';

// ── نگاشت نقش‌ها به permissionها ──
// هر permission که اینجا نباشد فقط به super_admin وصل می‌شود.
const ROLE_MAP = {
  'contracts.read':     ['super_admin','admin','financial_manager','project_manager','viewer'],
  'contracts.create':   ['super_admin','admin','project_manager'],
  'contracts.update':   ['super_admin','admin','project_manager'],
  'contracts.delete':   ['super_admin','admin'],
  'contracts.activate': ['super_admin','admin','project_manager'],
  'contracts.cancel':   ['super_admin','admin','project_manager'],

  'sales.read':         ['super_admin','admin','financial_manager','project_manager','viewer'],
  'sales.create':       ['super_admin','admin','financial_manager'],
  'sales.update':       ['super_admin','admin','financial_manager'],
  'sales.delete':       ['super_admin','admin'],

  'attachment.read':    ['super_admin','admin','financial_manager','project_manager','site_supervisor','warehouse_keeper','petty_cash_holder','procurement_officer','viewer'],
  'attachment.create':  ['super_admin','admin','financial_manager','project_manager','site_supervisor','warehouse_keeper','petty_cash_holder','procurement_officer'],
  'attachment.delete':  ['super_admin','admin'],
};

function* walkControllers(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* walkControllers(full);
    else if (item.name.endsWith('.controller.ts')) yield full;
  }
}

function extractCodes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const codes = new Set();
  const re = /RequirePermissions\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const argRe = /['"]([^'"]+)['"]/g;
    let am;
    while ((am = argRe.exec(m[1])) !== null) codes.add(am[1]);
  }
  return Array.from(codes);
}

const ACTION_FA = {
  read: 'مشاهده', create: 'ایجاد', update: 'ویرایش',
  delete: 'حذف', activate: 'فعال‌سازی', cancel: 'ابطال',
};

async function main() {
  console.log('=== 1) اسکن controllerها ===');
  const allCodes = new Set();
  for (const f of walkControllers(MODULES_DIR)) {
    extractCodes(f).forEach(c => allCodes.add(c));
  }
  const sorted = Array.from(allCodes).sort();
  console.log('  → ' + sorted.length + ' کد پیدا شد:');
  sorted.forEach(c => console.log('    ' + c));
  console.log('');

  console.log('=== 2) درج permissionهای جدید ===');
  let created = 0, skipped = 0;
  for (const code of sorted) {
    const exists = await prisma.permission.findUnique({ where: { code } });
    if (exists) { skipped++; continue; }
    const parts = code.split('.');
    const action = parts[parts.length - 1];
    const module = parts.slice(0, -1).join('.') || code;
    await prisma.permission.create({
      data: {
        code,
        displayName: (ACTION_FA[action] || action) + ' ' + module,
        module,
        action,
      },
    });
    created++;
  }
  console.log('  ✓ ' + created + ' جدید');
  console.log('  · ' + skipped + ' از قبل موجود');
  console.log('');

  console.log('=== 3) اتصال به نقش‌ها ===');
  const allRoles = await prisma.role.findMany();
  const roleByCode = Object.fromEntries(allRoles.map(r => [r.code, r]));

  let linked = 0, alreadyLinked = 0, skippedNoRole = [];
  const allPermsNow = await prisma.permission.findMany();
  const permByCode = Object.fromEntries(allPermsNow.map(p => [p.code, p]));

  for (const code of sorted) {
    const perm = permByCode[code];
    if (!perm) continue;
    let targetRoles = ROLE_MAP[code];
    if (!targetRoles) {
      // کد ناشناخته → فقط super_admin
      targetRoles = ['super_admin'];
      skippedNoRole.push(code);
    }
    for (const roleCode of targetRoles) {
      const role = roleByCode[roleCode];
      if (!role) continue;
      const exists = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (exists) { alreadyLinked++; continue; }
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
      linked++;
    }
  }
  console.log('  ✓ ' + linked + ' اتصال جدید ساخته شد');
  console.log('  · ' + alreadyLinked + ' اتصال از قبل موجود بود');
  if (skippedNoRole.length) {
    console.log('  ⚠ کدهای بدون نگاشت (فقط super_admin):');
    skippedNoRole.forEach(c => console.log('    ' + c));
  }
  console.log('');

  console.log('=== 4) خلاصه نهایی ===');
  const totalPerms = await prisma.permission.count();
  const totalRolePerms = await prisma.rolePermission.count();
  console.log('  permissionها در DB  : ' + totalPerms);
  console.log('  اتصال role-perm   : ' + totalRolePerms);
  console.log('');
  for (const r of allRoles.sort((a,b)=>a.code.localeCompare(b.code))) {
    const n = await prisma.rolePermission.count({ where: { roleId: r.id } });
    console.log('    ' + r.code.padEnd(22) + ' → ' + n);
  }
  console.log('');
  console.log('  حالا rebuild-restart کن.');
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());