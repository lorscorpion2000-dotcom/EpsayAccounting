import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = [
  { file: 'src/modules/payroll/pages/PayrollPeriodsPage.tsx', endpoint: '/payroll/periods' },
  { file: 'src/modules/payroll/pages/WorkerStatementsListPage.tsx', endpoint: '/payroll/worker-statements' },
  { file: 'src/modules/payroll/pages/AdvanceRequestsPage.tsx', endpoint: '/payroll/advance-requests' },
  { file: 'src/modules/payroll/pages/LeaveRequestsPage.tsx', endpoint: '/payroll/leave-requests' },
  { file: 'src/modules/payroll/pages/WorkLogsPage.tsx', endpoint: '/payroll/work-logs' },
  { file: 'src/modules/site-ops/pages/DailyReportsListPage.tsx', endpoint: '/site-ops/daily-reports' },
  { file: 'src/modules/settings/pages/FiscalYearsPage.tsx', endpoint: '/fiscal-years' },
  { file: 'src/modules/settings/pages/UsersPage.tsx', endpoint: '/users' },
  { file: 'src/modules/settings/pages/RolesPage.tsx', endpoint: '/roles' },
  { file: 'src/modules/settings/pages/UnitsPage.tsx', endpoint: '/units' },
];

for (const t of TARGETS) {
  const FILE = path.join(__dirname, t.file);
  if (!fs.existsSync(FILE)) continue;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-hdr-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // ۱. حذف همه AdminDeleteButton blocks
  srcN = srcN.replace(/<AdminDeleteButton[\s\S]*?\/>\s*\n?\s*/g, '');

  // ۲. پیدا کردن map var داخل tbody
  const tbodyIdx = srcN.indexOf('<tbody');
  let mapVar = null;
  let insertPos = -1;

  if (tbodyIdx >= 0) {
    const tbodyEnd = srcN.indexOf('</tbody>', tbodyIdx);
    const tbody = srcN.slice(tbodyIdx, tbodyEnd);
    const mm = tbody.match(/\.map\(\(\s*(\w+)/);
    if (mm) {
      mapVar = mm[1];

      // anchor: آخرین flex container در tbody
      const anchors = [
        '<div className="flex items-center justify-center gap-1">',
        '<div className="flex items-center gap-1">',
        '<div className="flex items-center justify-center gap-2">',
        '<div className="flex items-center gap-2">',
      ];
      let anchor = null;
      for (const a of anchors) {
        if (tbody.includes(a)) { anchor = a; break; }
      }

      if (anchor) {
        // آخرین occurrence
        const lastIdx = tbody.lastIndexOf(anchor);
        insertPos = tbodyIdx + lastIdx + anchor.length;
      }
    }
  }

  // ۳. اگه tbody نداشت، از card-based استفاده کن
  if (!mapVar) {
    // کارت‌ها
    const cardIdx = srcN.indexOf('card p-');
    // استفاده از anchor دکمه Trash2 موجود
    const trashRe = /(<button[^>]*(?:setDeleting|onDelete|handleDelete)[^>]*>[\s\S]*?<\/button>)/;
    const tm = srcN.match(trashRe);
    if (tm) {
      const before = srcN.slice(0, tm.index);
      const mm2 = before.match(/\.map\(\(\s*(\w+)/);
      if (mm2) {
        mapVar = mm2[1];
        insertPos = tm.index + tm[0].length;
      }
    }
  }

  if (!mapVar || insertPos < 0) {
    console.log(`❌ ${t.file} — map var پیدا نشد`);
    fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
    continue;
  }

  // ۴. درج دکمه در محل درست
  const newBtn = `\n                        <AdminDeleteButton\n                          endpoint="${t.endpoint}"\n                          id={${mapVar}.id}\n                          itemLabel={(${mapVar} as any).code || (${mapVar} as any).name || (${mapVar} as any).title || (${mapVar} as any).fullName || (${mapVar} as any).username || ''}\n                          onSuccess={load}\n                        />`;

  srcN = srcN.slice(0, insertPos) + newBtn + srcN.slice(insertPos);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log(`✅ ${t.file} (var=${mapVar})`);
}