// اعداد فارسی برای نمایش در UI
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '—';
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * تبدیل اعداد فارسی به انگلیسی (برای محاسبات)
 */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * فرمت‌بندی عدد با جداکننده هزارگان و اعداد فارسی
 */
export function formatNumber(
  n: number | string | null | undefined,
  digits = 0,
): string {
  if (n === null || n === undefined || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return '—';
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return toPersianDigits(formatted);
}

/**
 * فرمت‌بندی عدد به صورت ارزی (ریال)
 */
export function formatRial(n: number | string | null | undefined): string {
  return formatNumber(n) + ' ریال';
}

/**
 * فرمت‌بندی تاریخ به شمسی
 */
export function formatJalaliDate(
  date: string | Date | null | undefined,
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '—';
    return toPersianDigits(d.toLocaleDateString('fa-IR'));
  } catch {
    return '—';
  }
}

/**
 * فرمت‌بندی تاریخ و ساعت به شمسی
 */
export function formatJalaliDateTime(
  date: string | Date | null | undefined,
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '—';
    const dateStr = d.toLocaleDateString('fa-IR');
    const timeStr = d.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return toPersianDigits(dateStr) + ' ' + toPersianDigits(timeStr);
  } catch {
    return '—';
  }
}

/**
 * فرمت درصد
 */
export function formatPercent(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return '—';
  return toPersianDigits(num.toString()) + '٪';
}


/**
 * تاریخ امروز به شمسی — با استفاده از Intl.DateTimeFormat
 * صریحاً تقویم persian را فورس می‌کند (مستقل از locale سیستم)
 */
export function formatJalaliToday(): string {
  try {
    const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(new Date());
  } catch {
    // fallback
    return toPersianDigits(new Date().toLocaleDateString('fa-IR'));
  }
}

/**
 * تبدیل هر تاریخ میلادی به شمسی با تقویم persian صریح
 */
export function formatJalaliDateForce(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '—';
    const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(d);
  } catch {
    return '—';
  }
}
