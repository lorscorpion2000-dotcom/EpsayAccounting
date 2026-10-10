import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'shared', 'prisma', 'soft-delete.middleware.ts');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-withdel-' + ts);
console.log('✅ بکاپ');

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');

// قبل از `if (!params.model...)` یه block اضافه کن
// که اگه args.__withDeleted true بود، strip کنه و bypass
const anchor = `  // ۲. اگه model تو لیست نیست، skip`;

const newBlock = `  // ۱.۵. پشتیبانی از flag قدیمی \`__withDeleted\` (backward compat)
  // اگه true → bypass کامل (ببین همه رکوردها)
  // اگه false یا undefined → عادی
  if (params.args && '__withDeleted' in params.args) {
    const withDeleted = params.args.__withDeleted;
    // strip کن که Prisma نبینه
    delete params.args.__withDeleted;
    if (withDeleted === true) {
      return next(params);
    }
  }

  // ۲. اگه model تو لیست نیست، skip`;

if (srcN.includes(anchor)) {
  srcN = srcN.replace(anchor, newBlock);
  console.log('✅ middleware با __withDeleted اضافه شد');
} else {
  console.log('❌ anchor پیدا نشد');
  process.exit(1);
}

// همچنین Handle case که args.__withDeleted مستقیم روی params.args هست (سطح بالا)
// ولی قبل از wrapping، اول چک کن params.args = params.args || {} بشه

fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
console.log('✅ ذخیره شد');