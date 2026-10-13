// test/e2e/forward-materials.e2e.test.ts
// forwarder برای بخش MATERIALS گزارش روزانه
// IN → GoodsReceipt, OUT/CONSUMPTION → GoodsIssue, بدون itemId/warehouseId → OTHER
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
let warehouseId: string;
let itemId: string;

let createdProjectId: string | null = null;
let createdWarehouseId: string | null = null;
let createdItemId: string | null = null;
let createdAdminId: string | null = null;

const SV_USERNAME = 'e2e_mat_sv_' + Date.now();
const ADMIN_USERNAME = 'e2e_mat_admin_' + Date.now();
const PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];

// پایه یکتا برای این فایل
const BASE_DAYS_AGO = 1600 + Math.floor(Math.random() * 200);

function reportDateFor(offset: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (BASE_DAYS_AGO + offset));
  return d.toISOString().slice(0, 10);
}

async function createAndSubmitReport(materials: any[], offset: number): Promise<string> {
  const svAuth = { Authorization: 'Bearer ' + svToken };
  let lastErr: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request(app.getHttpServer())
      .post('/api/site-ops/daily-reports')
      .set(svAuth)
      .send({
        projectId,
        reportDate: reportDateFor(offset),
        operations: 'تست forwarder materials',
        materials,
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

async function approveMaterials(reportId: string) {
  return sectionsSvc.approve(reportId, 'MATERIALS', adminUserId);
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
        code: 'E2E-MAT-' + Date.now(),
        name: 'E2E Materials Project',
        status: 'IN_PROGRESS',
      },
    });
    createdProjectId = project.id;
  }
  projectId = project.id;

  // warehouse
  const wh = await prisma.warehouse.create({
    data: {
      code: 'E2E-WH-' + Date.now(),
      name: 'E2E Materials Warehouse',
      type: 'SITE',
      projectId,
      isActive: true,
    },
  });
  warehouseId = wh.id;
  createdWarehouseId = wh.id;

  // item
  const item = await prisma.item.create({
    data: {
      code: 'E2E-ITM-' + Date.now(),
      name: 'E2E Materials Item',
      type: 'MATERIAL',
      unit: 'NUMBER',
      isActive: true,
    },
  });
  itemId = item.id;
  createdItemId = item.id;

  // roles
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const svRole = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  if (!superRole || !svRole) throw new Error('roles یافت نشد');

  // admin user
  const adminHash = await bcrypt.hash(PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      fullName: 'E2E Materials Admin',
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
      fullName: 'E2E Materials Supervisor',
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
        await prisma.dailyReportMaterial.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
        await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
      }
      // GoodsReceipt/Issue مرتبط با این item/warehouse
      if (createdWarehouseId) {
        const receipts = await prisma.goodsReceipt.findMany({
          where: { warehouseId: createdWarehouseId },
          select: { id: true },
        });
        const receiptIds = receipts.map((r: any) => r.id);
        if (receiptIds.length) {
          await prisma.goodsReceiptItem.deleteMany({ where: { receiptId: { in: receiptIds } } });
          await prisma.goodsReceipt.deleteMany({ where: { id: { in: receiptIds } } });
        }
        const issues = await prisma.goodsIssue.findMany({
          where: { warehouseId: createdWarehouseId },
          select: { id: true },
        });
        const issueIds = issues.map((i: any) => i.id);
        if (issueIds.length) {
          await prisma.goodsIssueItem.deleteMany({ where: { issueId: { in: issueIds } } });
          await prisma.goodsIssue.deleteMany({ where: { id: { in: issueIds } } });
        }
        await prisma.warehouse.deleteMany({ where: { id: createdWarehouseId } });
      }
      if (createdItemId) {
        await prisma.item.deleteMany({ where: { id: createdItemId } });
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
test('forward MATERIALS IN | creates GoodsReceipt SUBMITTED', async () => {
  const reportId = await createAndSubmitReport([
    {
      itemId,
      warehouseId,
      itemName: 'سیمان تیپ ۲',
      unit: 'بسته',
      quantity: 50,
      movementType: 'IN',
      supplier: 'تأمین‌کننده تست',
      billNumber: 'BILL-001',
      vehiclePlate: '11-222-33',
      qcResult: 'ACCEPTED',
    },
  ], 0);

  const result = await approveMaterials(reportId);
  assert.ok(result.forward, 'forward باید باشد');
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const receipt = await prisma.goodsReceipt.findFirst({
    where: { warehouseId, projectId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(receipt, 'GoodsReceipt باید ساخته شده باشد');
  assert.equal(receipt.status, 'SUBMITTED');
  assert.equal(receipt.warehouseId, warehouseId);
  assert.equal(receipt.projectId, projectId);
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].itemId, itemId);
  assert.equal(Number(receipt.items[0].quantity), 50);
});

// ─────────────────────────────────────────────────────────────
test('forward MATERIALS OUT | creates GoodsIssue SUBMITTED', async () => {
  const reportId = await createAndSubmitReport([
    {
      itemId,
      warehouseId,
      itemName: 'آجر فشاری',
      unit: 'عدد',
      quantity: 1000,
      movementType: 'OUT',
      exitDest: 'بلوک A',
    },
  ], 1);

  const result = await approveMaterials(reportId);
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const issue = await prisma.goodsIssue.findFirst({
    where: { warehouseId, projectId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(issue, 'GoodsIssue باید ساخته شده باشد');
  assert.equal(issue.status, 'SUBMITTED');
  assert.equal(issue.items.length, 1);
  assert.equal(Number(issue.items[0].quantity), 1000);
});

// ─────────────────────────────────────────────────────────────
test('forward MATERIALS CONSUMPTION | creates GoodsIssue', async () => {
  const reportId = await createAndSubmitReport([
    {
      itemId,
      warehouseId,
      itemName: 'گچ سفید',
      unit: 'بسته',
      quantity: 30,
      movementType: 'CONSUMPTION',
    },
  ], 2);

  const result = await approveMaterials(reportId);
  assert.ok(result.forward);
  assert.equal(result.forward.success, 1, 'body: ' + JSON.stringify(result.forward));

  const issue = await prisma.goodsIssue.findFirst({
    where: { warehouseId, projectId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  assert.ok(issue);
  assert.equal(Number(issue.items[0].quantity), 30);
});

// ─────────────────────────────────────────────────────────────
test('forward MATERIALS | without itemId/warehouseId -> OTHER', async () => {
  const before = {
    receipts: await prisma.goodsReceipt.count({ where: { warehouseId } }),
    issues: await prisma.goodsIssue.count({ where: { warehouseId } }),
  };

  const reportId = await createAndSubmitReport([
    {
      itemName: 'کالای بدون شناسه',
      quantity: 10,
      unit: 'عدد',
      movementType: 'IN',
    },
  ], 3);

  const result = await approveMaterials(reportId);
  assert.ok(result.forward);
  const detail = result.forward.details?.[0];
  assert.ok(detail);
  assert.equal(detail.target, 'OTHER', 'body: ' + JSON.stringify(result.forward));

  const after = {
    receipts: await prisma.goodsReceipt.count({ where: { warehouseId } }),
    issues: await prisma.goodsIssue.count({ where: { warehouseId } }),
  };
  assert.equal(after.receipts, before.receipts, 'GoodsReceipt جدید نباید ساخته شده باشد');
  assert.equal(after.issues, before.issues, 'GoodsIssue جدید نباید ساخته شده باشد');
});
