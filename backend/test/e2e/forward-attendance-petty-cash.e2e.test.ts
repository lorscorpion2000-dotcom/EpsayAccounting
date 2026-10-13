// test/e2e/forward-attendance-petty-cash.e2e.test.ts
// forwarder برای بخش WORKERS (OWN) و REQUESTS/PETTY_CASH
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

let app: any;
let prisma: any;
let svToken: string;
let svUserId: string;
let adminUserId: string;
let sectionsSvc: any;
let projectId: string;
let employeeId: string;
let pettyCashAccountId: string;

let createdProjectId: string | null = null;
let createdEmployeeId: string | null = null;
let createdPcAccountId: string | null = null;
let createdAdminId: string | null = null;

const SV_USERNAME = 'e2e_att_sv_' + Date.now();
const ADMIN_USERNAME = 'e2e_att_admin_' + Date.now();
const PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];

const BASE_DAYS_AGO = 2400 + Math.floor(Math.random() * 200);

function reportDateFor(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (BASE_DAYS_AGO + offset));
  return d.toISOString().slice(0, 10);
}

async function createAndSubmitReport(payload: any, offset: number): Promise<string> {
  const svAuth = { Authorization: 'Bearer ' + svToken };
  let lastErr: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request(app.getHttpServer())
      .post('/api/site-ops/daily-reports')
      .set(svAuth)
      .send({
        projectId,
        reportDate: reportDateFor(offset),
        operations: 'تست forwarder attendance/petty',
        ...payload,
      });
    if (res.status === 201) {
      const id = res.body.id;
      REPORT_IDS.push(id);
      const submitRes = await request(app.getHttpServer())
        .patch('/api/site-ops/daily-reports/' + id + '/submit')
        .set(svAuth);
      if (submitRes.status !== 200) throw new Error('submit failed: ' + JSON.stringify(submitRes.body));
      return id;
    }
    const msg = String(res.body?.message || '');
    if (res.status === 500 && msg.includes('Unique constraint')) {
      lastErr = new Error('race: ' + msg);
      await new Promise((r) => setTimeout(r, 60 + Math.random() * 120));
      continue;
    }
    throw new Error('create failed: ' + JSON.stringify(res.body));
  }
  throw lastErr || new Error('retries exhausted');
}

async function approveSection(reportId: string, section: 'WORKERS' | 'REQUESTS') {
  return sectionsSvc.approve(reportId, section, adminUserId);
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
  const { DailyReportSectionsService } = await import('../../src/modules/site-ops/daily-report-sections.service');

  app = await createTestApp();
  prisma = app.get(PrismaService);
  sectionsSvc = app.get(DailyReportSectionsService);

  // project
  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'E2E-ATT-' + Date.now(),
        name: 'E2E Attendance/Petty Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  // employee (Partner type=EMPLOYEE)
  const emp = await prisma.partner.create({
    data: {
      code: 'E2E-EMP-' + Date.now(),
      name: 'E2E Test Employee',
      type: 'EMPLOYEE',
      isActive: true,
    },
  });
  employeeId = emp.id;
  createdEmployeeId = emp.id;

  // roles
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const svRole = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!superRole || !svRole) throw new Error('roles یافت نشد');

  // admin user
  const adminHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      fullName: 'E2E ATT Admin',
      passwordHash: adminHash,
      isActive: true,
      roles: { create: [{ roleId: superRole.id }] },
    },
  });
  adminUserId = admin.id;
  createdAdminId = admin.id;

  // petty cash account (holder = admin)
  const pca = await prisma.pettyCashAccount.create({
    data: {
      code: 'E2E-PCA-' + Date.now(),
      name: 'E2E Petty Cash Account',
      holderId: adminUserId,
      projectId,
      balance: 1000000,
      isActive: true,
    },
  });
  pettyCashAccountId = pca.id;
  createdPcAccountId = pca.id;

  // sv user
  const svHash = await bcrypt.hash(PASSWORD, 10);
  const sv = await prisma.user.create({
    data: {
      username: SV_USERNAME,
      fullName: 'E2E ATT Supervisor',
      passwordHash: svHash,
      isActive: true,
      roles: { create: [{ roleId: svRole.id }] },
    },
  });
  svUserId = sv.id;

  const svLogin = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: SV_USERNAME, password: PASSWORD });
  if (svLogin.status !== 201) throw new Error('sv login: ' + JSON.stringify(svLogin.body));
  svToken = svLogin.body.accessToken;
});

after(async () => {
  if (prisma) {
    try {
      if (REPORT_IDS.length) {
        await prisma.dailyReportSection.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportForwarding.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportWorker.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportRequest.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
      }
      if (createdEmployeeId) {
        await prisma.dailyWorkLog.deleteMany({ where: { employeeId: createdEmployeeId } });
        await prisma.attendance.deleteMany({ where: { employeeId: createdEmployeeId } });
      }
      if (createdPcAccountId) {
        await prisma.pettyCashRequest.deleteMany({ where: { accountId: createdPcAccountId } });
        await prisma.pettyCashAccount.deleteMany({ where: { id: createdPcAccountId } });
      }
      if (createdEmployeeId) {
        await prisma.partner.deleteMany({ where: { id: createdEmployeeId } });
      }
      if (createdAdminId) {
        await prisma.userRole.deleteMany({ where: { userId: createdAdminId } });
        await prisma.user.deleteMany({ where: { id: createdAdminId } });
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

// ─────────────────────────────────────────────────────────────
test('forward WORKERS OWN | creates DailyWorkLog + Attendance', async () => {
  const reportId = await createAndSubmitReport({
    workers: [
      {
        kind: 'OWN',
        teamName: 'اکیپ E2E',
        employeeId,
        workerCount: 1,
        workHours: 8,
        overtime: 2,
        status: 'PRESENT',
      },
    ],
  }, 0);

  const result = await approveSection(reportId, 'WORKERS');
  assert.ok(result.forward, 'forward باید باشد');
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const workDate = new Date(reportDateFor(0) + 'T00:00:00Z');

  const log = await prisma.dailyWorkLog.findFirst({
    where: { employeeId, workDate },
  });
  assert.ok(log, 'DailyWorkLog باید ساخته شده باشد');
  assert.equal(Number(log.regularHours), 8);
  assert.equal(Number(log.overtimeHours), 2);
  assert.equal(log.status, 'PRESENT');
  assert.equal(log.projectId, projectId);

  const att = await prisma.attendance.findFirst({
    where: { employeeId, attendanceDate: workDate },
  });
  assert.ok(att, 'Attendance باید ساخته شده باشد');
  assert.equal(Number(att.workHours), 8);
  assert.equal(Number(att.overtimeHours), 2);
  assert.equal(att.status, 'PRESENT');
});

// ─────────────────────────────────────────────────────────────
test('forward WORKERS CONTRACTOR | OTHER archived, no SubcontractorStatement', async () => {
  const before = await prisma.subcontractorStatement.count({
    where: { projectId, contractorId: employeeId },
  });

  const reportId = await createAndSubmitReport({
    workers: [
      {
        kind: 'CONTRACTOR',
        teamName: 'اکیپ پیمانکار E2E',
        workerCount: 5,
        workHours: 8,
        overtime: 0,
        status: 'PRESENT',
      },
    ],
  }, 1);

  const result = await approveSection(reportId, 'WORKERS');
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail, 'detail باید باشد');
  assert.equal(detail.target, 'OTHER', 'body: ' + JSON.stringify(result.forward));

  const after = await prisma.subcontractorStatement.count({
    where: { projectId, contractorId: employeeId },
  });
  assert.equal(after, before, 'SubcontractorStatement نباید ساخته شده باشد');

  // هیچ DailyWorkLog با این گزارش اضافه نشده
  const workDate = new Date(reportDateFor(1) + 'T00:00:00Z');
  const logCount = await prisma.dailyWorkLog.count({
    where: { employeeId, workDate },
  });
  assert.equal(logCount, 0, 'DailyWorkLog برای CONTRACTOR نباید ساخته شود');
});

// ─────────────────────────────────────────────────────────────
test('forward REQUESTS PETTY_CASH | creates PettyCashRequest PENDING', async () => {
  const reportId = await createAndSubmitReport({
    requests: [
      {
        requestType: 'PETTY_CASH',
        title: 'خرید ابزار دستی',
        description: 'برای تعمیرات',
        amount: 500000,
        pettyCashAccountId,
      },
    ],
  }, 2);

  const result = await approveSection(reportId, 'REQUESTS');
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const pcr = await prisma.pettyCashRequest.findFirst({
    where: { accountId: pettyCashAccountId },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(pcr, 'PettyCashRequest باید ساخته شده باشد');
  assert.equal(pcr.status, 'PENDING');
  assert.equal(Number(pcr.amount), 500000);
  assert.equal(Number(pcr.currentBalance), 1000000);
  assert.match(pcr.reason, /خرید ابزار دستی/);
  assert.match(pcr.code, /^PCR-\d{4}-\d{4}$/);
});

// ─────────────────────────────────────────────────────────────
test('forward REQUESTS PETTY_CASH without accountId | OTHER, no PCR', async () => {
  const before = await prisma.pettyCashRequest.count({ where: { accountId: pettyCashAccountId } });

  const reportId = await createAndSubmitReport({
    requests: [
      {
        requestType: 'PETTY_CASH',
        title: 'بدون حساب تنخواه',
        amount: 100000,
      },
    ],
  }, 3);

  const result = await approveSection(reportId, 'REQUESTS');
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail);
  assert.equal(detail.target, 'OTHER', 'body: ' + JSON.stringify(result.forward));

  const after = await prisma.pettyCashRequest.count({ where: { accountId: pettyCashAccountId } });
  assert.equal(after, before, 'PettyCashRequest جدید نباید ساخته شده باشد');
});
