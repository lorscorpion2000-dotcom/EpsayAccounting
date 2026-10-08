import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}

const files = walk('E:\\EpsayAccounting\\backend\\src');
const codes = new Set();
const re = /@RequirePermissions\(([^)]+)\)/g;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(t)) !== null) {
    const items = m[1].match(/['"]([^'"]+)['"]/g) || [];
    for (const it of items) codes.add(it.slice(1, -1));
  }
}
console.log('Total permission codes found:', codes.size);

const all = await prisma.permission.findMany();
const dbCodes = new Set(all.map(p => p.code));
const missing = [...codes].filter(c => !dbCodes.has(c));
console.log('Missing in DB:', missing);

function parseCode(code) {
  const parts = code.split('.');
  if (parts.length >= 2) {
    const action = parts[parts.length - 1];
    const module = parts.slice(0, -1).join('.');
    return { module, action };
  }
  return { module: code, action: 'access' };
}

for (const code of missing) {
  const { module, action } = parseCode(code);
  await prisma.permission.create({
    data: {
      code,
      displayName: code,
      module,
      action,
    },
  });
}
console.log('Added', missing.length, 'permissions');

const allPerms = await prisma.permission.findMany();
const adminRoles = await prisma.role.findMany({
  where: { code: { in: ['admin', 'super_admin'] } },
  include: { permissions: true },
});

for (const role of adminRoles) {
  const have = new Set(role.permissions.map(p => p.permissionId));
  const add = allPerms.filter(p => !have.has(p.id));
  if (add.length) {
    await prisma.rolePermission.createMany({
      data: add.map(p => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`Role ${role.code}: added ${add.length} perms`);
  } else {
    console.log(`Role ${role.code}: up to date`);
  }
}

const sa = await prisma.role.findUnique({ where: { code: 'super_admin' } });
if (!sa) {
  const created = await prisma.role.create({
    data: {
      code: 'super_admin',
      name: 'مدیر ارشد سیستم',
      description: 'دسترسی کامل',
    },
  });
  await prisma.rolePermission.createMany({
    data: allPerms.map(p => ({ roleId: created.id, permissionId: p.id })),
  });
  console.log('Created super_admin');
}

await prisma.$disconnect();
console.log('DONE');
