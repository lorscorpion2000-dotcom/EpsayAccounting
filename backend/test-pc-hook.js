#!/usr/bin/env node
/**
 * test-pc-hook.js - Phase 2.5 test: PettyCash accounting hook
 */
const fs = require('fs');
const path = require('path');

function findDist(rel) {
  const candidates = [
    path.join(__dirname, 'dist', rel),
    path.join(__dirname, 'dist', 'src', rel),
  ];
  for (const c of candidates) {
    const p = c.endsWith('.js') ? c : c + '.js';
    if (fs.existsSync(p)) return p;
  }
  throw new Error('cannot find compiled: ' + rel + ' (tried: ' + candidates.join(', ') + ')');
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  console.log('--- finding an active PettyCashAccount ---');
  let account = await prisma.pettyCashAccount.findFirst({ where: { isActive: true } });
  if (!account) {
    const all = await prisma.pettyCashAccount.findMany();
    console.log('  none active. All:', all.map(a => a.code + ' ' + a.name));
    if (!all.length) {
      console.error('ERROR: no PettyCashAccount exists. create one via UI first.');
      process.exit(1);
    }
    account = all[0];
  }
  console.log('  using: ' + account.code + ' - ' + account.name + '  (id=' + account.id + ')');
  console.log('  balance=' + account.balance);

  await prisma.pettyCashAccount.update({
    where: { id: account.id },
    data: { ceilingPerTx: 10_000_000, weeklyLimit: 100_000_000 },
  });
  console.log('  ceilings raised for test');

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(findDist('app.module'));
  const { PettyCashTransactionsService } = require(findDist('modules/petty-cash/transactions.service'));

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const svc = app.get(PettyCashTransactionsService);

  const today = new Date().toISOString().slice(0, 10);

  // ================= FUNDING =================
  console.log('\n======== TEST 1: FUNDING ========');
  try {
    const tx = await svc.create({
      accountId: account.id,
      type: 'FUNDING',
      txDate: today,
      amount: 5_000_000,
      description: 'test phase 2.5 FUNDING',
    }, null);
    console.log('  created: ' + tx.code + '  status=' + tx.status);
    await svc.submit(tx.id);
    console.log('  submitted OK');
    const approved = await svc.approve(tx.id, null);
    console.log('  approved: status=' + approved.status + '  journalEntryId=' + approved.journalEntryId);
    if (approved.journalEntryId) {
      const je = await prisma.journalEntry.findUnique({
        where: { id: approved.journalEntryId },
        include: { lines: { include: { account: true } } },
      });
      console.log('  OK JE: ' + je.code + ' (' + je.status + ') - ' + je.description);
      je.lines.forEach(l => {
        console.log('     Dr ' + l.debit + ' / Cr ' + l.credit + '  ->  ' + l.account.code + ' ' + l.account.name);
      });
    } else {
      console.log('  WARN journalEntryId NULL - hook did NOT run');
    }
  } catch (e) {
    console.error('  FAIL FUNDING: ' + e.message);
  }

  // ================= EXPENSE =================
  console.log('\n======== TEST 2: EXPENSE ========');
  try {
    const tx = await svc.create({
      accountId: account.id,
      type: 'EXPENSE',
      txDate: today,
      amount: 1_000_000,
      description: 'test phase 2.5 EXPENSE',
      category: 'test',
    }, null);
    console.log('  created: ' + tx.code + '  status=' + tx.status);
    await svc.submit(tx.id);
    console.log('  submitted OK');
    const approved = await svc.approve(tx.id, null);
    console.log('  approved: status=' + approved.status + '  journalEntryId=' + approved.journalEntryId);
    if (approved.journalEntryId) {
      const je = await prisma.journalEntry.findUnique({
        where: { id: approved.journalEntryId },
        include: { lines: { include: { account: true } } },
      });
      console.log('  OK JE: ' + je.code + ' (' + je.status + ') - ' + je.description);
      je.lines.forEach(l => {
        console.log('     Dr ' + l.debit + ' / Cr ' + l.credit + '  ->  ' + l.account.code + ' ' + l.account.name);
      });
    } else {
      console.log('  WARN journalEntryId NULL - hook did NOT run');
    }
  } catch (e) {
    console.error('  FAIL EXPENSE: ' + e.message);
  }

  await app.close();
  await prisma.$disconnect();
  console.log('\ndone.');
}

main().catch(e => {
  console.error('\nFATAL: ' + e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});