// _b3-0.mjs — B3.0: add 2.1.9 accounts + 5 mappings for B3 flow
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ACCOUNTS = [
  { code: '2.1.9',    name: 'بدهی ماشین‌آلات معوق',  level: 'SUBSIDIARY', nature: 'CREDIT', parent: '2.1', postable: false },
  { code: '2.1.9.01', name: 'بدهی ماشین‌آلات معوق',  level: 'DETAIL',     nature: 'CREDIT', parent: '2.1.9' },
];

const MAPPINGS = [
  { code: 'GOODS_RECEIPT',         title: 'رسید انبار (GRNI)',           debit: '1.1.3.01',  credit: '2.1.8.01' },
  { code: 'GOODS_ISSUE',           title: 'حواله مصرف مصالح',            debit: '5.1.1',     credit: '1.1.3.01' },
  { code: 'GOODS_RETURN',          title: 'برگشت مصالح به تأمین‌کننده',   debit: '2.1.8.01',  credit: '1.1.3.01' },
  { code: 'EQUIPMENT_COST',        title: 'کارکرد روزانه ماشین',         debit: '5.1.4',     credit: '2.1.9.01' },
  { code: 'EQUIPMENT_MAINTENANCE', title: 'تعمیرات و سرویس ماشین',       debit: '5.1.4',     credit: '2.1.9.01' },
];

async function upsertAccount(a) {
  const ex = await prisma.account.findUnique({ where: { code: a.code } });
  if (ex) { console.log('  [i] ' + a.code + ' exists'); return; }
  let parentId = null;
  if (a.parent) {
    const p = await prisma.account.findUnique({ where: { code: a.parent } });
    if (!p) throw new Error('parent missing: ' + a.parent + ' (for ' + a.code + ')');
    parentId = p.id;
  }
  await prisma.account.create({
    data: {
      code: a.code, name: a.name,
      level: a.level, nature: a.nature,
      parentId,
      isPostable: a.postable ?? a.level === 'DETAIL',
      isActive: true,
    },
  });
  console.log('  [OK] + ' + a.code + ' ' + a.name);
}

async function resolveId(code, side) {
  if (!code) return null;
  const a = await prisma.account.findUnique({ where: { code } });
  if (!a) throw new Error(side + ' account missing: ' + code);
  return a.id;
}

async function upsertMapping(m) {
  const debitAccountId  = await resolveId(m.debit,  'debit');
  const creditAccountId = await resolveId(m.credit, 'credit');
  const ex = await prisma.accountMapping.findUnique({ where: { code: m.code } });
  if (ex) {
    await prisma.accountMapping.update({
      where: { code: m.code },
      data: { title: m.title, debitAccountId, creditAccountId, isActive: true },
    });
    console.log('  [i] ' + m.code + ' updated');
    return;
  }
  await prisma.accountMapping.create({
    data: { code: m.code, title: m.title, debitAccountId, creditAccountId, isActive: true },
  });
  console.log('  [OK] + ' + m.code);
}

async function main() {
  console.log('═══ accounts ═══');
  for (const a of ACCOUNTS) await upsertAccount(a);
  console.log('');
  console.log('═══ mappings ═══');
  for (const m of MAPPINGS) await upsertMapping(m);
  console.log('');
  const accCount = await prisma.account.count();
  const mapCount = await prisma.accountMapping.count();
  console.log('═══ summary ═══');
  console.log('  accounts: ' + accCount + ' (expect 68)');
  console.log('  mappings: ' + mapCount + ' (expect 26)');
  await prisma.$disconnect();
  console.log('B3.0 done.');
}
main().catch(e => { console.error(e); process.exit(1); });