import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const names = {
  NUMBER: 'عدد',
  KILOGRAM: 'کیلوگرم',
  TON: 'تن',
  METER: 'متر',
  SQUARE_METER: 'مترمربع',
  CUBIC_METER: 'مترمکعب',
  LITER: 'لیتر',
  PACKAGE: 'بسته',
  LUMP_SUM: 'مقطوع',
  SERVICE: 'خدمات',
  LINEAR_METER: 'متر طول',
  LUMP: 'مجموعه',
};

let count = 0;
for (const [code, name] of Object.entries(names)) {
  const r = await p.unit.updateMany({
    where: { code },
    data: { name },
  });
  count += r.count;
}
console.log('updated', count, 'units');

// چک
const all = await p.unit.findMany({ orderBy: { sortOrder: 'asc' } });
for (const u of all) console.log(u.code, '→', u.name);
await p.$disconnect();
