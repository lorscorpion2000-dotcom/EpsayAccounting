// test/e2e/procurement-chain.e2e.test.ts
// زنجیره: گزارش روزانه (REQUESTS/PURCHASE) → PR → کارتابل → approve → PO
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

let app: any;
let prisma: any;
let adminToken: string;
let svToken: string;
let svUserId: string;
let projectId: string;
let createdProjectId: string | null = null;
let testAdminUserId: string | null = null;
const TEST_ADMIN_USERNAME = 'e2e_admin_' + Date.now();
const TEST_ADMIN_PASSWORD = 'Admin@1234';

const SV_USERNAME = 'e2e_pr_sv_' + Date.now();
const SV_PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];

// پایه روز یکتا برای این فایل تست (خیلی دور از داده‌های seed)
const BASE_DAYS_AGO = 800 + Math.floor(Math.random() * 300);

function reportDateFor(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (BASE_DAYS_AGO + offset));
  return d.toISOString().slice(0, 10);
}

async function createAndSubmitReport(requests: any[], offset: number): Promise<string> {
  const svAuth = { Authorization: 'Bearer ' + svToken };
  const res = await request(app.getHttpServer())
    .post('/api/site-ops/daily-reports')
    .set(svAuth)
    .send({
      projectId,
      reportDate: reportDateFor(offset),
      operations: 'تست زنجیره خرید',
      requests,
    });
  if (res.status !== 201) {
    throw new Error('create report failed: ' + JSON.stringify(res.body));
  }
  const id = res.body.id;
  REPORT_IDS.push(id);

  const submitRes = await request(app.getHttpServer())
    .patch('/api/site-ops/daily-reports/' + id + '/submit')
    .set(svAuth);
  if (submitRes.status !== 200) {
    throw new Error('submit failed: ' + JSON.stringify(submitRes.body));
  }
  return id;
}

async function approveRequestsSection(reportId: string) {
  const adminAuth = { Authorization: 'Bearer ' + adminToken };
  const res = await request(app.getHttpServer())
    .patch('/api/site-ops/daily-reports/' + reportId + '/sections/REQUESTS/approve')
    .set(adminAuth);
  if (res.status !== 200) {
    throw new Error('approve section failed: ' + JSON.stringify(res.body));
  }
  return res.body;
}

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

  app = await createTestApp();
  prisma = app.get(PrismaService);

  // به جای تکیه بر admin fixture، یک کاربر super_admin اختصاصی می‌سازیم
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  if (!superRole) throw new Error('role super_admin یافت نشد — seed باید اجرا شده باشد');

  const adminHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
  const testAdmin = await prisma.user.create({
    data: {
      username: TEST_ADMIN_USERNAME,
      fullName: 'E2E Admin',
      passwordHash: adminHash,
      isActive: true,
      roles: { create: [{ roleId: superRole.id }] },
    },
  });
  testAdminUserId = testAdmin.id;

  const adminLoginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });
  if (adminLoginRes.status !== 201) {
    throw new Error('test admin login failed: ' + JSON.stringify(adminLoginRes.body));
  }
  adminToken = adminLoginRes.body.accessToken;

  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'E2E-PRCH-' + Date.now(),
        name: 'E2E Procurement Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  const role = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!role) throw new Error('role site_supervisor یافت نشد');

  const hash = await bcrypt.hash(SV_PASSWORD, 10);
  const sv = await prisma.user.create({
    data: {
      username: SV_USERNAME,
      fullName: 'E2E PR Supervisor',
      passwordHash: hash,
      isActive: true,
      roles: { create: [{ roleId: role.id }] },
    },
  });
  svUserId = sv.id;

  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: SV_USERNAME, password: SV_PASSWORD });
  if (loginRes.status !== 201) {
    throw new Error('sv login failed: ' + JSON.stringify(loginRes.body));
  }
  svToken = loginRes.body.accessToken;
});

after(async () => {
  if (prisma) {
    try {
      const prs = await prisma.purchaseRequest.findMany({
        where: { requesterId: svUserId },
        select: { id: true },
      });
      const prIds = prs.map((p: any) => p.id);
      if (prIds.length) {
        await prisma.purchaseOrder.deleteMany({ where: { prId: { in: prIds } } });
        await prisma.purchaseRequestItem.deleteMany({ where: { prId: { in: prIds } } });
        await prisma.purchaseRequest.deleteMany({ where: { id: { in: prIds } } });
      }

      if (REPORT_IDS.length) {
        await prisma.dailyReportSection.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
      }

      if (svUserId) {
        await prisma.userRole.deleteMany({ where: { userId: svUserId } });
        await prisma.user.deleteMany({ where: { id: svUserId } });
      }

      if (testAdminUserId) {
        await prisma.userRole.deleteMany({ where: { userId: testAdminUserId } });
        await prisma.user.deleteMany({ where: { id: testAdminUserId } });
      }

      if (createdProjectId) {
        await prisma.project.deleteMany({ where: { id: createdProjectId } });
      }
    } catch (e) {
      // ignore cleanup
    }
  }
  if (app) await app.close();
});

const ADMIN_AUTH = () => ({ Authorization: 'Bearer ' + adminToken });

// ─────────────────────────────────────────────────────────────
test('procurement chain | PURCHASE request forwarded to PR', async () => {
  const reportId = await createAndSubmitReport([
    {
      requestType: 'PURCHASE',
      title: 'خرید سیمان تیپ ۲',
      description: 'برای فونداسیون',
      quantity: 100,
      unit: 'بسته',
      priority: 'HIGH',
    },
  ], 0);

  const result = await approveRequestsSection(reportId);
  assert.ok(result.forward, 'forward باید در response باشد');
  assert.equal(result.forward.success, 1, 'forward باید ۱ موفقیت داشته باشد. body: ' + JSON.stringify(result.forward));

  const pr = await prisma.purchaseRequest.findFirst({
    where: { requesterId: svUserId, projectId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(pr, 'PR باید ساخته شده باشد');
  assert.equal(pr.status, 'SUBMITTED', 'PR.status باید SUBMITTED باشد');
  assert.equal(pr.projectId, projectId);
  assert.equal(pr.requesterId, svUserId);
  assert.equal(pr.items.length, 1, 'PR باید ۱ قلم داشته باشد');
  assert.match(pr.items[0].description, /سیمان تیپ ۲/);
  assert.equal(Number(pr.items[0].quantity), 100);
  assert.equal(pr.items[0].unit, 'PACKAGE', 'بسته → PACKAGE');
  assert.equal(pr.items[0].priority, 'HIGH');
  assert.match(pr.code, /^PR-\d{4}-\d{4}$/);
});

// ─────────────────────────────────────────────────────────────
test('procurement chain | PR appears in approvals/pending', async () => {
  const reportId = await createAndSubmitReport([
    {
      requestType: 'PURCHASE',
      title: 'خرید میلگرد A3',
      quantity: 500,
      unit: 'کیلوگرم',
      priority: 'NORMAL',
    },
  ], 1);
  await approveRequestsSection(reportId);

  const pr = await prisma.purchaseRequest.findFirst({
    where: { requesterId: svUserId, projectId, status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(pr);

  const res = await request(app.getHttpServer())
    .get('/api/approvals/pending')
    .set(ADMIN_AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));

  const ids = (res.body.purchaseRequests || []).map((r: any) => r.id);
  assert.ok(ids.includes(pr.id), 'PR باید در کارتابل باشد. IDs: ' + JSON.stringify(ids));
});

// ─────────────────────────────────────────────────────────────
test('procurement chain | approve PR creates PO', async () => {
  const reportId = await createAndSubmitReport([
    {
      requestType: 'PURCHASE',
      title: 'خرید آجر فشاری',
      quantity: 10000,
      unit: 'عدد',
      priority: 'URGENT',
    },
  ], 2);
  await approveRequestsSection(reportId);

  const pr = await prisma.purchaseRequest.findFirst({
    where: { requesterId: svUserId, projectId, status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  assert.ok(pr, 'PR باید موجود باشد');

  const approveRes = await request(app.getHttpServer())
    .post('/api/approvals/approve')
    .set(ADMIN_AUTH())
    .send({ module: 'purchase-request', id: pr.id });
  assert.equal(approveRes.status, 201, 'body: ' + JSON.stringify(approveRes.body));

  const updatedPr = await prisma.purchaseRequest.findUnique({ where: { id: pr.id } });
  assert.equal(updatedPr.status, 'ORDERED', 'PR.status باید ORDERED باشد');

  const po = await prisma.purchaseOrder.findFirst({
    where: { prId: pr.id },
    include: { items: true },
  });
  assert.ok(po, 'PO باید ساخته شده باشد');
  assert.equal(po.projectId, projectId);
  assert.equal(po.status, 'DRAFT');
  assert.equal(po.items.length, pr.items.length);
  assert.match(po.code, /^PO-\d{4}-\d{4}$/);
});

// ─────────────────────────────────────────────────────────────
test('procurement chain | reject PR leaves no PO', async () => {
  const reportId = await createAndSubmitReport([
    {
      requestType: 'PURCHASE',
      title: 'خرید گچ سفید',
      quantity: 200,
      unit: 'بسته',
      priority: 'NORMAL',
    },
  ], 3);
  await approveRequestsSection(reportId);

  const pr = await prisma.purchaseRequest.findFirst({
    where: { requesterId: svUserId, projectId, status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(pr);

  const rejectRes = await request(app.getHttpServer())
    .post('/api/approvals/reject')
    .set(ADMIN_AUTH())
    .send({ module: 'purchase-request', id: pr.id, reason: 'قیمت بالاست' });
  assert.equal(rejectRes.status, 201, 'body: ' + JSON.stringify(rejectRes.body));

  const updatedPr = await prisma.purchaseRequest.findUnique({ where: { id: pr.id } });
  assert.equal(updatedPr.status, 'REJECTED');

  const poCount = await prisma.purchaseOrder.count({ where: { prId: pr.id } });
  assert.equal(poCount, 0, 'PO نباید ساخته شده باشد');
});

// ─────────────────────────────────────────────────────────────
test('procurement chain | MANPOWER request -> OTHER, no PR', async () => {
  const before = await prisma.purchaseRequest.count({
    where: { requesterId: svUserId, projectId },
  });

  const reportId = await createAndSubmitReport([
    {
      requestType: 'MANPOWER',
      title: 'نیاز به ۲ بنا',
      quantity: 2,
      unit: 'نفر',
    },
  ], 4);

  const result = await approveRequestsSection(reportId);
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail, 'detail باید باشد');
  assert.equal(detail.target, 'OTHER', 'targetType باید OTHER باشد');

  const after = await prisma.purchaseRequest.count({
    where: { requesterId: svUserId, projectId },
  });
  assert.equal(after, before, 'PR جدید نباید ساخته شده باشد');
});

// ─────────────────────────────────────────────────────────────
test('procurement chain | no PR until section approved', async () => {
  const before = await prisma.purchaseRequest.count({
    where: { requesterId: svUserId, projectId },
  });

  const reportId = await createAndSubmitReport([
    {
      requestType: 'PURCHASE',
      title: 'خرید کابل برق',
      quantity: 100,
      unit: 'متر',
    },
  ], 5);

  const after = await prisma.purchaseRequest.count({
    where: { requesterId: svUserId, projectId },
  });
  assert.equal(after, before, 'بدون تأیید بخش نباید PR بسازد');

  const r = await prisma.dailyReport.findUnique({ where: { id: reportId } });
  assert.equal(r.status, 'SUBMITTED');
});
