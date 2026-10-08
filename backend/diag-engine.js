const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('════ 1) SalesCustomers ════');
  const custs = await p.salesCustomer.findMany({ select: { id: true, fullName: true, isActive: true } });
  console.log('  count:', custs.length);
  custs.forEach(c => console.log('   ', c.fullName, '| active:', c.isActive));

  console.log('\n════ 2) SalesUnits ════');
  const units = await p.salesUnit.findMany({ select: { id: true, unitNumber: true, status: true } });
  console.log('  count:', units.length);
  units.forEach(u => console.log('   ', u.unitNumber, '|', u.status));

  console.log('\n════ 3) SalesContracts ════');
  const contracts = await p.salesContract.findMany({ select: { id: true, code: true, status: true, customerId: true } });
  console.log('  count:', contracts.length);
  contracts.forEach(c => console.log('   ', c.code, '|', c.status));

  console.log('\n════ 4) SalesPayments ════');
  const payments = await p.salesPayment.findMany({ select: { id: true, contractId: true, amount: true, paymentMethod: true, paidAt: true } });
  console.log('  count:', payments.length);
  payments.forEach(pm => console.log('   ', pm.amount, '|', pm.paymentMethod, '|', pm.paidAt));

  console.log('\n════ 5) JournalEntries (auto) ════');
  const entries = await p.journalEntry.findMany({
    where: { sourceType: { in: ['SALE_INSTALLMENT_CASH', 'SALE_INSTALLMENT_BANK'] } },
    select: { code: true, sourceType: true, sourceId: true, status: true },
  });
  console.log('  count:', entries.length);
  entries.forEach(e => console.log('   ', e.code, '|', e.sourceType, '| src:', e.sourceId));

  console.log('\n════ 6) All recent journal entries ════');
  const recent = await p.journalEntry.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { code: true, sourceType: true, description: true, status: true } });
  recent.forEach(e => console.log('   ', e.code, '|', e.sourceType, '|', e.description));
})().finally(() => p.$disconnect());