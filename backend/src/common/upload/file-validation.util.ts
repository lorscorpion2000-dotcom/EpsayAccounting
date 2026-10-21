import { ALLOWED_EXTENSIONS } from './allowed-extensions';

const ALLOWED = ALLOWED_EXTENSIONS;

export function isAllowedExtension(filename: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return ALLOWED.some((t) => t.ext.some((e) => lower.endsWith(e)));
}

export function isAllowedMime(mimetype: string): boolean {
  return ALLOWED.some((t) => t.mime.includes(mimetype));
}

export function matchesMagic(buf: Buffer, filename: string): boolean {
  if (!buf || buf.length < 4) return false;
  const lower = filename.toLowerCase();

  const type = ALLOWED.find((t) => t.ext.some((e) => lower.endsWith(e)));
  if (!type || !type.magic) return true;

  return type.magic.some((sig) =>
    sig.every((byte, i) => buf[i] === byte),
  );
}

/**
 * اصلاح انکودینگ نام فایل‌های فارسی و ایمن‌سازی
 */
export function safeFilename(original: string): string {
  if (!original) return 'file';

  // ۱. حذف مسیر (Basename)
  let base = original.replace(/\\/g, '/').split('/').pop() || 'file';

  // ۲. اصلاح باگ معروف Multer latin1 -> utf8 برای کاراکترهای فارسی
  try {
    const decoded = Buffer.from(base, 'latin1').toString('utf8');
    if (/[\u0600-\u06FF]/.test(decoded)) {
      base = decoded;
    }
  } catch {
    // در صورت خطا همان base اولیه استفاده می‌شود
  }

  // ۳. حفظ حروف انگلیسی، فارسی/عربی، اعداد، نقطه، خط تیره و زیرخط
  const cleaned = base.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');

  // ۴. ایمن‌سازی برای جلوگیری از Path Traversal و فایل‌های مخفی
  const noLeadingDot = cleaned.replace(/^\.+/, '');
  const noDots = noLeadingDot.replace(/\.\./g, '_');
  const trimmed = noDots.slice(-120);

  return trimmed || 'file';
}

export function fileExtLower(original: string): string {
  const base = original.replace(/\\/g, '/').split('/').pop() || '';
  const idx = base.lastIndexOf('.');
  return idx >= 0 ? base.slice(idx).toLowerCase() : '';
}
