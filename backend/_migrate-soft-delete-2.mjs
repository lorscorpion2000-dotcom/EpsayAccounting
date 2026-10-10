import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// هر جدول + mapping احتمالی
const TABLES = [
  { model: 'PayrollPeriod', candidates: ['payroll_periods', 'PayrollPeriod'] },
  { model: 'PayrollRecord', candidates: ['payroll_records', 'PayrollRecord'] },
  { model: 'WorkerStatement', candidates: ['worker_statements', 'WorkerStatement'] },
  { model: 'WorkerStatementItem', candidates: ['worker_statement_items', 'WorkerStatementItem'] },
  { model: 'AdvanceRequest', candidates: ['advance_requests', 'AdvanceRequest'] },
  { model: 'LeaveRequest', candidates: ['leave_requests', 'LeaveRequest'] },
  { model: 'DailyWorkLog', candidates: ['daily_work_logs', 'DailyWorkLog'] },
  { model: 'DailyReport', candidates: ['daily_reports', 'DailyReport'] },
  { model: 'SalesUnit', candidates: ['sales_units', 'SalesUnit'] },
  { model: 'User', candidates: ['users', 'User'] },
  { model: 'Role', candidates: ['roles', 'Role'] },
  { model: 'Unit', candidates: ['units', 'Unit'] },
  { model: 'FiscalYear', candidates: ['fiscal_years', 'FiscalYear'] },
  { model: 'AdjustmentIndex', candidates: ['adjustment_indices', 'AdjustmentIndex'] },
  { model: 'PettyCashAccount', candidates: ['petty_cash_accounts', 'PettyCashAccount'] },
];

async function tableExists(name) {
  const r = await p.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${name}'
    ) as e
  `);
  return !!r[0]?.e;
}

(async () => {
  console.log('═══ Migration soft-delete phase 2 ═══\n');
  let ok = 0, skip = 0, err = 0;

  for (const t of TABLES) {
    let found = null;
    for (const c of t.candidates) {
      if (await tableExists(c)) { found = c; break; }
    }
    if (!found) {
      console.log(`⚠️  ${t.model} — هیچ جدولی پیدا نشد (${t.candidates.join(', ')})`);
      skip++;
      continue;
    }

    const cols = await p.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = '${found}'
        AND column_name IN ('deleted_at', 'deleted_by')
    `);
    const has = cols.map(c => c.column_name);

    try {
      if (!has.includes('deleted_at')) {
        await p.$executeRawUnsafe(`ALTER TABLE "${found}" ADD COLUMN deleted_at TIMESTAMP NULL`);
        console.log(`✅ ${found}.deleted_at`);
        ok++;
      } else {
        console.log(`ℹ️  ${found}.deleted_at موجود`);
      }
      if (!has.includes('deleted_by')) {
        await p.$executeRawUnsafe(`ALTER TABLE "${found}" ADD COLUMN deleted_by VARCHAR(100) NULL`);
        console.log(`✅ ${found}.deleted_by`);
      }
    } catch (e) {
      console.log(`❌ ${found}:`, e.message.slice(0, 120));
      err++;
    }
  }

  console.log(`\n✅ نتیجه: ${ok} اضافه، ${skip} رد، ${err} خطا`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });