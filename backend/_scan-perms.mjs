// _scan-perms.mjs
// ╪º╪│┌⌐┘å ┘ç┘à┘ç @RequirePermissions ╪»╪▒ backend/src╪î ╪│╪º╪«╪¬ permission ┘ç╪º█î ┌»┘à╪î
// ┘ê ╪º╪╖┘à█î┘å╪º┘å ╪º╪▓ ╪º█î┘å┌⌐┘ç super_admin ┘ç┘à┘ç ╪▒╪º ╪»╪º╪▒╪».
//
// ╪º█î┘å ┘ü╪º█î┘ä ╪¬┘ê╪│╪╖ _seed-all.mjs (┘à╪▒╪¡┘ä┘ç █╡/█╢) ╪╡╪»╪º ╪▓╪»┘ç ┘à█îΓÇî╪┤┘ê╪».

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(path.join(__dirname, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('=== scan-perms: ╪º╪│┌⌐┘å @RequirePermissions ┘ê ╪│╪º╪«╪¬ ┌»┘àΓÇî╪┤╪»┘çΓÇî┘ç╪º ===\n');

// ΓöÇΓöÇ █▒) ╪º╪│┌⌐┘å ┘ü╪º█î┘äΓÇî┘ç╪º
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
console.log('   ╪º╪│┌⌐┘å ' + files.length + ' ┘ü╪º█î┘ä...');

const codes = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // @RequirePermissions('a.b')  █î╪º  @RequirePermissions("a.b", "c.d")
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
console.log('   ┘╛█î╪»╪º ╪┤╪»: ' + codes.size + ' ┌⌐╪» █î┌⌐╪¬╪º\n');

// ΓöÇΓöÇ █▓) ╪┤┌⌐╪│╪¬┘å ┌⌐╪» ╪¿┘ç module/action
function splitCode(code) {
  const parts = code.split('.').filter(Boolean);
  if (parts.length === 0) return { module: 'other', action: 'read' };
  if (parts.length === 1) return { module: parts[0], action: 'access' };
  return { module: parts[0], action: parts[parts.length - 1] };
}

// ΓöÇΓöÇ █│) ╪«┘ê╪º┘å╪»┘å permission ┘ç╪º█î ┘à┘ê╪¼┘ê╪»
const existing = await prisma.permission.findMany({ select: { id: true, code: true } });
const existingMap = new Map(existing.map(p => [p.code, p.id]));
console.log('   permission ┘ç╪º█î ┘à┘ê╪¼┘ê╪» ╪»╪▒ DB: ' + existing.length);

// ΓöÇΓöÇ █┤) ╪│╪º╪«╪¬ ┌»┘àΓÇî╪┤╪»┘çΓÇî┘ç╪º
const toCreate = [];
for (const code of codes) {
  if (existingMap.has(code)) continue;
  const { module, action } = splitCode(code);
  toCreate.push({ code, module, action });
}

let created = 0;
if (toCreate.length > 0) {
  console.log('\n   ╪│╪º╪«╪¬ ' + toCreate.length + ' permission ┌»┘à:');
  for (const p of toCreate) {
    try {
      // ╪¬┘ä╪º╪┤ ╪¿╪º ┘ü█î┘ä╪»┘ç╪º█î ╪▒╪º█î╪¼
      const created_row = await prisma.permission.create({
        data: {
          code: p.code,
          module: p.module,
          action: p.action,
          nameFa: p.code,   // ╪º┌»╪▒ ┘ü█î┘ä╪» nameFa ┘ê╪¼┘ê╪» ╪»╪º╪▒╪»
        },
      });
      existingMap.set(p.code, created_row.id);
      created++;
      console.log('     + ' + p.code);
    } catch (e1) {
      // ╪º┌»╪▒ nameFa ┘å╪¿┘ê╪»
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
        console.error('     Γ£ù ' + p.code + ' ΓÇö ' + e2.message);
      }
    }
  }
} else {
  console.log('\n   Γ£à ┘ç┘à┘ç permission ┘ç╪º ┘à┘ê╪¼┘ê╪» ╪¿┘ê╪»┘å╪»');
}

// ΓöÇΓöÇ █╡) ┌»╪▒┘ü╪¬┘å ┘å┘é╪┤ super_admin
const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
if (!superRole) {
  console.error('\n   Γ¥î ┘å┘é╪┤ super_admin ┘╛█î╪»╪º ┘å╪┤╪» ΓÇö ╪º╪¿╪¬╪»╪º seed.ts ╪▒╪º ╪º╪¼╪▒╪º ┌⌐┘å');
  await prisma.$disconnect();
  process.exit(1);
}

// ΓöÇΓöÇ █╢) ┌»╪▒┘ü╪¬┘å ┘ç┘à┘ç permission ┘ç╪º
const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
console.log('\n   ┌⌐┘ä permission ┘ç╪º (┘╛╪│ ╪º╪▓ ╪º╪│┌⌐┘å): ' + allPerms.length);

// ΓöÇΓöÇ █╖) ┘à┘ê╪¼┘ê╪» rolePermission ┘ç╪º█î ┘ü╪╣┘ä█î super_admin
const existingRps = await prisma.rolePermission.findMany({
  where: { roleId: superRole.id },
  select: { permissionId: true },
});
const existingPermIds = new Set(existingRps.map(r => r.permissionId));
console.log('   super_admin ╪»╪▒ ╪¡╪º┘ä ╪¡╪º╪╢╪▒: ' + existingPermIds.size + ' permission');

// ΓöÇΓöÇ █╕) ╪º┘ü╪▓┘ê╪»┘å ┌»┘àΓÇî╪┤╪»┘çΓÇî┘ç╪º ╪¿┘ç super_admin
const missing = allPerms.filter(p => !existingPermIds.has(p.id));
if (missing.length > 0) {
  console.log('   ╪º┘ü╪▓┘ê╪»┘å ' + missing.length + ' permission ╪¿┘ç super_admin...');
  await prisma.rolePermission.createMany({
    data: missing.map(p => ({ roleId: superRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  console.log('   Γ£à ' + missing.length + ' permission ╪º╪╢╪º┘ü┘ç ╪┤╪»');
} else {
  console.log('   Γ£à super_admin ┌⌐╪º┘à┘ä ╪º╪│╪¬');
}

// ΓöÇΓöÇ █╣) ╪«┘ä╪º╪╡┘ç
console.log('\n=== ╪«┘ä╪º╪╡┘ç ===');
console.log('   ┌⌐╪»┘ç╪º█î █î┌⌐╪¬╪º ╪»╪▒ src: ' + codes.size);
console.log('   permission ┘à┘ê╪¼┘ê╪»:  ' + existing.length);
console.log('   permission ╪│╪º╪«╪¬┘çΓÇî╪┤╪»┘ç: ' + created);
console.log('   ┌⌐┘ä permission:     ' + allPerms.length);
console.log('   super_admin:       ' + allPerms.length + ' permission (┌⌐┘ä)');

await prisma.$disconnect();
console.log('\nΓ£ô scan-perms ╪¬┘à╪º┘à ╪┤╪»');
