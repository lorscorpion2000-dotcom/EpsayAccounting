import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = [
  { file: 'src/modules/payroll/pages/PayrollPeriodsPage.tsx', endpoint: '/payroll/periods', idVar: 'p.id', label: 'p.code || p.title' },
  { file: 'src/modules/payroll/pages/WorkerStatementsListPage.tsx', endpoint: '/payroll/worker-statements', idVar: 's.id', label: 's.code || s.title' },
  { file: 'src/modules/payroll/pages/AdvanceRequestsPage.tsx', endpoint: '/payroll/advance-requests', idVar: 'a.id', label: 'a.code' },
  { file: 'src/modules/payroll/pages/LeaveRequestsPage.tsx', endpoint: '/payroll/leave-requests', idVar: 'l.id', label: 'l.code' },
  { file: 'src/modules/payroll/pages/WorkLogsPage.tsx', endpoint: '/payroll/work-logs', idVar: 'w.id', label: 'w.id' },
  { file: 'src/modules/site-ops/pages/DailyReportsListPage.tsx', endpoint: '/site-ops/daily-reports', idVar: 'r.id', label: 'r.code' },
  { file: 'src/modules/settings/pages/FiscalYearsPage.tsx', endpoint: '/fiscal-years', idVar: 'f.id', label: 'f.title || f.code' },
  { file: 'src/modules/settings/pages/UsersPage.tsx', endpoint: '/users', idVar: 'u.id', label: 'u.username || u.fullName' },
  { file: 'src/modules/settings/pages/RolesPage.tsx', endpoint: '/roles', idVar: 'r.id', label: 'r.name' },
  { file: 'src/modules/settings/pages/UnitsPage.tsx', endpoint: '/units', idVar: 'u.id', label: 'u.name || u.code' },
];

let ok = 0, skip = 0, err = 0;

for (const t of TARGETS) {
  const FILE = path.join(__dirname, t.file);
  console.log('\n📁', t.file);

  if (!fs.existsSync(FILE)) { console.log('   ❌ پیدا نشد'); err++; continue; }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-ph3-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  let ch = 0;

  if (srcN.includes('AdminDeleteButton')) { console.log('   ℹ️  از قبل دارد'); skip++; continue; }

  // ۱. import
  if (!srcN.includes("from '@/components/AdminDeleteButton'")) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import AdminDeleteButton from '@/components/AdminDeleteButton';`);
    srcN = lines.join('\n');
    ch++;
  }

  // ۲. anchor
  const anchors = [
    /<div className="flex items-center justify-center gap-1">/,
    /<div className="flex items-center gap-1">/,
    /<div className="flex items-center justify-center gap-2">/,
    /<div className="flex items-center gap-2">/,
  ];
  let matched = null;
  for (const re of anchors) {
    const m = srcN.match(re);
    if (m) { matched = m; break; }
  }

  if (!matched) { console.log('   ⚠️  anchor پیدا نشد'); err++; continue; }

  const idx = srcN.indexOf(matched[0]);
  const pos = idx + matched[0].length;
  const newBtn = `\n                        <AdminDeleteButton\n                          endpoint="${t.endpoint}"\n                          id={${t.idVar}}\n                          itemLabel={${t.label}}\n                          onSuccess={load}\n                        />`;

  srcN = srcN.slice(0, pos) + newBtn + srcN.slice(pos);
  ch++;
  console.log(`   ✅ ${ch} تغییر`);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  ok++;
}

console.log(`\n═══ ✅ ${ok} موفق، ⏭️  ${skip} skip، ⚠️  ${err} بدون anchor ═══`);