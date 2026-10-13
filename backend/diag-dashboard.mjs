import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

console.log('══ مدل‌های مورد استفاده در dashboard ══');
const tables = [
  'contract', 'legalContract', 'cheque', 'guarantee', 'insurance',
  'project', 'projectBudget', 'wbsItem', 'dailyReport', 'purchaseRequest',
  'purchaseOrder', 'goodsReceipt', 'goodsIssue', 'subcontractorStatement',
  'clientStatement', 'workerStatement', 'pettyCashTransaction',
  'pettyCashRequest', 'leaveRequest', 'advanceRequest', 'journalLine',
];
for (const t of tables) {
  const exists = typeof p[t]?.count === 'function';
  console.log(`  ${t.padEnd(24)} ${exists ? '✅' : '❌'}`);
}

console.log('\n══ حساب‌های 1.1.1.* و 4.* و 5.* postable ══');
const accs = await p.account.findMany({
  where: {
    OR: [
      { code: { startsWith: '1.1.1' } },
      { code: { startsWith: '2.1.1' } },
      { code: { startsWith: '1.1.2' } },
    ],
  },
  select: { code: true, name: true, isPostable: true, isActive: true },
});
accs.forEach(a => console.log(`  ${a.code.padEnd(12)} ${a.name.slice(0,30).padEnd(30)} postable:${a.isPostable} active:${a.isActive}`));

console.log('\n══ شمارش pendingApprovals ══');
const counts = await Promise.all([
  p.pettyCashTransaction.count({ where: { status: 'SUBMITTED' } }),
  p.pettyCashRequest.count({ where: { status: 'PENDING' } }),
  p.purchaseRequest.count({ where: { status: 'SUBMITTED' } }),
  p.purchaseOrder.count({ where: { status: 'DRAFT' } }),
  p.dailyReport.count({ where: { status: 'SUBMITTED' } }),
  p.goodsReceipt.count({ where: { status: 'SUBMITTED' } }),
  p.subcontractorStatement.count({ where: { status: 'SUBMITTED' } }),
  p.leaveRequest.count({ where: { status: 'PENDING' } }),
  p.advanceRequest.count({ where: { status: 'PENDING' } }),
  p.clientStatement.count({ where: { status: 'SUBMITTED' } }),
  p.workerStatement.count({ where: { status: 'SUBMITTED' } }),
]);
console.log('  pcTx:', counts[0], '| pcReq:', counts[1], '| PR:', counts[2], '| PO:', counts[3]);
console.log('  DR:', counts[4], '| GR:', counts[5], '| SS:', counts[6], '| LR:', counts[7], '| AR:', counts[8]);
console.log('  CS:', counts[9], '| WS:', counts[10]);

console.log('\n══ WBSItem.progressPct — آیا فیلد دارد؟ ══');
const schema = await p.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wbs_items' AND column_name IN ('progress_pct','progress_percent','progress')`;
console.log(schema);

await p.$disconnect();