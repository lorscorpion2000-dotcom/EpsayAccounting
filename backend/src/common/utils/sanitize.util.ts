// src/common/utils/sanitize.util.ts
// پاک‌سازی داده‌های حساس از payload ها — برای audit log, error log, telegram

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'newpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'secret',
  'bottoken',
  'authorization',
  'apikey',
  'api_key',
];

const REDACTED = '***REDACTED***';

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.indexOf(s) !== -1);
}

/**
 * پاک‌سازی بازگشتی یک آبجکت — هر کلید حساس به REDACTED تبدیل می‌شود
 */
export function sanitize<T = any>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return input as any; // رشته‌ها رو دست نمی‌زنیم

  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item)) as any;
  }

  if (typeof input === 'object') {
    const copy: any = {};
    for (const key of Object.keys(input as any)) {
      if (isSensitiveKey(key)) {
        copy[key] = REDACTED;
      } else {
        copy[key] = sanitize((input as any)[key]);
      }
    }
    return copy;
  }

  return input;
}

/**
 * پاک‌سازی رشته — الگوهای حساس رایج رو REDACTED می‌کنه
 * مثل: botToken، password=...
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  // JSON web tokens (eyJ...)
  let out = str.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***JWT***');

  // Telegram bot tokens (digits:letters)
  out = out.replace(/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g, '***TELEGRAM_TOKEN***');

  // password=..., password: ...
  out = out.replace(/(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;"']+/gi, '$1=***REDACTED***');

  return out;
}
