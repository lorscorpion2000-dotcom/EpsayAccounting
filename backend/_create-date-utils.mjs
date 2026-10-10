import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'common', 'utils', 'date.util.ts');

fs.mkdirSync(path.dirname(FILE), { recursive: true });

const content = `/**
 * ابزارهای کار با تاریخ — با در نظر گرفتن timezone Tehran
 *
 * ⚠️ نکته مهم:
 *   سرور روی Asia/Tehran است. new Date() مقدار local برمی‌گردونه.
 *   برای date-only (مثل @db.Date در Prisma)، همیشه از این توابع استفاده کنید.
 */

/**
 * تبدیل Date به رشته "YYYY-MM-DD" بر اساس local time (Tehran)
 * (به‌جای toISOString().slice(0,10) که UTC می‌ده و ممکنه یک روز فرق کنه)
 */
export function toLocalDateString(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return \`\${y}-\${m}-\${day}\`;
}

/**
 * شروع روز local (00:00:00.000) — برمی‌گردونه Date
 */
export function startOfLocalDay(d: Date | string | null | undefined): Date {
  const date = d ? (typeof d === 'string' ? new Date(d) : new Date(d)) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * پایان روز local (23:59:59.999) — برمی‌گردونه Date
 */
export function endOfLocalDay(d: Date | string | null | undefined): Date {
  const date = d ? (typeof d === 'string' ? new Date(d) : new Date(d)) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * ساخت Date از "YYYY-MM-DD" — به عنوان UTC midnight (مناسب برای @db.Date)
 */
export function fromDateString(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/**
 * ساخت Date از Y/M/D (local) — برای queries با local
 */
export function localDate(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day);
}

/**
 * امروز به‌عنوان Date (local midnight)
 */
export function today(): Date {
  return startOfLocalDay(new Date());
}

/**
 * بازه یک روز (start + end) به‌صورت [gte, lte]
 */
export function dayRange(d: Date | string): { gte: Date; lte: Date } {
  return { gte: startOfLocalDay(d), lte: endOfLocalDay(d) };
}

/**
 * بازه ماه جاری
 */
export function currentMonthRange(): { gte: Date; lte: Date } {
  const now = new Date();
  const gte = new Date(now.getFullYear(), now.getMonth(), 1);
  const lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { gte, lte };
}

/**
 * بازه N روز اخیر
 */
export function lastNDaysRange(n: number): { gte: Date; lte: Date } {
  const lte = endOfLocalDay(new Date());
  const gte = startOfLocalDay(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
  return { gte, lte };
}
`;

fs.writeFileSync(FILE, content, 'utf8');
console.log('✅ ساخته شد:', FILE);