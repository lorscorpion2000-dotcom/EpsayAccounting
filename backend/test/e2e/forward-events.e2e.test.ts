// test/e2e/forward-events.e2e.test.ts
// forwarder برای بخش EVENTS گزارش روزانه — Notification می‌سازد
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

let createdProjectId: string | null = null;
let createdAdminId: string | null = null;

const SV_USERNAME = 'e2e_evt_sv_' + Date.now();
const ADMIN_USERNAME = 'e2e_evt_admin_' + Date.now();
const PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];
const NOTIF_ENTITY_IDS: string[] = [];

const BASE_DAYS_AGO = 2800 + Math.floor(Math.random() * 200);

function reportDateFor(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (BASE_DAYS_AGO + offset));
  return d.toISOString().slice(0, 10);
}

async function createAndSubmitReport(events: any[], offset: number): Promise<string> {
  const svAuth = { Authorization: 'Bearer ' + svToken };
  let lastErr: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request(app.getHttpServer())
      .post('/api/site-ops/daily-reports')
      .set(svAuth)
      .send({
        projectId,
        reportDate: reportDateFor(offset),
        operations: 'تست forwarder events',
        events,
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

async function approveEvents(reportId: string) {
  return sectionsSvc.approve(reportId, 'EVENTS', adminUserId);
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
        code: 'E2E-EVT-' + Date.now(),
        name: 'E2E Events Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  // roles
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const svRole = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!superRole || !svRole) throw new Error('roles یافت نشد');

  // admin user
  const adminHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      fullName: 'E2E EVT Admin',
      passwordHash: adminHash,
      isActive: true,
      roles: { create: [{ roleId: superRole.id }] },
    },
  });
  adminUserId = admin.id;
  createdAdminId = admin.id;

  // sv user
  const svHash = await bcrypt.hash(PASSWORD, 10);
  const sv = await prisma.user.create({
    data: {
      username: SV_USERNAME,
      fullName: 'E2E EVT Supervisor',
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
      if (NOTIF_ENTITY_IDS.length) {
        await prisma.notification.deleteMany({
          where: { type: 'SITE_INCIDENT', entity: 'DailyReport', entityId: { in: NOTIF_ENTITY_IDS } },
        });
      }
      if (REPORT_IDS.length) {
        await prisma.dailyReportSection.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportForwarding.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportEvent.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
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
test('forward EVENTS INCIDENT | creates CRITICAL notification', async () => {
  const reportId = await createAndSubmitReport([
    {
      eventType: 'INCIDENT',
      title: 'حادثه سقوط از ارتفاع',
      description: 'کارگر از طبقه سوم سقوط کرد',
      severity: 'HIGH',
      actorName: 'علی رضایی',
    },
  ], 0);

  const result = await approveEvents(reportId);
  assert.ok(result.forward, 'forward باید باشد');
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const entityId = reportId + ':EVENTS:1';
  NOTIF_ENTITY_IDS.push(entityId);

  const notif = await prisma.notification.findFirst({
    where: { type: 'SITE_INCIDENT', entity: 'DailyReport', entityId },
  });
  assert.ok(notif, 'Notification باید ساخته شده باشد');
  assert.equal(notif.severity, 'CRITICAL');
  assert.match(notif.title, /حادثه/);
  assert.match(notif.message, /سقوط از ارتفاع/);
  assert.match(notif.link || '', /\/site-ops\/daily-reports\//);
});

// ─────────────────────────────────────────────────────────────
test('forward EVENTS STOP | creates WARNING notification', async () => {
  const reportId = await createAndSubmitReport([
    {
      eventType: 'STOP',
      title: 'توقف کار به دلیل بارش',
      description: 'بارش شدید باران',
      severity: 'MEDIUM',
    },
  ], 1);

  const result = await approveEvents(reportId);
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const entityId = reportId + ':EVENTS:1';
  NOTIF_ENTITY_IDS.push(entityId);

  const notif = await prisma.notification.findFirst({
    where: { type: 'SITE_INCIDENT', entity: 'DailyReport', entityId },
  });
  assert.ok(notif, 'Notification باید ساخته شده باشد');
  assert.equal(notif.severity, 'WARNING');
  assert.match(notif.title, /توقف/);
  assert.match(notif.message, /بارش/);
});
