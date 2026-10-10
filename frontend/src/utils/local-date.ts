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
