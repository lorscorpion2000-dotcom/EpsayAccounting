// test/e2e/procurement-full-chain.e2e.test.ts
// زنجیره: گزارش → PR → approve → PO → GR (from-PO) → post → PI (from-GR) → approve → JE
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

let app: any, prisma: any;
let adminToken: string, svToken: string, svUserId: string;
let projectId: string, warehouseId: string, itemId: string, supplierId: string;
let createdProjectId: string | null = null;
let testAdminUserId: string | null = null;
let sectionsSvc: any, approvalsSvc: any, receiptsSvc: any, piSvc: any;
const TEST_ADMIN_USERNAME = 'e2e_fc_admin_' + Date.now();
const TEST_ADMIN_PASSWORD = 'Admin@1234';
const SV_USERNAME = 'e2e_fc_sv_' + Date.now();
const SV_PASSWORD = 'Test@1234';
const REPORT_IDS: string[] = [];
const BASE_DAYS_AGO = 1500 + Math.floor(Math.random() * 300);

function reportDateFor(offset: number): string {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (BASE_DAYS_AGO + offset));
  return d.toISOString().slice(0, 10);
}

async function createAndSubmitReport(requests: any[], offset: number): Promise<string> {
  const svAuth = { Authorization: 'Bearer ' + svToken };
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await request(app.getHttpServer()).post('/api/site-ops/daily-reports').set(svAuth)
      .send({ projectId, reportDate: reportDateFor(offset), operations: 'تست زنجیره', requests });
    if (res.status === 201) {
      const id = res.body.id; REPORT_IDS.push(id);
      const s = await request(app.getHttpServer()).patch('/api/site-ops/daily-reports/' + id + '/submit').set(svAuth);
      if (s.status !== 200) throw new Error('submit failed: ' + JSON.stringify(s.body));
      return id;
    }
    if (res.status === 500 && String(res.body?.message || '').includes('Unique constraint')) {
      await new Promise((r) => setTimeout(r, 80)); continue;
    }
    throw new Error('create failed: ' + JSON.stringify(res.body));
  }
  throw new Error('create retries exhausted');
}

async function makeChainWithPrices(qty: number, price: number, offset: number) {
  const reportId = await createAndSubmitReport([
    { requestType: 'PURCHASE', title: 'خرید تست ' + offset, quantity: qty, unit: 'عدد', priority: 'HIGH' },
  ], offset);
  const r = await sectionsSvc.approve(reportId, 'REQUESTS', testAdminUserId!);
  assert.equal(r.forward.success, 1);
  const pr = await prisma.purchaseRequest.findFirst({
    where: { requesterId: svUserId, projectId, status: 'SUBMITTED' },
    orderBy: { createdAt: 'desc' }, include: { items: true },
  });
  await approvalsSvc.approve('purchase-request', pr.id, testAdminUserId!);
  const po = await prisma.purchaseOrder.findFirst({ where: { prId: pr.id }, include: { items: true } });
  await prisma.purchaseOrder.update({ where: { id: po.id }, data: { supplierId } });
  await prisma.purchaseOrderItem.updateMany({ where: { poId: po.id }, data: { unitPrice: price, totalPrice: price * qty } });
  const poRefreshed = await prisma.purchaseOrder.findFirst({ where: { id: po.id }, include: { items: true } });
  return { pr, po: poRefreshed };
}

before(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  const { createTestApp } = await import('./setup');
  const { PrismaService } = await import('../../src/shared/prisma/prisma.service');
  app = await createTestApp(); prisma = app.get(PrismaService);
  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const adminHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
  const tAdmin = await prisma.user.create({ data: { username: TEST_ADMIN_USERNAME, fullName: 'E2E FC Admin', passwordHash: adminHash, isActive: true, roles: { create: [{ roleId: superRole.id }] } } });
  testAdminUserId = tAdmin.id;
  const { DailyReportSectionsService } = await import('../../src/modules/site-ops/daily-report-sections.service');
  const { ApprovalsService } = await import('../../src/modules/approvals/approvals.service');
  const { ReceiptsService } = await import('../../src/modules/warehouse/receipts.service');
  const { PurchaseInvoicesService } = await import('../../src/modules/purchase-invoices/purchase-invoices.service');
  sectionsSvc = app.get(DailyReportSectionsService);
  approvalsSvc = app.get(ApprovalsService);
  receiptsSvc = app.get(ReceiptsService);
  piSvc = app.get(PurchaseInvoicesService);
  const aL = await request(app.getHttpServer()).post('/api/auth/login').send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });
  adminToken = aL.body.accessToken;
  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) { project = await prisma.project.create({ data: { code: 'E2E-FC-' + Date.now(), name: 'E2E FC', status: 'IN_PROGRESS' } }); createdProjectId = project.id; }
  projectId = project.id;
  let wh = await prisma.warehouse.findFirst({ where: { deletedAt: null } });
  if (!wh) wh = await prisma.warehouse.create({ data: { code: 'E2E-WH-' + Date.now(), name: 'E2E WH', type: 'MAIN', isActive: true } as any });
  warehouseId = wh.id;
  let item = await prisma.item.findFirst({ where: { deletedAt: null } });
  if (!item) item = await prisma.item.create({ data: { code: 'E2E-IT-' + Date.now(), name: 'E2E Item', type: 'MATERIAL', unit: 'NUMBER', isActive: true } as any });
  itemId = item.id;
  let sup = await prisma.partner.findFirst({ where: { type: 'SUPPLIER' } });
  if (!sup) sup = await prisma.partner.create({ data: { code: 'E2E-SUP-' + Date.now(), name: 'E2E Sup', type: 'SUPPLIER', isActive: true } as any });
  supplierId = sup.id;
  const role = await prisma.role.findUnique({ where: { code: 'site_supervisor' } });
  const hash = await bcrypt.hash(SV_PASSWORD, 10);
  const sv = await prisma.user.create({ data: { username: SV_USERNAME, fullName: 'E2E FC SV', passwordHash: hash, isActive: true, roles: { create: [{ roleId: role.id }] } } });
  svUserId = sv.id;
  // ── Fiscal Year برای امروز (نیاز JE) ──
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const fyStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const fyEnd   = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
  const fyCode = String(today.getUTCFullYear());
  const existingFy = await prisma.fiscalYear.findFirst({ where: { code: fyCode } });
  if (!existingFy) {
    await prisma.fiscalYear.create({
      data: {
        code: fyCode,
        name: 'سال مالی ' + fyCode,
        startDate: fyStart,
        endDate: fyEnd,
        status: 'OPEN' as any,
        isCurrent: true,
      } as any,
    });
  } else {
  }

  const sL = await request(app.getHttpServer()).post('/api/auth/login').send({ username: SV_USERNAME, password: SV_PASSWORD });
  svToken = sL.body.accessToken;
});

after(async () => {
  if (!prisma) return;
  try {
    const prs = await prisma.purchaseRequest.findMany({ where: { requesterId: svUserId }, select: { id: true } });
    const prIds = prs.map((p: any) => p.id);
    if (prIds.length) {
      const pos = await prisma.purchaseOrder.findMany({ where: { prId: { in: prIds } }, select: { id: true } });
      const poIds = pos.map((p: any) => p.id);
      const grs = await prisma.goodsReceipt.findMany({ where: { poId: { in: poIds } }, select: { id: true } });
      const grIds = grs.map((g: any) => g.id);
      if (grIds.length) {
        const pis = await prisma.purchaseInvoice.findMany({ where: { grId: { in: grIds } }, select: { id: true } });
        const piIds = pis.map((p: any) => p.id);
        if (piIds.length) {
          // journalEntryLine ندارد — lines زیرمجموعه journalEntry است و با cascade پاک می‌شود
          await prisma.journalEntry.deleteMany({ where: { sourceType: 'PURCHASE_INVOICE', sourceId: { in: piIds } } });
          await prisma.purchaseInvoiceItem.deleteMany({ where: { invoiceId: { in: piIds } } });
          await prisma.purchaseInvoice.deleteMany({ where: { id: { in: piIds } } });
        }
        await prisma.journalEntry.deleteMany({ where: { sourceType: 'GOODS_RECEIPT', sourceId: { in: grIds } } });
        await prisma.stockMovement.deleteMany({ where: { referenceType: 'goods-receipt', referenceId: { in: grIds } } });
        await prisma.stock.deleteMany({ where: { itemId } });
        await prisma.goodsReceiptItem.deleteMany({ where: { receiptId: { in: grIds } } });
        await prisma.goodsReceipt.deleteMany({ where: { id: { in: grIds } } });
      }
      if (poIds.length) {
        await prisma.purchaseOrderItem.deleteMany({ where: { poId: { in: poIds } } });
        await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
      }
      await prisma.purchaseRequestItem.deleteMany({ where: { prId: { in: prIds } } });
      await prisma.purchaseRequest.deleteMany({ where: { id: { in: prIds } } });
    }
    if (REPORT_IDS.length) {
      await prisma.dailyReportSection.deleteMany({ where: { reportId: { in: REPORT_IDS } } });
      await prisma.dailyReport.deleteMany({ where: { id: { in: REPORT_IDS } } });
    }
    if (svUserId) { await prisma.userRole.deleteMany({ where: { userId: svUserId } }); await prisma.user.deleteMany({ where: { id: svUserId } }); }
    if (testAdminUserId) { await prisma.userRole.deleteMany({ where: { userId: testAdminUserId } }); await prisma.user.deleteMany({ where: { id: testAdminUserId } }); }
    if (createdProjectId) await prisma.project.deleteMany({ where: { id: createdProjectId } });
  } catch (e) { console.error('cleanup:', e); }
  if (app) await app.close();
});

test('full chain | PR → PO → GR → post → PI → approve → JE', async () => {
  const { po } = await makeChainWithPrices(10, 5000, 0);
  assert.ok(po, 'PO');
  assert.ok(po.items.length > 0);

  const gr = await receiptsSvc.createFromPO(po.id, {
    warehouseId,
    receiptDate: new Date().toISOString().slice(0, 10),
    items: po.items.map((pi: any) => ({ itemId, poItemId: pi.id, quantity: Number(pi.quantity), unitCost: 5000 })),
  }, testAdminUserId!);
  assert.equal(gr.status, 'DRAFT');
  assert.equal(gr.poId, po.id);
  assert.ok(Number(gr.totalValue) > 0, 'totalValue > 0 — actual: ' + gr.totalValue);

  await receiptsSvc.submit(gr.id);
  await receiptsSvc.approve(gr.id, testAdminUserId!);
  const postRes = await receiptsSvc.post(gr.id, testAdminUserId!);
  assert.ok(postRes.success);

  const grAfter = await prisma.goodsReceipt.findUnique({ where: { id: gr.id } });
  assert.equal(grAfter.status, 'POSTED');

  const grJe = await prisma.journalEntry.findFirst({ where: { sourceType: 'GOODS_RECEIPT', sourceId: gr.id } });
  assert.ok(grJe, 'JE برای GR');

  const pi = await piSvc.createFromGR(gr.id, {
    invoiceNumber: 'INV-E2E-' + Date.now(),
    invoiceDate: new Date().toISOString().slice(0, 10),
  }, testAdminUserId!);
  assert.equal(pi.grId, gr.id);
  assert.equal(pi.poId, po.id);

  await piSvc.approve(pi.id, testAdminUserId!);
  const piAfter = await prisma.purchaseInvoice.findUnique({ where: { id: pi.id } });
  assert.equal(piAfter.status, 'APPROVED');
  assert.ok(piAfter.journalEntryId);

  const piJe = await prisma.journalEntry.findUnique({ where: { id: piAfter.journalEntryId }, include: { lines: true } });
  assert.equal(piJe.sourceType, 'PURCHASE_INVOICE');
  assert.ok(piJe.lines.length >= 2);
});

test('full chain | createFromPO blocks second GR after POSTED', async () => {
  const { po } = await makeChainWithPrices(5, 3000, 1);
  const gr = await receiptsSvc.createFromPO(po.id, {
    warehouseId,
    receiptDate: new Date().toISOString().slice(0, 10),
    items: po.items.map((pi: any) => ({ itemId, poItemId: pi.id, quantity: Number(pi.quantity), unitCost: 3000 })),
  }, testAdminUserId!);
  await receiptsSvc.submit(gr.id);
  await receiptsSvc.approve(gr.id, testAdminUserId!);
  await receiptsSvc.post(gr.id, testAdminUserId!);

  await assert.rejects(
    () => receiptsSvc.createFromPO(po.id, {
      warehouseId,
      receiptDate: new Date().toISOString().slice(0, 10),
      items: po.items.map((pi: any) => ({ itemId, poItemId: pi.id })),
    }, testAdminUserId!),
    /قبلاً post/,
  );
});
