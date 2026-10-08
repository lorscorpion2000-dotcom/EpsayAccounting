// src/common/upload/file-validation.util.ts
// Upload file validation: extension + MIME + magic bytes

export interface AllowedType {
  ext: string[];
  mime: string[];
  magic?: number[][]; // possible byte signatures
}

// Byte signatures (magic numbers)
const MAGIC = {
  PDF: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  JPG: [[0xff, 0xd8, 0xff]],
  PNG: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  GIF: [[0x47, 0x49, 0x46, 0x38]], // GIF8
  WEBP: [[0x52, 0x49, 0x46, 0x46]], // RIFF (need + WEBP at offset 8)
  // OLE (DOC/XLS legacy)
  OLE: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  // ZIP (DOCX/XLSX - new office format)
  ZIP: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]],
};

export const ALLOWED: AllowedType[] = [
  { ext: ['.pdf'],          mime: ['application/pdf'],                                              magic: MAGIC.PDF },
  { ext: ['.jpg', '.jpeg'], mime: ['image/jpeg'],                                                   magic: MAGIC.JPG },
  { ext: ['.png'],          mime: ['image/png'],                                                    magic: MAGIC.PNG },
  { ext: ['.gif'],          mime: ['image/gif'],                                                    magic: MAGIC.GIF },
  { ext: ['.webp'],         mime: ['image/webp'],                                                   magic: MAGIC.WEBP },
  { ext: ['.doc'],          mime: ['application/msword'],                                           magic: MAGIC.OLE },
  { ext: ['.docx'],         mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], magic: MAGIC.ZIP },
  { ext: ['.xls'],          mime: ['application/vnd.ms-excel'],                                     magic: MAGIC.OLE },
  { ext: ['.xlsx'],         mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], magic: MAGIC.ZIP },
];

export function isAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED.some((t) => t.ext.some((e) => lower.endsWith(e)));
}

export function isAllowedMime(mimetype: string): boolean {
  return ALLOWED.some((t) => t.mime.includes(mimetype));
}

// چک magic bytes — آیا محتوای فایل با پسوند سازگاره؟
export function matchesMagic(buf: Buffer, filename: string): boolean {
  if (!buf || buf.length < 4) return false;
  const lower = filename.toLowerCase();

  const type = ALLOWED.find((t) => t.ext.some((e) => lower.endsWith(e)));
  if (!type || !type.magic) return true; // اگه چک نداریم، قبول

  return type.magic.some((sig) =>
    sig.every((byte, i) => buf[i] === byte),
  );
}

// نام فایل امن — حذف هر کاراکتر خطرناک
export function safeFilename(original: string): string {
  // فقط basename (حذف path)
  const base = original.replace(/\\/g, '/').split('/').pop() || 'file';
  // حذف کاراکترهای خطرناک
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  // حذف نقطه‌های ابتدایی (فایل مخفی)
  const noLeadingDot = cleaned.replace(/^\.+/, '');
  // حذف .. برای path traversal
  const noDots = noLeadingDot.replace(/\.\./g, '_');
  const trimmed = noDots.slice(-120); // حداکثر ۱۲۰ کاراکتر
  return trimmed || 'file';
}

export function fileExtLower(original: string): string {
  const base = original.replace(/\\/g, '/').split('/').pop() || '';
  const idx = base.lastIndexOf('.');
  return idx >= 0 ? base.slice(idx).toLowerCase() : '';
}
