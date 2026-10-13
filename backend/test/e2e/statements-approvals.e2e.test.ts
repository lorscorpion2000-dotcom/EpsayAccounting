// test/e2e/statements-approvals.e2e.test.ts
// F13: check that all 3 statement types appear in approvals/pending and approve builds JE
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

let app: any, prisma: any;
let adminUserId: string;
let projectId: string, supplierId: string;
let createdProjectId: string | null = null;
let testAdminUserId: string | null = null;
let createdPartnerIds: string[] = [];
let createdFyId: string | null = null;
let approvalsSvc: any, subsSvc: any, workerSvc: any, clientSvc: any;

const TEST_ADMIN_USERNAME = 'e2e_stat_admin_' + Date.now();
const TEST_ADMIN_PASSWORD = 'Admin@1234';

before(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  const { createTestApp } = await import('./setup');
  const { PrismaService } = await import('../../src/shared/prisma/prisma.service');
  app = await createTestApp(); prisma = app.get(PrismaService);

  const superRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  if (!superRole) throw new Error('role super_admin not found — run seed');
  const hash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
  const u = await prisma.user.create({ data: { username: TEST_ADMIN_USERNAME, fullName: 'E2E Stat Admin', passwordHash: hash, isActive: true, roles: { create: [{ roleId: superRole.id }] } } });
  testAdminUserId = u.id; adminUserId = u.id;
  const login = await request(app.getHttpServer()).post('/api/auth/login').send({ username: TEST_ADMIN_USERNAME, password: TEST_ADMIN_PASSWORD });
  if (login.status !== 201) throw new Error('login failed: ' + JSON.stringify(login.body));

  // ── PayrollTaxSetting (برای worker statement)
  const existingTax = await prisma.payrollTaxSetting.findFirst({ where: { isActive: true } }).catch(() => null);
  if (!existingTax) {
    try {
      await prisma.payrollTaxSetting.create({ data: {
        year: new Date().getUTCFullYear(),
        title: 'E2E ' + new Date().getUTCFullYear(),
        insuranceEmployeePercent: 7,
        insuranceEmployerPercent: 23,
        monthlyExemption: 120000000,
        isActive: true,
      } as any });
      console.log('DEBUG: taxSetting created');
    } catch (e) { console.log('DEBUG taxSetting err:', (e as Error).message); }
  }

  // project
  let project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) { project = await prisma.project.create({ data: { code: 'E2E-STAT-' + Date.now(), name: 'E2E Stat', status: 'IN_PROGRESS' } }); createdProjectId = project.id; }
  projectId = project.id;

  // fiscal year
  const today = new Date(); const y = today.getUTCFullYear();
  const fy = await prisma.fiscalYear.findFirst({ where: { code: String(y) } });
  if (!fy) {
    try {
      const created = await prisma.fiscalYear.create({ data: { code: String(y), name: 'FY ' + y, startDate: new Date(Date.UTC(y, 0, 1)), endDate: new Date(Date.UTC(y, 11, 31)), status: 'OPEN', isCurrent: true } });
      createdFyId = created.id;
    } catch (e) { console.log('DEBUG FY create err:', (e as Error).message); }
  }

  // supplier partner (for subcontractor)
  const p = await prisma.partner.create({ data: { code: 'E2E-SUB-' + Date.now(), name: 'E2E Sub', type: 'SUPPLIER', isActive: true } as any });
  supplierId = p.id; createdPartnerIds.push(p.id);

  const { ApprovalsService } = await import('../../src/modules/approvals/approvals.service');
  const { SubcontractorStatementsService } = await import('../../src/modules/payroll/subcontractor-statements.service');
  const { WorkerStatementsService } = await import('../../src/modules/payroll/worker-statements.service');
  const { ClientStatementService } = await import('../../src/modules/client-statement/client-statement.service');
  approvalsSvc = app.get(ApprovalsService);
  subsSvc = app.get(SubcontractorStatementsService);
  workerSvc = app.get(WorkerStatementsService);
  clientSvc = app.get(ClientStatementService);
});

after(async () => {
  if (!prisma) return;
  try {
    await prisma.subcontractorStatementItem.deleteMany({ where: { statement: { projectId } } }).catch(()=>{});
    await prisma.subcontractorStatement.deleteMany({ where: { projectId } });
    await prisma.workerStatementItem.deleteMany({ where: { statement: { projectId } } }).catch(()=>{});
    await prisma.workerStatement.deleteMany({ where: { projectId } });
    await prisma.clientStatementItem.deleteMany({ where: { statement: { projectId } } }).catch(()=>{});
    await prisma.clientStatement.deleteMany({ where: { projectId } });
    await prisma.journalEntry.deleteMany({ where: { sourceType: { in: ['SUBCONTRACTOR_STATEMENT','WORKER_STATEMENT','CLIENT_STATEMENT'] } } });
    if (createdPartnerIds.length) await prisma.partner.deleteMany({ where: { id: { in: createdPartnerIds } } });
    if (testAdminUserId) { await prisma.userRole.deleteMany({ where: { userId: testAdminUserId } }); await prisma.user.deleteMany({ where: { id: testAdminUserId } }); }
    if (createdProjectId) await prisma.project.deleteMany({ where: { id: createdProjectId } });
    if (createdFyId) await prisma.fiscalYear.deleteMany({ where: { id: createdFyId } });
  } catch (e) { console.error('cleanup:', e); }
  if (app) await app.close();
});

test('F13 | subcontractor statement appears in approvals and approve creates JE', async () => {
  const stmt = await subsSvc.create({
    contractorId: supplierId, projectId,
    statementNumber: Math.floor(Date.now() / 1000) % 100000,
    periodStart: '2026-01-01', periodEnd: '2026-01-31',
    items: [{ description: 'کاری', quantity: 10, unitPrice: 100000, unit: 'NUMBER' }],
  } as any, adminUserId);

  await subsSvc.submit(stmt.id);
  const afterSubmit = await prisma.subcontractorStatement.findUnique({ where: { id: stmt.id } });
  assert.equal(afterSubmit.status, 'SUBMITTED');

  // در کارتابل باید ظاهر شود
  const pending = await approvalsSvc.getPending(adminUserId);
  const ids = (pending.subcontractorStatements || []).map((s: any) => s.id);
  assert.ok(ids.includes(stmt.id), 'subcontractor statement باید در کارتابل باشد');

  // approve از کارتابل
  await approvalsSvc.approve('subcontractor-statement', stmt.id, adminUserId);
  const afterApprove = await prisma.subcontractorStatement.findUnique({ where: { id: stmt.id } });
  assert.equal(afterApprove.status, 'APPROVED');

  // JE باید ساخته شود
  const je = await prisma.journalEntry.findFirst({ where: { sourceType: 'SUBCONTRACTOR_STATEMENT', sourceId: stmt.id } });
  if (!je) {
    // چاپ JEهای اخیر برای debug
    const recent = await prisma.journalEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { code: true, sourceType: true, sourceId: true } });
    console.log('DEBUG recent JEs:', JSON.stringify(recent, null, 2));
    const notif = await prisma.notification.findFirst({ where: { entityId: stmt.id }, orderBy: { createdAt: 'desc' } }).catch(() => null);
    console.log('DEBUG notification:', notif ? { title: notif.title, message: notif.message } : null);
  }
  assert.ok(je, 'JE برای صورت‌وضعیت پیمانکار');
});

test('F13 | worker statement appears in approvals and approve creates JE', async () => {
  const stmt = await workerSvc.create({
    partnerId: supplierId, projectId,
    statementNumber: Math.floor(Date.now() / 1000) % 100000,
    periodStart: '2026-02-01', periodEnd: '2026-02-28',
    items: [{ description: 'کار روزانه', quantity: 20, unitPrice: 50000, unit: 'NUMBER' }],
  } as any, adminUserId);

  await workerSvc.submit(stmt.id);
  const pending = await approvalsSvc.getPending(adminUserId);
  const ids = (pending.workerStatements || []).map((s: any) => s.id);
  assert.ok(ids.includes(stmt.id), 'worker statement باید در کارتابل باشد');

  await approvalsSvc.approve('worker-statement', stmt.id, adminUserId);
  const afterApprove = await prisma.workerStatement.findUnique({ where: { id: stmt.id } });
  assert.equal(afterApprove.status, 'APPROVED');

  const je = await prisma.journalEntry.findFirst({ where: { sourceType: 'WORKER_STATEMENT', sourceId: stmt.id } });
  assert.ok(je, 'JE برای صورت‌وضعیت پرسنل');
});

test('F13 | client statement appears in approvals and approve creates JE', async () => {
  const cs = await clientSvc.create({
    projectId,
    statementNumber: Math.floor(Date.now() / 1000) % 100000,
    periodStart: '2026-03-01', periodEnd: '2026-03-31',
    contractorShareAmount: 5000000,
    items: [{ category: 'LABOR', description: 'کار انجام‌شده', quantity: 1, unitPrice: 5000000, unit: 'NUMBER' }],
  } as any);

  await clientSvc.submit(cs.id);
  const pending = await approvalsSvc.getPending(adminUserId);
  const ids = (pending.clientStatements || []).map((s: any) => s.id);
  assert.ok(ids.includes(cs.id), 'client statement باید در کارتابل باشد');

  await approvalsSvc.approve('client-statement', cs.id, adminUserId);
  const afterApprove = await prisma.clientStatement.findUnique({ where: { id: cs.id } });
  assert.ok(['APPROVED', 'POSTED'].includes(afterApprove.status), 'status باید APPROVED باشد، گرفت: ' + afterApprove.status);

  const je = await prisma.journalEntry.findFirst({ where: { sourceType: 'CLIENT_STATEMENT', sourceId: cs.id } });
  assert.ok(je, 'JE برای صورت‌وضعیت کارفرما');
});
