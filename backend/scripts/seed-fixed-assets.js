/* seed-fixed-assets.js — حساب‌های نمونه + mapping استهلاک */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function ensurePath(path) {
  let parent = null;
  const out = [];
  for (const spec of path) {
    let acc = await p.account.findFirst({ where: { code: spec.code } });
    if (!acc) {
      acc = await p.account.create({
        data: {
          code: spec.code,
          name: spec.name,
          parentId: parent?.id ?? null,
          level: spec.level,
          nature: spec.nature,
          isPostable: spec.isPostable ?? (spec.level === 'SUBSIDIARY' || spec.level === 'DETAIL'),
          isActive: true,
        },
      });
      console.log('  + ' + spec.code + ' ' + spec.name);
    } else {
      console.log('  = ' + spec.code + ' ' + spec.name);
    }
    parent = acc;
    out.push(acc);
  }
  return out;
}

async function ensureAccount({ code, name, parentCode, nature, isPostable = true }) {
  const exists = await p.account.findFirst({ where: { code } });
  if (exists) { console.log('  = ' + code + ' ' + name); return exists; }
  const parent = await p.account.findFirst({ where: { code: parentCode } });
  if (!parent) { console.log('  x ' + code + ' (parent ' + parentCode + ' نیست)'); return null; }
  const acc = await p.account.create({
    data: { code, name, parentId: parent.id, level: 'DETAIL', nature, isPostable, isActive: true },
  });
  console.log('  + ' + code + ' ' + name);
  return acc;
}

const NEW_MAPPINGS = {
  DEPRECIATION_MONTHLY: {
    title: 'استهلاک ماهانه دارایی ثابت',
    debitCode: '7.1.5',
    creditCode: '1.2.2',
  },
  FIXED_ASSET_ACQUISITION: {
    title: 'تملک دارایی ثابت',
    debitCode: '1.2.1',
    creditCode: '2.1.1',
  },
};

async function main() {
  console.log('=== شاخه هزینه‌ها ===');
  await ensurePath([
    { code: '7',   name: 'هزینه‌ها',                level: 'GROUP',     nature: 'DEBIT', isPostable: false },
    { code: '7.1', name: 'هزینه‌های عمومی و اداری', level: 'GENERAL',   nature: 'DEBIT', isPostable: false },
    { code: '7.1.5', name: 'هزینه استهلاک',         level: 'SUBSIDIARY', nature: 'DEBIT', isPostable: true },
  ]);

  console.log('\n=== حساب‌های نمونه دارایی ثابت ===');
  await ensureAccount({ code: '1.2.1.01', name: 'دارایی ثابت — تجهیزات نمونه',      parentCode: '1.2.1', nature: 'DEBIT'  });
  await ensureAccount({ code: '1.2.2.01', name: 'استهلاک انباشته — تجهیزات نمونه',  parentCode: '1.2.2', nature: 'CREDIT' });

  console.log('\n=== mapping ===');
  for (const [code, def] of Object.entries(NEW_MAPPINGS)) {
    const debit  = await p.account.findFirst({ where: { code: def.debitCode },  select: { id: true, code: true } });
    const credit = await p.account.findFirst({ where: { code: def.creditCode }, select: { id: true, code: true } });
    if (!debit || !credit) {
      console.log('  x ' + code + ' — missing ' + (!debit ? def.debitCode : def.creditCode));
      continue;
    }
    const existing = await p.accountMapping.findUnique({ where: { code } });
    if (existing) {
      await p.accountMapping.update({
        where: { code },
        data: { title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  ~ ' + code.padEnd(26) + ' ' + debit.code + ' -> ' + credit.code);
    } else {
      await p.accountMapping.create({
        data: { code, title: def.title, debitAccountId: debit.id, creditAccountId: credit.id, isActive: true },
      });
      console.log('  + ' + code.padEnd(26) + ' ' + debit.code + ' -> ' + credit.code);
    }
  }
  console.log('\n🎉 seed تمام شد');
}

main()
  .catch((e) => { console.error('💥', e); process.exit(1); })
  .finally(() => p.$disconnect());