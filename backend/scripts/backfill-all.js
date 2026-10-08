const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PARENT_BY_TYPE = {
  CUSTOMER: '1.1.2',
  SUPPLIER: '2.1.1',
  CONTRACTOR: '2.1.5',
  EMPLOYEE: '2.1.2',
  PETTY_CASH: '1.1.5',
};

async function ensureDetail(detailType, entityId, entityName) {
  const existing = await p.account.findFirst({
    where: { detailType, detailId: entityId },
  });
  if (existing) {
    if (existing.name !== entityName) {
      await p.account.update({ where: { id: existing.id }, data: { name: entityName } });
    }
    return { status: 'existing' };
  }

  const parentCode = PARENT_BY_TYPE[detailType];
  const parent = await p.account.findFirst({ where: { code: parentCode } });
  if (!parent) return { status: 'no_parent', parentCode };

  const siblings = await p.account.findMany({
    where: { parentId: parent.id },
    select: { code: true },
  });
  let maxLast = 0;
  for (const s of siblings) {
    const parts = s.code.split('.');
    const last = parseInt(parts[parts.length - 1], 10) || 0;
    if (last > maxLast) maxLast = last;
  }
  const nextCode = parent.code + '.' + String(maxLast + 1).padStart(2, '0');

  await p.account.create({
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
    await p.account.update({ where: { id: parent.id }, data: { isPostable: false } });
  }

  return { status: 'created', code: nextCode };
}

async function run() {
  const stats = {
    partner_client:      { created: 0, skipped: 0, noParent: 0 },
    partner_supplier:    { created: 0, skipped: 0, noParent: 0 },
    partner_contractor:  { created: 0, skipped: 0, noParent: 0 },
    salesCustomer:       { created: 0, skipped: 0, noParent: 0 },
    pettyCash:           { created: 0, skipped: 0, noParent: 0 },
    employee:            { created: 0, skipped: 0, noParent: 0 },
  };

  // ─── 1) Partners ───
  const partnerMap = { CLIENT: 'CUSTOMER', SUPPLIER: 'SUPPLIER', CONTRACTOR: 'CONTRACTOR' };
  const partners = await p.partner.findMany({ where: { isActive: true } });
  for (const pt of partners) {
    const dt = partnerMap[pt.type];
    if (!dt) continue;
    const bucket =
      pt.type === 'CLIENT' ? 'partner_client' :
      pt.type === 'SUPPLIER' ? 'partner_supplier' :
      'partner_contractor';
    const r = await ensureDetail(dt, pt.id, pt.name);
    if (r.status === 'created') { stats[bucket].created++; console.log('  + ' + r.code + '  ' + pt.name + '  [' + dt + ']'); }
    else if (r.status === 'existing') stats[bucket].skipped++;
    else stats[bucket].noParent++;
  }

  // ─── 2) SalesCustomer ───
  const customers = await p.salesCustomer.findMany({ where: { isActive: true } });
  for (const c of customers) {
    const r = await ensureDetail('CUSTOMER', c.id, c.fullName);
    if (r.status === 'created') { stats.salesCustomer.created++; console.log('  + ' + r.code + '  ' + c.fullName + '  [SALES-CUSTOMER]'); }
    else if (r.status === 'existing') stats.salesCustomer.skipped++;
    else stats.salesCustomer.noParent++;
  }

  // ─── 3) PettyCash ───
  const petty = await p.pettyCashAccount.findMany({ where: { isActive: true } });
  for (const pc of petty) {
    const r = await ensureDetail('PETTY_CASH', pc.id, pc.name);
    if (r.status === 'created') { stats.pettyCash.created++; console.log('  + ' + r.code + '  ' + pc.name + '  [PETTY_CASH]'); }
    else if (r.status === 'existing') stats.pettyCash.skipped++;
    else stats.pettyCash.noParent++;
  }

  // ─── 4) EmployeeProfile ───
  const emps = await p.employeeProfile.findMany({
    where: { isActive: true },
    include: { partner: { select: { id: true, name: true } } },
  });
  for (const e of emps) {
    if (!e.partner) continue;
    const r = await ensureDetail('EMPLOYEE', e.partner.id, e.partner.name);
    if (r.status === 'created') { stats.employee.created++; console.log('  + ' + r.code + '  ' + e.partner.name + '  [EMPLOYEE]'); }
    else if (r.status === 'existing') stats.employee.skipped++;
    else stats.employee.noParent++;
  }

  // ─── گزارش ───
  console.log('\n════════ BACKFILL REPORT ════════');
  for (const [k, v] of Object.entries(stats)) {
    console.log('  ' + k.padEnd(22) + ' created=' + v.created + '  skipped=' + v.skipped + '  noParent=' + v.noParent);
  }

  console.log('\n════════ PARENT STATUS ════════');
  const parentsToCheck = ['1.1.2', '2.1.1', '2.1.5', '2.1.2', '1.1.5'];
  for (const code of parentsToCheck) {
    const par = await p.account.findFirst({
      where: { code },
      select: { code: true, name: true, isPostable: true, _count: { select: { children: true } } },
    });
    if (par) console.log('  ' + par.code + ' ' + par.name + ' | postable=' + par.isPostable + ' | children=' + par._count.children);
    else console.log('  ' + code + ' NOT FOUND');
  }
}

run().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());