const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const codes = ['PCF-2026-0001', 'PCE-2026-0002'];
  const txs = await p.pettyCashTransaction.findMany({ where: { code: { in: codes } } });
  console.log('found ' + txs.length + ' test tx');

  for (const t of txs) {
    // 1) delete journal entry + lines
    if (t.journalEntryId) {
      const d1 = await p.journalLine.deleteMany({ where: { journalEntryId: t.journalEntryId } });
      console.log('  deleted ' + d1.count + ' journal lines of ' + t.journalEntryId);
      await p.journalEntry.delete({ where: { id: t.journalEntryId } }).catch(e => {
        console.log('  WARN journalEntry delete: ' + e.message);
      });
      console.log('  deleted JE ' + t.journalEntryId);
    }

    // 2) rollback pettyCashAccount.balance
    const delta = t.type === 'EXPENSE' ? Number(t.amount) : -Number(t.amount);
    await p.pettyCashAccount.update({
      where: { id: t.accountId },
      data: { balance: { increment: delta } },
    });
    console.log('  rolled back balance by ' + delta);

    // 3) delete tx
    await p.pettyCashTransaction.delete({ where: { id: t.id } });
    console.log('  deleted tx ' + t.code);
  }

  const acc = await p.pettyCashAccount.findFirst({ where: { code: 'PC-2026-001' } });
  console.log('final balance of ' + acc.code + ' = ' + acc.balance);
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());