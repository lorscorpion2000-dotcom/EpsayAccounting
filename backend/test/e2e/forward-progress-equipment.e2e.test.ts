// test/e2e/forward-progress-equipment.e2e.test.ts
// forwarder برای بخش PROGRESS و EQUIPMENTS گزارش روزانه
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

let app: any;
let prisma: any;
let adminUserId: string;
let sectionsSvc: any;
let svToken: string;
let svUserId: string;
let projectId: string;
let wbsItemId: string;
let equipmentId: string;

let createdProjectId: string | null = null;
let createdWbsId: string | null = null;
let createdEquipmentId: string | null = null;
let createdAdminId: string | null = null;

const SV_USERNAME = 'e2e_fpe_sv_' + Date.now();
const ADMIN_USERNAME = 'e2e_fpe_admin_' + Date.now();
const PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];

const BASE_DAYS_AGO = 1200 + Math.floor(Math.random() * 300);

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
        operations: 'تست forwarder',
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
  throw lastErr || new Error('create retries exhausted');
}

async function approveSection(reportId: string, sectionType: string) {
  // service direct (بدون نیاز به permission approvals.approve)
  const result = await sectionsSvc.approve(reportId, sectionType, adminUserId);
  return result;
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

  // project
  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'E2E-FPE-' + Date.now(),
        name: 'E2E FPE Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  // WBS item
  const wbs = await prisma.wbsItem.create({
    data: {
      projectId,
      code: 'E2E-WBS-' + Date.now(),
      title: 'E2E WBS Item',
      level: 'WORK_PACKAGE',
      unit: 'مترمربع',
      quantity: 100,
    },
  });
  wbsItemId = wbs.id;
  createdWbsId = wbs.id;

  // Equipment
  const eq = await prisma.equipment.create({
    data: {
      code: 'E2E-EQ-' + Date.now(),
      name: 'لودر E2E',
      ownership: 'OWNED',
      isActive: true,
      status: 'ACTIVE',
      currentProjectId: projectId,
    },
  });
  equipmentId = eq.id;
  createdEquipmentId = eq.id;

  // roles
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const svRole = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!superRole || !svRole) throw new Error('roles یافت نشد');

  // admin user
  const adminHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      fullName: 'E2E FPE Admin',
      passwordHash: adminHash,
      isActive: true,
      roles: { create: [{ roleId: superRole.id }] },
    },
  });
  createdAdminId = admin.id;

  // استفاده مستقیم از سرویس برای bypass کردن permission check در CI
  const { DailyReportSectionsService } = await import('../../src/modules/site-ops/daily-report-sections.service');
  sectionsSvc = app.get(DailyReportSectionsService);

  const adminLogin = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: ADMIN_USERNAME, password: PASSWORD });
  if (adminLogin.status !== 201) throw new Error('admin login: ' + JSON.stringify(adminLogin.body));
  adminUserId = admin.id;

  // sv user
  const svHash = await bcrypt.hash(PASSWORD, 10);
  const sv = await prisma.user.create({
    data: {
      username: SV_USERNAME,
      fullName: 'E2E FPE Supervisor',
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
        await prisma.dailyReportProgress.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReportEquipment.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
      }
      // WbsProgressSnapshot با reportId وابسته
      if (wbsItemId) {
        await prisma.wbsProgressSnapshot.deleteMany({ where: { wbsItemId } });
      }
      if (equipmentId) {
        await prisma.equipmentDailyLog.deleteMany({ where: { equipmentId } });
      }
      if (createdEquipmentId) {
        await prisma.equipment.deleteMany({ where: { id: createdEquipmentId } });
      }
      if (createdWbsId) {
        await prisma.wbsItem.deleteMany({ where: { id: createdWbsId } });
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
test('forward PROGRESS | approved section creates WbsProgressSnapshot', async () => {
  const reportId = await createAndSubmitReport({
    progresses: [
      {
        wbsItemId,
        description: 'بتن‌ریزی فونداسیون',
        progressPct: 25,
        quantity: 10,
        unit: 'مترمربع',
        location: 'بلوک A',
      },
    ],
  }, 0);

  const result = await approveSection(reportId, 'PROGRESS');
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'forward success=' + result.forward.success);

  const snapshot = await prisma.wbsProgressSnapshot.findFirst({
    where: { wbsItemId, reportId },
  });
  assert.ok(snapshot, 'WbsProgressSnapshot باید ساخته شده باشد');
  assert.equal(snapshot.projectId, projectId);
  assert.equal(Number(snapshot.quantity), 10);
  assert.equal(Number(snapshot.progressPct), 25);
  assert.equal(snapshot.location, 'بلوک A');
});

// ─────────────────────────────────────────────────────────────
test('forward EQUIPMENTS | approved section creates EquipmentDailyLog', async () => {
  const reportId = await createAndSubmitReport({
    equipments: [
      {
        equipmentId,
        name: 'لودر E2E',
        plateNumber: 'E2E-123',
        operator: 'علی',
        hoursWorked: 6,
        fuelLiters: 40,
        status: 'ACTIVE',
        wbsItemId,
      },
    ],
  }, 1);

  const result = await approveSection(reportId, 'EQUIPMENTS');
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'forward body: ' + JSON.stringify(result.forward));

  const log = await prisma.equipmentDailyLog.findFirst({
    where: { equipmentId, projectId },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(log, 'EquipmentDailyLog باید ساخته شده باشد');
  assert.equal(Number(log.workHours), 6);
  assert.equal(Number(log.fuelLiters), 40);
  assert.equal(log.wbsItemId, wbsItemId);
  assert.equal(log.status, 'DRAFT');
});

// ─────────────────────────────────────────────────────────────
test('forward PROGRESS | row without wbsItemId -> OTHER', async () => {
  const reportId = await createAndSubmitReport({
    progresses: [
      {
        description: 'بدون wbs',
        progressPct: 10,
      },
    ],
  }, 2);

  const result = await approveSection(reportId, 'PROGRESS');
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail, 'detail باید باشد');
  assert.equal(detail.target, 'OTHER');
});

// ─────────────────────────────────────────────────────────────
test('forward EQUIPMENTS | row without equipmentId -> OTHER', async () => {
  const reportId = await createAndSubmitReport({
    equipments: [
      {
        name: 'ماشین بدون شناسه',
        hoursWorked: 4,
        status: 'ACTIVE',
      },
    ],
  }, 3);

  const result = await approveSection(reportId, 'EQUIPMENTS');
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail, 'detail باید باشد');
  assert.equal(detail.target, 'OTHER');
});
