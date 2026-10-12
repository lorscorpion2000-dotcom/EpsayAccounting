/**
import { todayLocalISO } from '@/utils/local-date';
 * ابزار تاریخ — local timezone (Tehran) نه UTC
 *
 * ⚠️ چرا؟
 *   todayLocalISO() تاریخ UTC می‌ده.
 *   ساعت ۲۰:۳۰ به بعد تهران → UTC فردا میشه → تاریخ اشتباه.
 *
 * این helper تاریخ local (تهران) رو برمی‌گردونه.
 */

export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * تبدیل هر Date به YYYY-MM-DD بر اساس local time
 */
export function toLocalISO(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * ── توابع تقویم شمسی (بدون وابستگی خارجی، بر پایه Intl) ──
 */

/** سال شمسی جاری (مثلاً ۱۴۰۴) */
export function currentJalaliYear(): number {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
  }).formatToParts(new Date());
  const raw = parts.find((p) => p.type === 'year')?.value ?? '';
  return Number(raw.replace(/[^0-9]/g, ''));
}

/**
 * تبدیل تاریخ شمسی به میلادی ISO (YYYY-MM-DD).
 * با جست‌وجوی کوچک حول Nowruz (۲۱ مارس) — بدون وابستگی به jalaali-js.
 */
export function jalaliToLocalISO(jy: number, jm: number, jd: number): string {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
  });
  const approx = Date.UTC(jy + 621, 2, 21);
  for (let offset = -5; offset <= 5; offset++) {
    const t = new Date(approx + offset * 86_400_000);
    const parts = fmt.formatToParts(t);
    const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
    const d = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
    if (y === jy && m === jm && d === jd) return isoUTC(t);
  }
  return isoUTC(new Date(approx));
}

/**
 * اولین روز سال شمسی جاری — به فرمت میلادی ISO (YYYY-MM-DD).
 * برای مقدار اولیهٔ فیلترهای تاریخ.
 */
export function firstDayOfCurrentJalaliYearISO(): string {
  return jalaliToLocalISO(currentJalaliYear(), 1, 1);
}

/** Date → YYYY-MM-DD با استفاده از UTC (بدون drift منطقه‌زمانی) */
function isoUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return [y, m, dd].join('-');
}
