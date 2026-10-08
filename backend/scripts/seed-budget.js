const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ── 1) Fiscal Year ──
  let fy = await prisma.fiscalYear.findFirst({
    where: { isCurrent: true },
    orderBy: { startDate: 'desc' },
  });
  if (!fy) fy = await prisma.fiscalYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) throw new Error('هیچ FiscalYear وجود ندارد');
  console.log('📅 fiscal year:', fy.code ?? fy.name ?? fy.id, '| status=' + fy.status);

  // ── 2) Project ──
  let project = await prisma.project.findFirst({ where: { code: 'TEST-BUD-001' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: 'TEST-BUD-001',
        name: 'پروژه تستی بودجه',
        type: 'MAIN_CONTRACTOR',
        status: 'IN_PROGRESS',
        startDate: new Date(),
        description: 'پروژه تستی برای گزارش بودجه vs واقعی',
      },
    });
    console.log('+ project:', project.code, project.id);
  } else {
    console.log('= project:', project.code, project.id);
  }

  // ── 3) WBS ──
  async function upsertWbs(code, title, level, parentId, sortOrder) {
    let w = await prisma.wbsItem.findFirst({ where: { projectId: project.id, code } });
    if (!w) {
      w = await prisma.wbsItem.create({
        data: { projectId: project.id, parentId: parentId || null, code, title, level, sortOrder },
      });
      console.log('+ WBS:', code, '-', title);
    } else { console.log('= WBS:', code); }
    return w;
  }
  const wbsRoot = await upsertWbs('1',     'فاز ۱ — ساختمان اصلی',             'PHASE',        null,       1);
  const wbsWp   = await upsertWbs('1.1',   'بسته کار ۱.۱ — اسکلت',             'WORK_PACKAGE', wbsRoot.id, 1);
  const wbsAct  = await upsertWbs('1.1.1', 'فعالیت ۱.۱.۱ — بتن‌ریزی فونداسیون', 'ACTIVITY',     wbsWp.id,   1);

  // ── 4) ProjectBudget (فقط PHASE) ──
  const rootBudget = await prisma.projectBudget.findFirst({
    where: { projectId: project.id, wbsItemId: wbsRoot.id },
  });
  if (!rootBudget) {
    await prisma.projectBudget.create({
      data: {
        projectId: project.id,
        wbsItemId: wbsRoot.id,
        amount: 500_000_000,
        approvedAt: new Date(),
        isLocked: false,
        description: 'بودجه کل فاز ۱ (تست BvA)',
      },
    });
    console.log('+ Budget: 1 (PHASE) → 500,000,000');
  } else { console.log('= Budget: 1 (PHASE)'); }

  // ── 5) Accounts ──
  const accDepr = await prisma.account.findFirst({ where: { code: '7.1.5' } });
  const accBank = await prisma.account.findFirst({ where: { code: '1.1.1.01' } });
  const acc7    = await prisma.account.findFirst({ where: { code: '7.1' } });
  if (!accDepr || !accBank || !acc7) throw new Error('حساب‌های لازم پیدا نشدند');

  // ── 6) JE های idempotent ──
  const existing = await prisma.journalEntry.findMany({
    where: { sourceType: 'TEST_BVA' }, select: { sourceId: true },
  });
  const seen = new Set(existing.map((e) => e.sourceId));

  const entries = [
    { id: 'bva-1', debit: accDepr.id, amount: 20_000_000, desc: 'BvA تست 1 — تجهیزات' },
    { id: 'bva-2', debit: accDepr.id, amount: 15_000_000, desc: 'BvA تست 2 — پیمانکار' },
    { id: 'bva-3', debit: acc7.id,    amount: 10_000_000, desc: 'BvA تست 3 — اداری' },
  ];

  const last = await prisma.journalEntry.findFirst({
    where: { fiscalYearId: fy.id }, orderBy: { entryNumber: 'desc' },
    select: { entryNumber: true },
  });
  let nextNum = (last?.entryNumber ?? 0) + 1;

  for (const e of entries) {
    if (seen.has(e.id)) { console.log('= JE:', e.id); continue; }
    const code = 'JV-' + (fy.code ?? '1405') + '-' + String(nextNum).padStart(5, '0');
    const je = await prisma.journalEntry.create({
      data: {
        code, entryNumber: nextNum, entryDate: new Date(), fiscalYearId: fy.id,
        description: e.desc, status: 'POSTED',
        sourceType: 'TEST_BVA', sourceId: e.id,
        totalDebit: e.amount, totalCredit: e.amount,
        lines: {
          create: [
            { accountId: e.debit,    debit: e.amount, credit: 0,        description: e.desc, projectId: project.id, sortOrder: 1 },
            { accountId: accBank.id, debit: 0,        credit: e.amount, description: e.desc, projectId: project.id, sortOrder: 2 },
          ],
        },
      },
    });
    console.log('+ JE:', code, '→', e.amount.toLocaleString());
    nextNum++;
  }

  console.log('\n🎉 seed-budget تمام شد.');
  console.log('   project_id:', project.id);
  console.log('   → /accounting/reports/budget-vs-actual');
}
main().catch(e => { console.error('X', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());