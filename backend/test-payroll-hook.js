#!/usr/bin/env node
/**
 * test-payroll-hook.js - Phase 2.6 test
 * 1) temp baseSalary on active EmployeeProfiles
 * 2) reset period to DRAFT
 * 3) calculatePeriod
 * 4) approve (hook triggers)
 * 5) show JEs
 * 6) restore baseSalary
 * (PayrollPeriod + records + JEs left for manual cleanup)
 */
const fs = require('fs');
const path = require('path');

function findDist(rel) {
  const candidates = [
    path.join(__dirname, 'dist', 'src', rel),
    path.join(__dirname, 'dist', rel),
  ];
  for (const c of candidates) {
    const p = c.endsWith('.js') ? c : c + '.js';
    if (fs.existsSync(p)) return p;
  }
  throw new Error('cannot find compiled: ' + rel);
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // 1) backup + set baseSalary
  const profiles = await prisma.employeeProfile.findMany({ where: { isActive: true } });
  console.log('active EmployeeProfiles = ' + profiles.length);
  const backups = [];
  for (const ep of profiles) {
    backups.push({ id: ep.id, baseSalary: ep.baseSalary });
    await prisma.employeeProfile.update({
      where: { id: ep.id },
      data: {
        baseSalary: 200_000_000,
        housingAllow: 0, foodAllow: 0, childAllow: 0, otherAllow: 0,
      },
    });
  }
  console.log('temporarily set baseSalary=200,000,000 for test');

  // 2) find a PayrollPeriod
  const period = await prisma.payrollPeriod.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!period) { console.error('no PayrollPeriod exists'); process.exit(1); }
  console.log('using period ' + period.code + ' (status=' + period.status + ')');

  if (period.status !== 'DRAFT') {
    await prisma.payrollPeriod.update({
      where: { id: period.id },
      data: { status: 'DRAFT', approvedAt: null, paidAt: null },
    });
    console.log('  reset to DRAFT');
  }

  // 3) boot Nest
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(findDist('app.module'));
  const { PayrollCalculationService } = require(findDist('modules/payroll/payroll-calculation.service'));
  const { PayrollPeriodsService } = require(findDist('modules/payroll/payroll-periods.service'));

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error','warn'] });
  const calc = app.get(PayrollCalculationService);
  const svc = app.get(PayrollPeriodsService);

  // 4) calculate
  console.log('\n=== calculate ===');
  const afterCalc = await calc.calculatePeriod(period.id, null);
  console.log('  status=' + afterCalc.status);
  console.log('  totalGross=' + afterCalc.totalGross + '  totalNet=' + afterCalc.totalNet);

  const records = await prisma.payrollRecord.findMany({
    where: { periodId: period.id },
    orderBy: { rowNumber: 'asc' },
  });
  console.log('  records=' + records.length);
  for (const r of records) {
    console.log('    rec#' + r.rowNumber + ' empId=' + r.employeeId + ' net=' + r.netSalary);
  }

  // 5) approve
  console.log('\n=== approve (this triggers PAYROLL_ACCRUAL hook) ===');
  const result = await svc.approve(period.id, null);
  console.log('  period status=' + result.status);
  console.log('  entries created/reused=' + (result.journalEntries?.length ?? 0));
  for (const e of (result.journalEntries ?? [])) {
    console.log('    -> ' + e.code + ' (record ' + e.recordId + ')');
  }

  // 6) show JEs
  console.log('\n=== JournalEntries (PAYROLL_ACCRUAL) ===');
  const jes = await prisma.journalEntry.findMany({
    where: {
      sourceType: 'PAYROLL_ACCRUAL',
      sourceId: { in: records.map(r => r.id) },
    },
    include: { lines: { include: { account: true } } },
  });
  for (const je of jes) {
    console.log('  ' + je.code + ' | ' + je.status + ' | ' + je.description);
    for (const l of je.lines) {
      console.log('     Dr ' + l.debit + ' / Cr ' + l.credit + '  ->  ' + l.account.code + ' ' + l.account.name);
    }
  }

  await app.close();

  // 7) restore baseSalary
  console.log('\n=== restoring baseSalary ===');
  for (const b of backups) {
    await prisma.employeeProfile.update({
      where: { id: b.id },
      data: { baseSalary: b.baseSalary },
    });
  }
  console.log('restored');

  await prisma.$disconnect();
  console.log('\ndone. (period + records + JEs left as-is for manual inspection)');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });