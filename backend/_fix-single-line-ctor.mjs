import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  'src/modules/sales/sales.controller.ts',
];

for (const rel of FILES) {
  const FILE = path.join(__dirname, rel);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-single-' + ts);
  console.log('✅ بکاپ:', rel);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  const lines = srcN.split('\n');

  let fixed = 0;

  // پیدا کردن همه constructors تک‌خطی
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // الگو: constructor(....) {}
    const m = l.match(/^(\s*constructor\s*\()([^)]*)(\)\s*\{\}\s*)$/);
    if (!m) continue;

    const indent = m[1].match(/^\s*/)[0];
    const params = m[2].trim();
    const close = m[3];

    if (params.includes('SoftDeleteService')) continue;

    // اضافه کردن SoftDeleteService
    const newParams = params
      ? `${params}, private softDelete: SoftDeleteService`
      : `private softDelete: SoftDeleteService`;

    lines[i] = `${m[1]}${newParams}${close}`;
    fixed++;
    console.log(`✅ خط ${i + 1}: softDelete اضافه شد`);
  }

  fs.writeFileSync(FILE, wasCRLF ? lines.join('\n').replace(/\n/g, '\r\n') : lines.join('\n'), 'utf8');
  console.log(`   مجموع: ${fixed}`);
}