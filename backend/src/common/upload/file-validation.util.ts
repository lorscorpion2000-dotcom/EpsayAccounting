// src/common/upload/file-validation.util.ts
// Upload file validation: extension + MIME + magic bytes

export interface AllowedType {
  ext: string[];
  mime: string[];
  magic?: number[][];
}

const MAGIC = {
  PDF: [[0x25, 0x50, 0x44, 0x46]],
  JPG: [[0xff, 0xd8, 0xff]],
  PNG: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  GIF: [[0x47, 0x49, 0x46, 0x38]],
  WEBP: [[0x52, 0x49, 0x46, 0x46]],
  OLE: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
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
  return ALLOWED.some((t: AllowedType) => t.ext.some((e: string) => lower.endsWith(e)));
}

export function isAllowedMime(mimetype: string): boolean {
  return ALLOWED.some((t: AllowedType) => t.mime.includes(mimetype));
}

export function matchesMagic(buf: Buffer, filename: string): boolean {
  if (!buf || buf.length < 4) return false;
  const lower = filename.toLowerCase();

  const type = ALLOWED.find((t: AllowedType) => t.ext.some((e: string) => lower.endsWith(e)));
  if (!type || !type.magic) return true;

  return type.magic.some((sig: number[]) =>
    sig.every((byte: number, i: number) => buf[i] === byte),
  );
}

export function safeFilename(original: string): string {
  if (!original) return 'file';

  let base = original.replace(/\\/g, '/').split('/').pop() || 'file';

  try {
    const decoded = Buffer.from(base, 'latin1').toString('utf8');
    if (/[\u0600-\u06FF]/.test(decoded)) {
      base = decoded;
    }
  } catch {
    // در صورت خطا همان base استفاده می‌شود
  }

  const cleaned = base.replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_');
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
