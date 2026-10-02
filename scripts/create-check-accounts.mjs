import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// چک حساب‌های مورد نیاز
const mjs2 = `
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const accounts = await p.account.findMany({
  where: { OR: [
    { code: { startsWith: '1.1.1' } },
    { code: { startsWith: '1.1.5' } },
  ]},
  select: { id: true, code: true, name: true, isPostable: true, level: true },
  orderBy: { code: 'asc' },
});
console.log('═ حساب‌های 1.1.1 (بانک) و 1.1.5 (تنخواه) ═');
accounts.forEach((a) => console.log('  ' + a.code + ' | ' + a.name + ' | postable: ' + a.isPostable + ' | level: ' + a.level));

const fy = await p.fiscalYear.findFirst({ where: { isCurrent: true, status: 'OPEN' } });
console.log('\\n═ سال مالی جاری ═');
console.log(fy ? '  ✅ ' + fy.name + ' (' + fy.code + ')' : '  ❌ سال مالی جاری فعال وجود ندارد');

const pcs = await p.pettyCashAccount.findMany({
  select: { id: true, code: true, name: true, accountId: true, balance: true },
});
console.log('\\n═ تنخواه‌ها ═');
pcs.forEach((pc) => console.log('  ' + pc.code + ' | ' + pc.name + ' | accountId: ' + (pc.accountId || 'NULL') + ' | balance: ' + pc.balance));

await p.$disconnect();
`;

fs.writeFileSync(ROOT + '/backend/prisma/check-required-accounts.mjs', mjs2, 'utf8');
console.log('✅ ساخته شد — حالا اجرا کنید:');
console.log('   cd E:\\EpsayAccounting\\backend');
console.log('   node prisma/check-required-accounts.mjs');