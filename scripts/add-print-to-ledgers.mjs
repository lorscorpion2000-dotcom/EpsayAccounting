import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const files = [
  'PartyLedgerPage.tsx',
  'ProjectLedgerPage.tsx',
  'ARAgingPage.tsx',
  'APAgingPage.tsx',
];

for (const name of files) {
  const f = ROOT + '/frontend/src/modules/accounting/pages/' + name;
  if (!fs.existsSync(f)) { console.log('!! ' + name); continue; }
  let c = fs.readFileSync(f, 'utf8');
  let changes = 0;

  // ───────────── 1) import useRef ─────────────
  if (!c.includes("import { useRef }")) {
    // اگر useRef در react imports هست ادامه
    if (c.match(/from 'react';/) && !c.match(/useRef/)) {
      c = c.replace(
        /import \{([^}]*)\} from 'react';/,
        (m, imports) => 'import {' + imports.trimEnd() + ', useRef } from \'react\';'
      );
      changes++;
    }
  }

  // ───────────── 2) import PrintButton + PrintHeader ─────────────
  if (!c.includes('PrintButton')) {
    // پیدا کردن خط import از utils/format یا excel-style
    const anchor = "import { formatJalaliDate, formatNumber } from '@/utils/format';";
    const anchor2 = "import { formatNumber } from '@/utils/format';";
    const add = "import PrintButton from '@/components/PrintButton';\nimport PrintHeader from '@/components/PrintHeader';";
    if (c.includes(anchor)) {
      c = c.replace(anchor, anchor + '\n' + add);
      changes++;
    } else if (c.includes(anchor2)) {
      c = c.replace(anchor2, anchor2 + '\n' + add);
      changes++;
    }
  }

  // ───────────── 3) state printRef ─────────────
  if (!c.includes('const printRef = useRef')) {
    // پیدا کردن اولین خط const [x, setX] = useState
    const m = c.match(/(\n)(  const \[[^\]]+\] = useState)/);
    if (m) {
      c = c.replace(m[1] + m[2], m[1] + '  const printRef = useRef<HTMLDivElement>(null);\n' + m[2]);
      changes++;
    }
  }

  // ───────────── 4) اضافه کردن PrintButton در هدر ─────────────
  if (!c.includes('<PrintButton')) {
    // anchor: اولین <button className="btn-secondary" onClick={exportExcel}
    const btnAnchor = '<button className="btn-secondary" onClick={exportExcel}';
    if (c.includes(btnAnchor)) {
      c = c.replace(btnAnchor, '<PrintButton contentRef={printRef} documentTitle="گزارش" />\n          ' + btnAnchor);
      changes++;
    }
  }

  // ───────────── 5) اضافه کردن no-print به هدر و فیلترها ─────────────
  // هدر اصلی: `<div className="flex items-center justify-between flex-wrap gap-4">` → `... no-print`
  c = c.replace(
    /<div className="flex items-center justify-between flex-wrap gap-4">/g,
    '<div className="flex items-center justify-between flex-wrap gap-4 no-print">'
  );

  // فیلتر card: `<div className="card p-4 grid grid-cols-1 md:grid-cols-` → `... no-print`
  c = c.replace(
    /<div className="card p-4 grid grid-cols-1 md:grid-cols-/g,
    '<div className="card p-4 grid grid-cols-1 md:grid-cols-'
  );
  // جداگانه با no-print
  c = c.replace(
    /(<div className="card p-4 )/g,
    '$1no-print '
  );

  // ───────────── 6) wrap کردن محتوا در printRef ─────────────
  // پیدا کردن الگو: `{data && (` بعدش `<>` یا `<div className="grid`
  if (!c.includes('<div ref={printRef}')) {
    // anchor: `{data && (\n        <>`
    const wrapAnchor = c.match(/\{data && \(\s*\r?\n\s*<>/);
    if (wrapAnchor) {
      c = c.replace(
        wrapAnchor[0],
        `{data && (
        <div ref={printRef} className="space-y-6">
          <PrintHeader title="گزارش" />`
      );
      // حالا بستن `</>` را به `</div>` تغییر بده
      // جای اول `<></>` بعد از بسته شدن `)}` — آخرین `</>` را پیدا کن
      const lastFrag = c.lastIndexOf('</>');
      if (lastFrag > 0) {
        c = c.slice(0, lastFrag) + '</div>' + c.slice(lastFrag + 3);
      }
      changes++;
    }
  }

  // ───────────── 7) متن «بهروزرسانی» → «به روزرسانی» ─────────────
  const before = c;
  c = c.replace(/بهروزرسانی/g, 'به روزرسانی');
  if (c !== before) changes++;

  fs.writeFileSync(f, c, 'utf8');
  console.log('OK ' + name + ' (' + changes + ' تغییر)');
}

// ═══════════════════════════════════════════════════════════════
// فایلهای دیگر — فقط متن
// ═══════════════════════════════════════════════════════════════
const otherFiles = [
  '/frontend/src/modules/accounting/pages/ProfitLossPage.tsx',
  '/frontend/src/modules/accounting/pages/BalanceSheetPage.tsx',
  '/frontend/src/modules/accounting/pages/DetailedTrialBalancePage.tsx',
];

for (const rel of otherFiles) {
  const f = ROOT + rel;
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, 'utf8');
  const before = c;
  c = c.replace(/بهروزرسانی/g, 'به روزرسانی');
  if (c !== before) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('OK text: ' + rel.split('/').pop());
  }
}

console.log('');
console.log('=== DONE ===');