import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FiscalYearsService } from '../../src/modules/accounting/fiscal-years.service';

function serviceWithFindFirst(result: any) {
  const prisma: any = {
    fiscalYear: { findFirst: async () => result },
  };
  return new FiscalYearsService(prisma);
}

test('assertPeriodOpen: invalid date → PERIOD_LOCKED', async () => {
  const svc = serviceWithFindFirst(null);
  await assert.rejects(() => svc.assertPeriodOpen('not-a-date'), /invalid date/);
});

test('assertPeriodOpen: no fiscal year covers date', async () => {
  const svc = serviceWithFindFirst(null);
  await assert.rejects(
    () => svc.assertPeriodOpen('2026-10-11'),
    /no fiscal year/,
  );
});

test('assertPeriodOpen: CLOSED fiscal year', async () => {
  const svc = serviceWithFindFirst({
    id: 'fy1', code: '1404', status: 'CLOSED', lockedMonths: [],
  });
  await assert.rejects(
    () => svc.assertPeriodOpen('2026-01-15'),
    /is CLOSED/,
  );
});

test('assertPeriodOpen: locked month (uses local YYYY-MM)', async () => {
  const svc = serviceWithFindFirst({
    id: 'fy1', code: '1404', status: 'OPEN', lockedMonths: ['2026-01'],
  });
  await assert.rejects(
    () => svc.assertPeriodOpen(new Date(2026, 0, 15)), // local Jan 15
    /month 2026-01 is locked/,
  );
});

test('assertPeriodOpen: OK for open year, unlocked month', async () => {
  const fy = {
    id: 'fy1', code: '1404', status: 'OPEN', lockedMonths: ['2026-02'],
  };
  const svc = serviceWithFindFirst(fy);
  const r = await svc.assertPeriodOpen(new Date(2026, 0, 15));
  assert.equal(r.id, 'fy1');
});

test('assertPeriodOpen: accepts string and Date', async () => {
  const svc = serviceWithFindFirst({
    id: 'fy1', code: '1404', status: 'OPEN', lockedMonths: [],
  });
  await svc.assertPeriodOpen('2026-01-15');
  await svc.assertPeriodOpen(new Date(2026, 0, 15));
});

test('assertPeriodOpen: uses tx client, not prisma', async () => {
  let txUsed = false;
  let prismaUsed = false;
  const tx: any = {
    fiscalYear: {
      findFirst: async () => { txUsed = true; return null; },
    },
  };
  const prisma: any = {
    fiscalYear: {
      findFirst: async () => { prismaUsed = true; return null; },
    },
  };
  const svc = new FiscalYearsService(prisma);
  await assert.rejects(() => svc.assertPeriodOpen('2026-01-15', tx));
  assert.equal(txUsed, true, 'tx.findFirst should be used');
  assert.equal(prismaUsed, false, 'prisma.findFirst should NOT be called');
});
