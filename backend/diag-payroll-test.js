const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== EmployeeProfiles ===');
  const emps = await p.employeeProfile.findMany({
    where: { isActive: true },
    include: { partner: { select: { id: true, code: true, name: true, type: true } } },
  });
  console.log('  count(active) = ' + emps.length);
  for (const e of emps.slice(0, 5)) {
    console.log('  - ' + e.code + ' | partner=' + e.partner.code + ' ' + e.partner.name + ' (' + e.partner.type + ')');
    console.log('    baseSalary=' + e.baseSalary);
  }

  console.log('\n=== Parent account 2.1.2 ===');
  const parent = await p.account.findFirst({ where: { code: '2.1.2' } });
  if (!parent) { console.log('  MISSING!'); return; }
  console.log('  id=' + parent.id + '  isPostable=' + parent.isPostable + '  isActive=' + parent.isActive);

  console.log('\n=== Children of 2.1.2 ===');
  const children = await p.account.findMany({ where: { parentId: parent.id } });
  console.log('  count = ' + children.length);
  for (const c of children.slice(0, 10)) {
    console.log('  - ' + c.code + ' | ' + c.name + ' | detailId=' + c.detailId + ' | isPostable=' + c.isPostable);
  }

  console.log('\n=== Parent account 5.2.1 ===');
  const p2 = await p.account.findFirst({ where: { code: '5.2.1' } });
  if (p2) console.log('  id=' + p2.id + '  isPostable=' + p2.isPostable + '  isActive=' + p2.isActive);

  console.log('\n=== PayrollPeriods ===');
  const prds = await p.payrollPeriod.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  for (const pp of prds) {
    console.log('  - ' + pp.code + ' | status=' + pp.status + ' | ' + pp.year + '/' + pp.month);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());