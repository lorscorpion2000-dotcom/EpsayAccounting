import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'src');

const TARGETS = [
  { model: 'PayrollPeriod', name: 'payroll-periods.controller.ts' },
  { model: 'WorkerStatement', name: 'worker-statements.controller.ts' },
  { model: 'AdvanceRequest', name: 'advance-requests.controller.ts' },
  { model: 'LeaveRequest', name: 'leave-requests.controller.ts' },
  { model: 'DailyWorkLog', name: 'work-logs.controller.ts' },
  { model: 'DailyReport', name: 'site-ops.controller.ts' },
  { model: 'SalesUnit', name: 'sales.controller.ts' },
  { model: 'User', name: 'users.controller.ts' },
  { model: 'Role', name: 'roles.controller.ts' },
  { model: 'Unit', name: 'units.controller.ts' },
  { model: 'FiscalYear', name: 'fiscal-years.controller.ts' },
  { model: 'AdjustmentIndex', name: 'adjustment.controller.ts' },
  { model: 'PettyCashAccount', name: 'petty-cash/accounts.controller.ts' },
];

function findFile(dir, name) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.')) continue;
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      const r = findFile(full, name);
      if (r) return r;
    } else if (f === name) {
      return full;
    }
  }
  return null;
}

console.log('═══ Controllers باقی‌مونده ═══\n');

for (const t of TARGETS) {
  const file = findFile(SRC, t.name);
  if (!file) {
    console.log(`❌ ${t.model.padEnd(22)} — ${t.name} پیدا نشد`);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const ctrlMatch = src.match(/@Controller\(['"]([^'"]+)['"]\)/);
  const base = ctrlMatch ? ctrlMatch[1] : '—';
  const hasAdmin = src.includes('/admin');
  const hasSoftDelete = src.includes('SoftDeleteService');
  const rel = file.replace(__dirname, '').replace(/^[\\\/]/, '');
  console.log(`${hasAdmin ? '✅' : '⚠️ '} ${t.model.padEnd(22)} | ${base.padEnd(25)} | ${rel}`);
  console.log(`      admin: ${hasAdmin ? '✅' : '❌'} | softDelete injected: ${hasSoftDelete ? '✅' : '❌'}`);
}