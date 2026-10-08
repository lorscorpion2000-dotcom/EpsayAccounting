// number-to-words.ts
// تبدیل عدد به حروف فارسی (پشتیبانی از تا 999 تریلیون)

const YEKAN = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const DAH = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const DAHGAN = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const SADGAN = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALE = ['', ' هزار', ' میلیون', ' میلیارد', ' بیلیون', ' تریلیون'];

function threeDigitToWords(n: number): string {
  const parts: string[] = [];
  const s = Math.floor(n / 100);
  const rest = n % 100;

  if (s > 0) parts.push(SADGAN[s]);

  if (rest >= 10 && rest < 20) {
    parts.push(DAH[rest - 10]);
  } else {
    const d = Math.floor(rest / 10);
    const y = rest % 10;
    if (d > 0) parts.push(DAHGAN[d]);
    if (y > 0) parts.push(YEKAN[y]);
  }

  return parts.join(' و ');
}

/**
 * تبدیل عدد به حروف فارسی
 * @param num — عدد صحیح (یا اعشاری؛ اعشار نادیده گرفته می‌شود)
 */
export function numberToWords(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return '';
  const n = Math.floor(Math.abs(Number(num)));
  if (!isFinite(n)) return '';
  if (n === 0) return 'صفر';

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      parts.push(threeDigitToWords(g) + SCALE[i]);
    }
  }

  return parts.join(' و ');
}

export default numberToWords;
