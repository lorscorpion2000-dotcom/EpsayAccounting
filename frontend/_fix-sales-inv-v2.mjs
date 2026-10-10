import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'modules', 'sales', 'pages', 'SalesInvoicesListPage.tsx');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-invv2-' + ts);
console.log('✅ بکاپ');

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');

// ۱. حذف همه AdminDeleteButton (خراب‌ها)
srcN = srcN.replace(/<AdminDeleteButton[\s\S]*?\/>\s*\n?\s*/g, '');

// ۲. anchor: td عملیات — دقیقاً بعد از `<Link ... </Link>`
const anchor = `<Link to={\`/sales/invoices/\${x.id}\`}
                    className="inline-flex p-1.5 rounded hover:bg-slate-100 text-slate-600">
                    <Eye size={14} />
                  </Link>`;

if (!srcN.includes(anchor)) {
  console.log('❌ anchor Link پیدا نشد');

  // تلاش با الگوی ساده‌تر
  const idx = srcN.indexOf('</Link>');
  if (idx > 0) {
    console.log('context بعد از اولین </Link>:');
    console.log(srcN.slice(idx, idx + 200));
  }
  process.exit(1);
}

const idx = srcN.indexOf(anchor) + anchor.length;
const btn = `\n                  <AdminDeleteButton\n                    endpoint="/sales-invoices"\n                    id={x.id}\n                    itemLabel={x.code || x.invoiceNumber || ''}\n                    onSuccess={loadData}\n                  />`;

srcN = srcN.slice(0, idx) + btn + srcN.slice(idx);
console.log('✅ AdminDeleteButton درج شد بعد از Link');

// ۳. چک load در فایل
const loadMatch = srcN.match(/(?:const|function)\s+(load\w*)/);
const loadFn = loadMatch ? loadMatch[1] : 'loadData';
console.log('   load fn:', loadFn);

// اگه loadData نیست، جایگزین کن
if (loadFn !== 'loadData') {
  srcN = srcN.replace(/onSuccess=\{loadData\}/g, `onSuccess={${loadFn}}`);
}

fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
console.log('✅ ذخیره شد');