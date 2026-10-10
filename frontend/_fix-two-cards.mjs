import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// فایل ۱: PayrollPeriodsPage
{
  const FILE = path.join(__dirname, 'src', 'modules', 'payroll', 'pages', 'PayrollPeriodsPage.tsx');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-cards-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // حذف قبلی
  srcN = srcN.replace(/<AdminDeleteButton[\s\S]*?\/>\s*\n?\s*/g, '');

  // anchor دقیق (خط 132 در نمایش)
  const anchor = `<div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">`;
  if (srcN.includes(anchor)) {
    const idx = srcN.indexOf(anchor) + anchor.length;
    const btn = `\n                <AdminDeleteButton\n                  endpoint="/payroll/periods"\n                  id={p.id}\n                  itemLabel={p.code || p.title}\n                  onSuccess={load}\n                />`;
    srcN = srcN.slice(0, idx) + btn + srcN.slice(idx);
    console.log('✅ PayrollPeriodsPage fix');
  } else {
    console.log('❌ anchor پیدا نشد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
}

// فایل ۲: RolesPage
{
  const FILE = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'RolesPage.tsx');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-cards-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // حذف قبلی
  srcN = srcN.replace(/<AdminDeleteButton[\s\S]*?\/>\s*\n?\s*/g, '');

  // anchor: `<div className="flex items-center gap-1">` که قبل از دکمه Edit هست
  // باید دقیقاً بعد از `pt-3 border-t border-slate-100 flex items-center justify-between` باشه
  const anchor = `<div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700 num">{r.permissions?.length ?? 0}</span> مجوز
                </div>
                <div className="flex items-center gap-1">`;

  if (srcN.includes(anchor)) {
    const idx = srcN.indexOf(anchor) + anchor.length;
    const btn = `\n                  <AdminDeleteButton\n                    endpoint="/roles"\n                    id={r.id}\n                    itemLabel={(r as any).displayName || (r as any).name || r.code}\n                    onSuccess={load}\n                  />`;
    srcN = srcN.slice(0, idx) + btn + srcN.slice(idx);
    console.log('✅ RolesPage fix');
  } else {
    console.log('⚠️  anchor پیچیده پیدا نشد — با anchor ساده امتحان می‌کنم');
    // anchor ساده
    const simple = `<div className="flex items-center gap-1">`;
    // آخرین occurrence
    const lastIdx = srcN.lastIndexOf(simple);
    if (lastIdx > 0) {
      const insertAt = lastIdx + simple.length;
      const btn = `\n                  <AdminDeleteButton\n                    endpoint="/roles"\n                    id={r.id}\n                    itemLabel={(r as any).displayName || (r as any).name || r.code}\n                    onSuccess={load}\n                  />`;
      srcN = srcN.slice(0, insertAt) + btn + srcN.slice(insertAt);
      console.log('✅ RolesPage fix (anchor ساده)');
    }
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
}