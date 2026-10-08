import 'dotenv/config';
import { PrismaClient, AccountDetailType } from '@prisma/client';

const prisma = new PrismaClient();

const PARTNER_TYPE_TO_DETAIL: Record<string, AccountDetailType> = {
  CLIENT: 'CUSTOMER' as AccountDetailType,
  SUPPLIER: 'SUPPLIER' as AccountDetailType,
  CONTRACTOR: 'CONTRACTOR' as AccountDetailType,
};

const DEFAULT_PARENT: Partial<Record<AccountDetailType, string>> = {
  CUSTOMER: '1.1.2',
  SUPPLIER: '2.1.1',
  CONTRACTOR: '2.1.5',
  EMPLOYEE: '2.1.2',
  PETTY_CASH: '1.1.5',
};

async function ensureDetail(
  entityId: string,
  entityName: string,
  detailType: AccountDetailType,
): Promise<boolean> {
  const existing = await prisma.account.findFirst({
    where: { detailType: detailType as any, detailId: entityId } as any,
  });
  if (existing) return false;

  const parentCode = DEFAULT_PARENT[detailType];
  if (!parentCode) return false;

  const parent = await prisma.account.findFirst({ where: { code: parentCode } });
  if (!parent) {
    console.log(`   ⚠️ parent ${parentCode} not found for ${detailType}`);
    return false;
  }

  const siblings = await prisma.account.findMany({
    where: { parentId: parent.id },
    select: { code: true },
  });
  let maxLast = 0;
  for (const s of siblings) {
    const parts = s.code.split('.');
    const last = parseInt(parts[parts.length - 1], 10) || 0;
    if (last > maxLast) maxLast = last;
  }
  const nextCode = `${parentCode}.${String(maxLast + 1).padStart(2, '0')}`;

  await prisma.account.create({
    data: {
      code: nextCode,
      name: entityName,
      level: 'DETAIL' as any,
      nature: parent.nature,
      parentId: parent.id,
      isPostable: true,
      isActive: true,
      detailType: detailType as any,
      detailId: entityId,
    } as any,
  });

  // اگر معین والد postable بود، غیرفعالش کن
  if (parent.isPostable) {
    await prisma.account.update({
      where: { id: parent.id },
      data: { isPostable: false },
    });
  }

  console.log(`   ✅ ${nextCode}  ${entityName}  [${detailType}]`);
  return true;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(' Backfill detail accounts for existing entities');
  console.log('═══════════════════════════════════════════\n');

  let created = 0;
  let skipped = 0;

  // ─── Partners (CLIENT, SUPPLIER, CONTRACTOR) ───
  console.log('📁 Partners:');
  const partners = await prisma.partner.findMany({ where: { isActive: true } });
  for (const p of partners) {
    const dt = PARTNER_TYPE_TO_DETAIL[p.type];
    if (!dt) { skipped++; continue; }
    const ok = await ensureDetail(p.id, p.name, dt);
    if (ok) created++; else skipped++;
  }

  // ─── Employees ───
  console.log('\n📁 Employees:');
  const employees = await prisma.employee.findMany();
  for (const e of employees) {
    const ok = await ensureDetail(e.id, e.fullName, 'EMPLOYEE' as AccountDetailType);
    if (ok) created++; else skipped++;
  }

  // ─── Petty Cash ───
  console.log('\n📁 Petty Cash:');
  const pcs = await prisma.pettyCashAccount.findMany();
  for (const pc of pcs) {
    const ok = await ensureDetail(pc.id, (pc as any).name || 'تنخواه', 'PETTY_CASH' as AccountDetailType);
    if (ok) created++; else skipped++;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(` Created: ${created}`);
  console.log(` Skipped: ${skipped}`);
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });