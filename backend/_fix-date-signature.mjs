import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'common', 'utils', 'date.util.ts');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-sig-' + ts);

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');

// ۱. شروع روز: پارامتر اختیاری
srcN = srcN.replace(
  'export function startOfLocalDay(d: Date | string | null | undefined): Date {',
  'export function startOfLocalDay(d?: Date | string | null): Date {'
);

// ۲. پایان روز: پارامتر اختیاری
srcN = srcN.replace(
  'export function endOfLocalDay(d: Date | string | null | undefined): Date {',
  'export function endOfLocalDay(d?: Date | string | null): Date {'
);

console.log('✅ signatures اصلاح شدن');

fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
console.log('✅ ذخیره شد');