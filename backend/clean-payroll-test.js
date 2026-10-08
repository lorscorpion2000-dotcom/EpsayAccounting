const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const period = await p.payrollPeriod.findFirst({ where: { code: 'PRD-1405-07' } });
  if (!period) { console.log('period not found - nothing to clean'); return; }
  console.log('period ' + period.code + ' status=' + period.status);

  const records = await p.payrollRecord.findMany({ where: { periodId: period.id } });
  console.log('records=' + records.length);

  // delete JEs by (sourceType, sourceId=recordId)
  for (const r of records) {
    const jes = await p.journalEntry.findMany({
      where: { sourceType: 'PAYROLL_ACCRUAL', sourceId: r.id },
      select: { id: true, code: true },
    });
    for (const je of jes) {
      const d = await p.journalLine.deleteMany({ where: { journalEntryId: je.id } });
      await p.journalEntry.delete({ where: { id: je.id } }).catch(()=>{});
      console.log('  deleted JE ' + je.code + ' (' + d.count + ' lines)');
    }
  }

  const del = await p.payrollRecord.deleteMany({ where: { periodId: period.id } });
  console.log('  deleted ' + del.count + ' records');

  await p.payrollPeriod.update({
    where: { id: period.id },
    data: {
      status: 'DRAFT',
      approvedAt: null, paidAt: null, calculatedAt: null,
      totalGross: 0, totalNet: 0, totalTax: 0, totalInsurance: 0, totalAdvances: 0,
    },
  });
  console.log('  period reset to DRAFT with zeroed totals');

  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());