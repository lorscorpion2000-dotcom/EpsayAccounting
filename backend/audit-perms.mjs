import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

// همه permission هایی که در کد استفاده شدن
const codesInCode = new Set();
const re = /@RequirePermissions\(([^)]+)\)/g;
for (const f of walk('E:\\EpsayAccounting\\backend\\src')) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(t)) !== null) {
    const items = m[1].match(/['"]([^'"]+)['"]/g) || [];
    for (const it of items) codesInCode.add(it.slice(1, -1));
  }
}

const all = await prisma.permission.findMany();
const dbCodes = new Set(all.map(p => p.code));

const notInDb = [...codesInCode].filter(c => !dbCodes.has(c));

console.log('Total codes in code:', codesInCode.size);
console.log('Total codes in DB:', dbCodes.size);
console.log('\nCodes USED IN CODE but NOT IN DB:', notInDb.length ? notInDb : '(none)');

await prisma.$disconnect();
