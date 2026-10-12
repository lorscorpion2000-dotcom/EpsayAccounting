// _scan-perms.mjs — scan backend for @RequirePermissions + create missing + assign to super_admin
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const ROOT = 'E:\\EpsayAccounting\\backend\\src';
const prisma = new PrismaClient();

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      walk(abs, files);
    } else if (e.name.endsWith('.ts')) {
      files.push(abs);
    }
  }
  return files;
}

async function main() {
  // ۱) scan
  const re = /@RequirePermissions\(\s*['"]([^'"]+)['"]\s*\)/g;
  const found = new Set();
  for (const f of walk(ROOT)) {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(src))) found.add(m[1]);
  }

  const codes = Array.from(found).sort();
  console.log('═══ 1) scanned @RequirePermissions (' + codes.length + ' unique) ═══');
  for (const c of codes) console.log('  ' + c);

  // ۲) existing
  const existing = await prisma.permission.findMany({ select: { code: true } });
  const have = new Set(existing.map((p) => p.code));
  const missing = codes.filter((c) => !have.has(c));

  console.log('');
  console.log('═══ 2) MISSING: ' + missing.length + ' ═══');
  if (missing.length === 0) {
    console.log('  (no missing)');
  } else {
    for (const c of missing) console.log('  ' + c);
  }

  if (missing.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // ۳) create
  console.log('');
  console.log('═══ 3) creating ═══');
  for (const code of missing) {
    const parts = code.split('.');
    const module = parts[0];
    const action = parts.slice(1).join('.') || 'read';
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        displayName: code,
        module,
        action,
      },
    });
    console.log('  [OK] ' + code);
  }

  // ۴) assign to super_admin
  console.log('');
  console.log('═══ 4) assign to super_admin ═══');
  const role = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  if (!role) { console.log('  [X] super_admin not found'); await prisma.$disconnect(); return; }
  const allPerms = await prisma.permission.findMany({ select: { id: true } });
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
      update: {},
      create: { roleId: role.id, permissionId: p.id },
    });
  }
  console.log('  [OK] super_admin ← all ' + allPerms.length + ' permissions');

  // ۵) verify
  console.log('');
  console.log('═══ 5) verify ═══');
  for (const uname of ['admin', 'hassan']) {
    const u = await prisma.user.findUnique({
      where: { username: uname },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });
    if (!u) { console.log('  ' + uname + ': NOT FOUND'); continue; }
    const count = u.roles.reduce((s, ur) => s + ur.role.permissions.length, 0);
    console.log('  ' + uname + ': perms=' + count);
  }
  const total = await prisma.permission.count();
  console.log('  DB total permissions: ' + total);

  await prisma.$disconnect();
  console.log('Done.');
}
main().catch((e) => { console.error(e); process.exit(1); });