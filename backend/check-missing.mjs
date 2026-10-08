import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const codes = [
  'accounting.journals.delete',
  'warehouse.items.delete',
  'payroll.work-logs.manage',
  'payroll.leave-requests.manage',
  'materialpricediff.read',
];
for (const c of codes) {
  const x = await p.permission.findUnique({ where: { code: c } });
  console.log(c + ':', x ? 'EXISTS' : 'NOT EXISTS');
}

// چک کن کدوم‌ها در DB هستن با pattern
console.log('\n=== journal.* ===');
const a = await p.permission.findMany({ where: { code: { contains: 'journal' } } });
for (const x of a) console.log('  ', x.code);

console.log('\n=== payroll.work / leave ===');
const b = await p.permission.findMany({ where: { code: { contains: 'payroll.' } } });
for (const x of b) console.log('  ', x.code);

console.log('\n=== material* ===');
const c = await p.permission.findMany({ where: { code: { contains: 'material' } } });
for (const x of c) console.log('  ', x.code);

console.log('\n=== warehouse.items* ===');
const d = await p.permission.findMany({ where: { code: { contains: 'warehouse.items' } } });
for (const x of d) console.log('  ', x.code);

await p.$disconnect();
