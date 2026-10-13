// test/e2e/journals-flow.e2e.test.ts
// Full journal lifecycle: create -> post -> reverse + period-lock enforcement
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loginAdmin } from './_helpers';

let app: any;
let token: string;
let prisma: any;
let fySvc: any;
let fy: any;
let accDebit: string;
let accCredit: string;

const REF_PREFIX = 'E2E-FLOW-';

before(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  }
  const { createTestApp } = await import('./setup');
  const { PrismaService } = await import('../../src/shared/prisma/prisma.service');
  const { FiscalYearsService } = await import('../../src/modules/accounting/fiscal-years.service');

  app = await createTestApp();
  prisma = app.get(PrismaService);
  fySvc = app.get(FiscalYearsService);
  token = await loginAdmin(app);

  fy = await prisma.fiscalYear.findFirst({ where: { status: 'OPEN' } });
  if (!fy) throw new Error('E2E setup: no OPEN fiscal year — run _seed-all.mjs first');

  const accounts = await prisma.account.findMany({
    where: { isPostable: true, isActive: true },
    orderBy: { code: 'asc' },
    take: 2,
  });
  if (accounts.length < 2) {
    throw new Error('E2E setup: need >= 2 postable+active accounts, found ' + accounts.length);
  }
  accDebit = accounts[0].id;
  accCredit = accounts[1].id;
});

after(async () => {
  if (prisma) {
    try {
      const originals = await prisma.journalEntry.findMany({
        where: { reference: { startsWith: REF_PREFIX } },
        select: { id: true },
      });
      const ids = originals.map((o: any) => o.id);
      await prisma.journalEntry.deleteMany({
        where: {
          OR: [
            { reference: { startsWith: REF_PREFIX } },
            { sourceType: 'reversal', sourceId: { in: ids } },
          ],
        },
      });
    } catch (e) {
      // ignore cleanup errors
    }
  }
  if (app) await app.close();
});

const AUTH = () => ({ Authorization: 'Bearer ' + token });

function midFyDate(): string {
  const start = new Date(fy.startDate).getTime();
  const end = new Date(fy.endDate).getTime();
  const mid = new Date((start + end) / 2);
  return mid.toISOString().slice(0, 10);
}

function monthKeyOf(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function payload(reference: string, opts: any = {}) {
  return {
    entryDate: opts.entryDate || midFyDate(),
    fiscalYearId: opts.fiscalYearId || fy.id,
    description: opts.description || 'E2E flow test entry',
    reference: REF_PREFIX + reference,
    lines: opts.lines || [
      { accountId: accDebit, debit: 1000, credit: 0, description: 'debit line' },
      { accountId: accCredit, debit: 0, credit: 1000, description: 'credit line' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 1) full lifecycle
// ─────────────────────────────────────────────────────────────
test('flow: create -> post -> reverse (full lifecycle)', async () => {
  const createRes = await request(app.getHttpServer())
    .post('/api/journals')
    .set(AUTH())
    .send(payload('flow-1'));
  assert.equal(createRes.status, 201, 'create body: ' + JSON.stringify(createRes.body));
  const id = createRes.body.id;
  assert.ok(id, 'no id in create response');
  assert.equal(createRes.body.status, 'DRAFT');

  const postRes = await request(app.getHttpServer())
    .patch('/api/journals/' + id + '/post')
    .set(AUTH());
  assert.equal(postRes.status, 200, 'post body: ' + JSON.stringify(postRes.body));
  assert.equal(postRes.body.status, 'POSTED');

  const reverseRes = await request(app.getHttpServer())
    .patch('/api/journals/' + id + '/reverse')
    .set(AUTH())
    .send({ reason: 'تست e2e — ابطال سند کامل', reversalDate: midFyDate() });
  assert.equal(reverseRes.status, 200, 'reverse body: ' + JSON.stringify(reverseRes.body));
  assert.equal(reverseRes.body.status, 'POSTED');
  assert.equal(reverseRes.body.sourceType, 'reversal');
  assert.equal(reverseRes.body.sourceId, id);

  const getRes = await request(app.getHttpServer())
    .get('/api/journals/' + id)
    .set(AUTH());
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.status, 'REVERSED');
  assert.ok(getRes.body.reversedAt, 'reversedAt should be set on original');
});

// ─────────────────────────────────────────────────────────────
// 2) reversal mirrors lines
// ─────────────────────────────────────────────────────────────
test('flow: reversal entry mirrors original lines (debit<->credit)', async () => {
  const createRes = await request(app.getHttpServer())
    .post('/api/journals')
    .set(AUTH())
    .send(payload('mirror', {
      lines: [
        { accountId: accDebit, debit: 2500, credit: 0, description: 'D1' },
        { accountId: accCredit, debit: 0, credit: 2500, description: 'C1' },
      ],
    }));
  assert.equal(createRes.status, 201, JSON.stringify(createRes.body));
  const id = createRes.body.id;

  await request(app.getHttpServer()).patch('/api/journals/' + id + '/post').set(AUTH()).expect(200);

  const revRes = await request(app.getHttpServer())
    .patch('/api/journals/' + id + '/reverse')
    .set(AUTH())
    .send({ reason: 'mirror test', reversalDate: midFyDate() });
  assert.equal(revRes.status, 200, JSON.stringify(revRes.body));
  const revId = revRes.body.id;

  const [origGet, revGet] = await Promise.all([
    request(app.getHttpServer()).get('/api/journals/' + id).set(AUTH()),
    request(app.getHttpServer()).get('/api/journals/' + revId).set(AUTH()),
  ]);
  assert.equal(origGet.status, 200);
  assert.equal(revGet.status, 200);

  const ol = origGet.body.lines;
  const rl = revGet.body.lines;
  assert.equal(rl.length, ol.length, 'line count mismatch');
  for (let i = 0; i < ol.length; i++) {
    assert.equal(Number(rl[i].debit), Number(ol[i].credit), 'line ' + i + ' debit != original credit');
    assert.equal(Number(rl[i].credit), Number(ol[i].debit), 'line ' + i + ' credit != original debit');
  }
  assert.equal(Number(revGet.body.totalDebit), Number(origGet.body.totalCredit));
  assert.equal(Number(revGet.body.totalCredit), Number(origGet.body.totalDebit));
});

// ─────────────────────────────────────────────────────────────
// 3) double post -> 400
// ─────────────────────────────────────────────────────────────
test('flow: posting a POSTED entry -> 400', async () => {
  const c = await request(app.getHttpServer()).post('/api/journals').set(AUTH()).send(payload('double-post'));
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const id = c.body.id;

  const p1 = await request(app.getHttpServer()).patch('/api/journals/' + id + '/post').set(AUTH());
  assert.equal(p1.status, 200);
  const p2 = await request(app.getHttpServer()).patch('/api/journals/' + id + '/post').set(AUTH());
  assert.equal(p2.status, 400, 'second post should fail, got: ' + JSON.stringify(p2.body));
});

// ─────────────────────────────────────────────────────────────
// 4) reverse DRAFT -> 400
// ─────────────────────────────────────────────────────────────
test('flow: reversing a DRAFT entry -> 400', async () => {
  const c = await request(app.getHttpServer()).post('/api/journals').set(AUTH()).send(payload('reverse-draft'));
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const id = c.body.id;

  const r = await request(app.getHttpServer())
    .patch('/api/journals/' + id + '/reverse')
    .set(AUTH())
    .send({ reason: 'should not work on DRAFT', reversalDate: midFyDate() });
  assert.equal(r.status, 400, JSON.stringify(r.body));
});

// ─────────────────────────────────────────────────────────────
// 5) unbalanced -> 400
// ─────────────────────────────────────────────────────────────
test('flow: unbalanced entry -> 400', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/journals')
    .set(AUTH())
    .send(payload('unbalanced', {
      lines: [
        { accountId: accDebit, debit: 1000, credit: 0 },
        { accountId: accCredit, debit: 0, credit: 900 },
      ],
    }));
  assert.equal(res.status, 400, JSON.stringify(res.body));
});

// ─────────────────────────────────────────────────────────────
// 6) single-line -> 400
// ─────────────────────────────────────────────────────────────
test('flow: single-line entry -> 400', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/journals')
    .set(AUTH())
    .send(payload('single-line', {
      lines: [{ accountId: accDebit, debit: 1000, credit: 0 }],
    }));
  assert.equal(res.status, 400, JSON.stringify(res.body));
});

// ─────────────────────────────────────────────────────────────
// 7) post unknown id -> 404
// ─────────────────────────────────────────────────────────────
test('flow: posting unknown journal id -> 404', async () => {
  const res = await request(app.getHttpServer())
    .patch('/api/journals/00000000-0000-0000-0000-000000000000/post')
    .set(AUTH());
  assert.equal(res.status, 404, JSON.stringify(res.body));
});

// ─────────────────────────────────────────────────────────────
// 8) period-lock blocks create, unlock allows
// ─────────────────────────────────────────────────────────────
test('flow: locked month blocks create; unlock reopens', async () => {
  const iso = midFyDate();
  const mKey = monthKeyOf(iso);

  const before = await prisma.fiscalYear.findUnique({ where: { id: fy.id } });
  const wasLocked = ((before.lockedMonths || []) as string[]).includes(mKey);
  if (!wasLocked) await fySvc.lockMonth(fy.id, mKey);

  try {
    const lockedRes = await request(app.getHttpServer())
      .post('/api/journals')
      .set(AUTH())
      .send(payload('locked-month', { entryDate: iso }));
    assert.equal(lockedRes.status, 400, 'expected 400 while locked, got: ' + JSON.stringify(lockedRes.body));
    assert.match(JSON.stringify(lockedRes.body), /PERIOD_LOCKED/i, 'expected PERIOD_LOCKED, body: ' + JSON.stringify(lockedRes.body));
  } finally {
    if (!wasLocked) await fySvc.unlockMonth(fy.id, mKey);
  }

  const openRes = await request(app.getHttpServer())
    .post('/api/journals')
    .set(AUTH())
    .send(payload('unlocked-month', { entryDate: iso }));
  assert.equal(openRes.status, 201, 'expected 201 after unlock, got: ' + JSON.stringify(openRes.body));
});

// ─────────────────────────────────────────────────────────────
// 9) missing fiscalYearId -> 400 (DTO validation)
// ─────────────────────────────────────────────────────────────
test('flow: missing fiscalYearId -> 400', async () => {
  const p = payload('no-fy') as any;
  delete p.fiscalYearId;
  const res = await request(app.getHttpServer()).post('/api/journals').set(AUTH()).send(p);
  assert.equal(res.status, 400, JSON.stringify(res.body));
});
