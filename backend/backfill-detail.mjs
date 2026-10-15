import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_PARENT = {
  BANK: '1.1.1',
  CASH_REGISTER: '1.1.1',
  PETTY_CASH: '1.1.5',
  CUSTOMER: '1.1.2',
  SUPPLIER: '2.1.1',
  CONTRACTOR: '2.1.5',
  EMPLOYEE: '2.1.2',
};

async function ensureDetail({ detailType, entityId, entityName, parentCode }) {
  const existing = await prisma.account.findFirst({
    where: { detailType, detailId: entityId },
  });
  if (existing) return existing;

  const parent = await prisma.account.findFirst({ where: { code: parentCode } });
  if (!parent) {
    console.log(`  ❌ parent ${parentCode} not found`);
    return null;
  }

  const siblings = await prisma.account.findMany({
    where: { parentId: parent.id },
    select: { code: true },
  });
  let maxLast = 0;
  for (const s of siblings) {
    const n = parseInt(s.code.split('.').pop(), 10) || 0;
    if (n > maxLast) maxLast = n;
  }
  const nextCode = `${parentCode}.${String(maxLast + 1).padStart(2, '0')}`;

  const created = await prisma.account.create({
    data: {
      code: nextCode,
      name: entityName,
      level: 'DETAIL',
      nature: parent.nature,
      parentId: parent.id,
      isPostable: true,
      isActive: true,
      detailType,
      detailId: entityId,
    },
  });

  if (parent.isPostable) {
    await prisma.account.update({
      where: { id: parent.id },
      data: { isPostable: false },
    });
  }
  return created;
}

async function main() {
  console.log('=== Backfill Detail Accounts ===\n');

  // بانک‌ها
  const banks = await prisma.bankAccount.findMany({
    where: { glAccountId: null, isActive: true },
  });
  console.log(`📊 بانک‌های بدون GL: ${banks.length}`);
  for (const b of banks) {
    const d = await ensureDetail({
      detailType: 'BANK',
      entityId: b.id,
      entityName: b.name,
      parentCode: '1.1.1',
    });
    if (d) {
      await prisma.bankAccount.update({
        where: { id: b.id },
        data: { glAccountId: d.id },
      });
      console.log(`  ✅ ${b.code} "${b.name}" → Account ${d.code}`);
    }
  }

  // تنخواه‌ها
  const petty = await prisma.pettyCashAccount.findMany({
    where: { accountId: null, isActive: true },
  });
  console.log(`\n📊 تنخواه‌های بدون GL: ${petty.length}`);
  for (const p of petty) {
    const d = await ensureDetail({
      detailType: 'PETTY_CASH',
      entityId: p.id,
      entityName: p.name,
      parentCode: '1.1.5',
    });
    if (d) {
      await prisma.pettyCashAccount.update({
        where: { id: p.id },
        data: { accountId: d.id },
      });
      console.log(`  ✅ ${p.code} "${p.name}" → Account ${d.code}`);
    }
  }

  console.log('\n=== Done ===');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());