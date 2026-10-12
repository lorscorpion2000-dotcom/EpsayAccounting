/**
 * مشترک — تولید کد یکتا با startsWith + max + 1 + retry
 * جایگزین الگوی count() + 1 که با soft-delete کد تکراری می‌ساخت.
 */
import { PrismaService } from '../prisma/prisma.service';

export interface GenerateCodeOptions {
  /** تعداد رقم‌های شمارنده. پیش‌فرض ۴ */
  pad?: number;
  /** استفاده از tx به‌جای prisma اصلی (برای idempotency داخل تراکنش) */
  tx?: any;
  /** بررسی رکوردهای soft-deleted هم (پیش‌فرض true) */
  withDeleted?: boolean;
  /** حداکثر تلاش برای پیدا کردن عدد بعدی. پیش‌فرض ۵۰ */
  maxAttempts?: number;
}

/**
 * generateCode('pettyCashTransaction', 'code', 'PCF-1405-')
 * → 'PCF-1405-0001'
 */
export async function generateCode(
  prisma: PrismaService,
  modelName: string,
  fieldName: string,
  prefix: string,
  opts: GenerateCodeOptions = {},
): Promise<string> {
  const pad = opts.pad ?? 4;
  const maxAttempts = opts.maxAttempts ?? 50;
  const withDeleted = opts.withDeleted !== false;
  const client: any = opts.tx ?? prisma;

  const model = client[modelName];
  if (!model || typeof model.findFirst !== 'function') {
    throw new Error('generateCode: unknown model ' + modelName);
  }

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '(\\d+)$');

  const baseFind = {
    ...(withDeleted ? { __withDeleted: true } : {}),
    where: { [fieldName]: { startsWith: prefix } },
    orderBy: { [fieldName]: 'desc' as const },
    select: { [fieldName]: true },
  };

  const last = await model.findFirst(baseFind);
  let lastNum = 0;
  if (last && last[fieldName]) {
    const m = String(last[fieldName]).match(re);
    if (m) lastNum = parseInt(m[1], 10) || 0;
  }

  for (let i = 0; i < maxAttempts; i++) {
    const n = lastNum + 1 + i;
    const candidate = prefix + String(n).padStart(pad, '0');
    const exists = await model.findFirst({
      ...(withDeleted ? { __withDeleted: true } : {}),
      where: { [fieldName]: candidate },
      select: { [fieldName]: true },
    });
    if (!exists) return candidate;
  }

  throw new Error(
    'generateCode: could not find unique code for ' + modelName + '.' + fieldName + ' prefix=' + prefix,
  );
}

/**
 * اجرای یک عملیات async با retry روی خطای unique (P2002).
 * اگر insert دچار race شد، دوباره با کد جدید تلاش می‌کند.
 */
export async function withUniqueRetry<T>(
  run: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: any = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await run();
    } catch (e: any) {
      lastErr = e;
      const code = e?.code || e?.meta?.code;
      const msg = String(e?.message || '');
      const isP2002 =
        code === 'P2002' ||
        msg.includes('P2002') ||
        msg.toLowerCase().includes('unique constraint');
      if (!isP2002) throw e;
      // slight backoff
      await new Promise((r) => setTimeout(r, 15 * (i + 1)));
    }
  }
  throw lastErr;
}
