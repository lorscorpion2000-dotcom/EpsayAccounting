// test/e2e/approvals-filter.e2e.test.ts
// اثبات فیلتر role-based برای /api/approvals/pending
// admin همه SUBMITTED را می‌بیند، site_supervisor فقط گزارش‌های خودش
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { loginAdmin } from './_helpers';

let app: any;
let prisma: any;
let adminToken: string;
let svToken: string;
let svUserId: string;
let otherUserId: string;
let projectId: string;
let createdProjectId: string | null = null;

const createdReportIds: string[] = [];
const SV_USERNAME = 'e2e_sv_' + Date.now();
const SV_PASSWORD = 'Test@1234';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// برای اطمینان از یکتا بودن (project_id, report_date) در برابر seed
const BASE_DAYS_AGO = 500;

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
  adminToken = await loginAdmin(app);

  // role
  const role = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!role) throw new Error('role site_supervisor یافت نشد — seed را اجرا کن');

  // project
  // پروژه: از seed یا ساخت موقت
  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'E2E-PRJ-' + Date.now(),
        name: 'E2E Test Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  // admin user
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminUser) throw new Error('admin یافت نشد');
  otherUserId = adminUser.id;

  // user تستی
  const hash = await bcrypt.hash(SV_PASSWORD, 10);
  const svUser = await prisma.user.create({
    data: {
      username: SV_USERNAME,
      fullName: 'E2E Site Supervisor',
      passwordHash: hash,
      isActive: true,
      roles: { create: [{ roleId: role.id }] },
    },
  });
  svUserId = svUser.id;

  // login sv
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: SV_USERNAME, password: SV_PASSWORD });
  if (loginRes.status !== 201) throw new Error('sv login failed: ' + JSON.stringify(loginRes.body));
  svToken = loginRes.body.accessToken;

  // پاک‌سازی preemptive (اگر test قبلی ناتمام مونده باشد)
  await prisma.dailyReportSection.deleteMany({
    where: { report: { code: { startsWith: 'E2E-' } } },
  });
  await prisma.dailyReport.deleteMany({
    where: { code: { startsWith: 'E2E-' } },
  });

  // گزارش‌های تستی
  const reports = [
    { code: 'E2E-SV-SUB-' + Date.now(), day: BASE_DAYS_AGO + 0, status: 'SUBMITTED', createdById: svUserId },
    { code: 'E2E-SV-REJ-' + Date.now(), day: BASE_DAYS_AGO + 1, status: 'REJECTED', createdById: svUserId, rejectedReason: 'test' },
    { code: 'E2E-OTH-SUB-' + Date.now(), day: BASE_DAYS_AGO + 2, status: 'SUBMITTED', createdById: otherUserId },
    { code: 'E2E-OTH-REJ-' + Date.now(), day: BASE_DAYS_AGO + 3, status: 'REJECTED', createdById: otherUserId, rejectedReason: 'test' },
  ];
  for (const r of reports) {
    const row = await prisma.dailyReport.create({
      data: {
        code: r.code,
        projectId,
        reportDate: daysAgo(r.day),
        status: r.status as any,
        rejectedReason: r.rejectedReason ?? null,
        createdById: r.createdById,
      },
    });
    createdReportIds.push(row.id);
  }
});

after(async () => {
  if (prisma) {
    try {
      if (createdReportIds.length) {
        await prisma.dailyReportSection.deleteMany({ where: { reportId: { in: createdReportIds } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: createdReportIds } } });
      }
      if (svUserId) {
        await prisma.userRole.deleteMany({ where: { userId: svUserId } });
        await prisma.user.deleteMany({ where: { id: svUserId } });
      }
      if (createdProjectId) {
        await prisma.project.deleteMany({ where: { id: createdProjectId } });
      }
    } catch (e) {
      // ignore
    }
  }
  if (app) await app.close();
});

const ADMIN_AUTH = () => ({ Authorization: 'Bearer ' + adminToken });
const SV_AUTH = () => ({ Authorization: 'Bearer ' + svToken });

// ─────────────────────────────────────────────────────────────
// 1) site_supervisor می‌تواند endpoint را بخواند (approvals.read دارد)
// ─────────────────────────────────────────────────────────────
test('approvals/pending | site_supervisor -> 200 (approvals.read)', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/approvals/pending')
    .set(SV_AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.dailyReports), 'dailyReports باید آرایه باشد');
});

// ─────────────────────────────────────────────────────────────
// 2) admin همه SUBMITTED ها را می‌بیند
// ─────────────────────────────────────────────────────────────
test('approvals/pending | admin sees SUBMITTED from anyone', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/approvals/pending')
    .set(ADMIN_AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));

  const ids = res.body.dailyReports.map((r: any) => r.id);

  const svSubmitted = createdReportIds[0];
  const svRejected = createdReportIds[1];
  const otherSubmitted = createdReportIds[2];
  const otherRejected = createdReportIds[3];

  // admin همه SUBMITTED را می‌بیند
  assert.ok(ids.includes(svSubmitted), 'admin باید SV-SUB را ببیند');
  assert.ok(ids.includes(otherSubmitted), 'admin باید OTHER-SUB را ببیند');

  // admin همه REJECTED خودش را می‌بیند، ولی نه REJECTED دیگران
  assert.ok(ids.includes(otherRejected), 'admin باید REJECTED خودش را ببیند');
  assert.ok(!ids.includes(svRejected), 'admin نباید REJECTED که SV ساخته را ببیند');
});

// ─────────────────────────────────────────────────────────────
// 3) site_supervisor فقط گزارش‌های خودش
// ─────────────────────────────────────────────────────────────
test('approvals/pending | site_supervisor only sees own reports', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/approvals/pending')
    .set(SV_AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));

  const ids = res.body.dailyReports.map((r: any) => r.id);

  const svSubmitted = createdReportIds[0];
  const svRejected = createdReportIds[1];
  const otherSubmitted = createdReportIds[2];
  const otherRejected = createdReportIds[3];

  assert.ok(ids.includes(svSubmitted), 'SV باید SUBMITTED خودش را ببیند');
  assert.ok(ids.includes(svRejected), 'SV باید REJECTED خودش را ببیند');
  assert.ok(!ids.includes(otherSubmitted), 'SV نباید SUBMITTED دیگران را ببیند');
  assert.ok(!ids.includes(otherRejected), 'SV نباید REJECTED دیگران را ببیند');
});

// ─────────────────────────────────────────────────────────────
// 4) همه dailyReports برگشتی متعلق به SV هستند
// ─────────────────────────────────────────────────────────────
test('approvals/pending | all dailyReports belong to supervisor', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/approvals/pending')
    .set(SV_AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));

  const ourReports = res.body.dailyReports.filter((r: any) =>
    createdReportIds.includes(r.id),
  );
  assert.ok(ourReports.length >= 2, 'حداقل ۲ گزارش از SV باید باشد');

  // چک raw.createdById
  for (const r of ourReports) {
    assert.equal(
      r.raw.createdById,
      svUserId,
      'همه dailyReports برگشتی باید createdById = SV داشته باشند',
    );
  }
});
