// _scan-perms.mjs
// اسکن همه @RequirePermissions در backend/src، ساخت permission های گم،
// و اطمینان از اینکه super_admin همه را دارد.
//
// این فایل توسط _seed-all.mjs (مرحله ۵/۶) صدا زده می‌شود.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(path.join(__dirname, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('=== scan-perms: اسکن @RequirePermissions و ساخت گم‌شده‌ها ===\n');

// ── ۱) اسکن فایل‌ها
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      walk(full, acc);
    } else if (/\.ts$/.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const srcDir = path.join(__dirname, 'src');
const files = walk(srcDir);
console.log('   اسکن ' + files.length + ' فایل...');

const codes = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // @RequirePermissions('a.b')  یا  @RequirePermissions("a.b", "c.d")
  const re = /@RequirePermissions\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const args = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(args)) !== null) {
      codes.add(s[1]);
    }
  }
}
console.log('   پیدا شد: ' + codes.size + ' کد یکتا\n');

// ── ۲) شکستن کد به module/action
function splitCode(code) {
  const parts = code.split('.').filter(Boolean);
  if (parts.length === 0) return { module: 'other', action: 'read' };
  if (parts.length === 1) return { module: parts[0], action: 'access' };
  return { module: parts[0], action: parts[parts.length - 1] };
}

// ── ۳) خواندن permission های موجود
const existing = await prisma.permission.findMany({ select: { id: true, code: true } });
const existingMap = new Map(existing.map(p => [p.code, p.id]));
console.log('   permission های موجود در DB: ' + existing.length);

// ── ۴) ساخت گم‌شده‌ها
const toCreate = [];
for (const code of codes) {
  if (existingMap.has(code)) continue;
  const { module, action } = splitCode(code);
  toCreate.push({ code, module, action });
}

let created = 0;
if (toCreate.length > 0) {
  console.log('\n   ساخت ' + toCreate.length + ' permission گم:');
  for (const p of toCreate) {
    try {
      // تلاش با فیلدهای رایج
      const created_row = await prisma.permission.create({
        data: {
          code: p.code,
          module: p.module,
          action: p.action,
          nameFa: p.code,   // اگر فیلد nameFa وجود دارد
        },
      });
      existingMap.set(p.code, created_row.id);
      created++;
      console.log('     + ' + p.code);
    } catch (e1) {
      // اگر nameFa نبود
      try {
        const created_row = await prisma.permission.create({
          data: {
            code: p.code,
            module: p.module,
            action: p.action,
          },
        });
        existingMap.set(p.code, created_row.id);
        created++;
        console.log('     + ' + p.code);
      } catch (e2) {
        console.error('     ✗ ' + p.code + ' — ' + e2.message);
      }
    }
  }
} else {
  console.log('\n   ✅ همه permission ها موجود بودند');
}

// ── ۵) گرفتن نقش super_admin
const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
if (!superRole) {
  console.error('\n   ❌ نقش super_admin پیدا نشد — ابتدا seed.ts را اجرا کن');
  await prisma.$disconnect();
  process.exit(1);
}

// ── ۶) گرفتن همه permission ها
const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
console.log('\n   کل permission ها (پس از اسکن): ' + allPerms.length);

// ── ۷) موجود rolePermission های فعلی super_admin
const existingRps = await prisma.rolePermission.findMany({
  where: { roleId: superRole.id },
  select: { permissionId: true },
});
const existingPermIds = new Set(existingRps.map(r => r.permissionId));
console.log('   super_admin در حال حاضر: ' + existingPermIds.size + ' permission');

// ── ۸) افزودن گم‌شده‌ها به super_admin
const missing = allPerms.filter(p => !existingPermIds.has(p.id));
if (missing.length > 0) {
  console.log('   افزودن ' + missing.length + ' permission به super_admin...');
  await prisma.rolePermission.createMany({
    data: missing.map(p => ({ roleId: superRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  console.log('   ✅ ' + missing.length + ' permission اضافه شد');
} else {
  console.log('   ✅ super_admin کامل است');
}

// ── ۹) خلاصه
console.log('\n=== خلاصه ===');
console.log('   کدهای یکتا در src: ' + codes.size);
console.log('   permission موجود:  ' + existing.length);
console.log('   permission ساخته‌شده: ' + created);
console.log('   کل permission:     ' + allPerms.length);
console.log('   super_admin:       ' + allPerms.length + ' permission (کل)');

await prisma.$disconnect();
console.log('\n✓ scan-perms تمام شد');
