import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = [
  { file: 'src/modules/sales/pages/SalesUnitsPage.tsx', endpoint: '/sales/units' },
  { file: 'src/modules/sales/pages/SalesCustomersPage.tsx', endpoint: '/sales/customers' },
  { file: 'src/modules/sales/pages/SalesContractsListPage.tsx', endpoint: '/sales/contracts' },
  { file: 'src/modules/sales/pages/SalesInvoicesListPage.tsx', endpoint: '/sales-invoices' },
];

for (const t of TARGETS) {
  const FILE = path.join(__dirname, t.file);
  console.log('\n══════════════════════════════════════');
  console.log('📁', t.file);

  if (!fs.existsSync(FILE)) { console.log('   ❌'); continue; }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-sales-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // ۱. حذف قبلی‌ها
  srcN = srcN.replace(/<AdminDeleteButton[\s\S]*?\/>\s*\n?\s*/g, '');

  // ۲. import
  if (!srcN.includes("from '@/components/AdminDeleteButton'")) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import AdminDeleteButton from '@/components/AdminDeleteButton';`);
    srcN = lines.join('\n');
  }

  // ۳. پیدا کردن map var + anchor
  const tbodyIdx = srcN.indexOf('<tbody');
  let mapVar = null;
  let insertPos = -1;

  // Strategy A: table-based
  if (tbodyIdx >= 0) {
    const tbodyEnd = srcN.indexOf('</tbody>', tbodyIdx);
    const tbody = srcN.slice(tbodyIdx, tbodyEnd);
    const mm = tbody.match(/\.map\(\(\s*(\w+)/);

    if (mm) {
      mapVar = mm[1];

      // آخرین flex container در tbody
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
        const lastIdx = tbody.lastIndexOf(anchor);
        insertPos = tbodyIdx + lastIdx + anchor.length;
      }
    }
  }

  // Strategy B: card-based
  if (insertPos < 0) {
    console.log('   (card-based — جستجوی anchor)');
    // پیدا کردن اولین `<AdminDeleteButton` قبلی حذف شده یا `<button` با onclick="setDeleting" یا Trash2
    const cardAnchorRe = /(<div className="[^"]*flex[^"]*items-center[^"]*gap-1[^"]*"[^>]*>)/;
    const cm = srcN.match(cardAnchorRe);
    if (cm) {
      // پیدا کردن map var در 500 کاراکتر قبل
      const before = srcN.slice(0, cm.index);
      const mm = before.match(/\.map\(\(\s*(\w+)/);
      if (mm) {
        mapVar = mm[1];
        insertPos = cm.index + cm[0].length;
      }
    }
  }

  if (!mapVar || insertPos < 0) {
    console.log('   ❌ anchor یا map var پیدا نشد');
    fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
    continue;
  }

  console.log(`   map var: ${mapVar}`);

  // ۴. درج دکمه
  const btn = `\n                        <AdminDeleteButton\n                          endpoint="${t.endpoint}"\n                          id={${mapVar}.id}\n                          itemLabel={(${mapVar} as any).code || (${mapVar} as any).name || (${mapVar} as any).title || (${mapVar} as any).fullName || ''}\n                          onSuccess={load}\n                        />`;

  srcN = srcN.slice(0, insertPos) + btn + srcN.slice(insertPos);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('   ✅ fix شد');
}