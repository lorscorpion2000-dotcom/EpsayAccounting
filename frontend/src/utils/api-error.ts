/**
 * api-error.ts — F5
 * استخراج پیام فارسی از خطای Axios + نگاشت خطاهای فیلدی backend به react-hook-form
 *
 * ساختار خطای backend (طبق AllExceptionsFilter):
 *   { statusCode: number, message: string | string[], timestamp: string, path: string }
 */

import type { AxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

// ─── پیام پیش‌فرض بر اساس کد وضعیت ───
const STATUS_FA: Record<number, string> = {
  400: 'درخواست نامعتبر است.',
  401: 'نام کاربری یا رمز عبور نادرست است.',
  403: 'دسترسی مجاز نیست.',
  404: 'موردی یافت نشد.',
  409: 'تعارض داده — احتمالاً تکراری است.',
  422: 'داده‌های ورودی نامعتبر است.',
  429: 'تعداد درخواست‌ها زیاد است. لطفاً بعداً تلاش کنید.',
  500: 'خطای داخلی سرور.',
  502: 'سرویس در دسترس نیست.',
  503: 'سرویس موقتاً از دسترس خارج است.',
  504: 'پاسخی از سرور دریافت نشد (timeout).',
};

/**
 * استخراج پیام خطا از هر throwable → رشتهٔ فارسی
 */
export function getApiErrorMessage(err: unknown): string {
  // شبکه قطع یا timeout بدون response
  const ax = err as AxiosError<any>;
  if (ax?.isAxiosError) {
    if (!ax.response) {
      if (ax.code === 'ECONNABORTED') return 'مهلت درخواست به پایان رسید.';
      return 'ارتباط با سرور برقرار نشد.';
    }
    const status = ax.response.status;
    const data = ax.response.data as any;
    const msg = data?.message;

    if (Array.isArray(msg) && msg.length > 0) {
      // class-validator: آرایهٔ رشته‌ها
      return String(msg[0]);
    }
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
    return STATUS_FA[status] ?? `خطای ناشناخته (${status}).`;
  }

  if (err instanceof Error && err.message) return err.message;
  return 'خطای ناشناخته رخ داد.';
}

/**
 * نگاشت خطاهای فیلدی backend به setError فرم.
 * اگر backend برای هر فیلد پیام بدهد، مستقیماً ست می‌شود.
 * وگرنه، فقط toast پیام کلی.
 *
 * @returns آرایهٔ فیلدهایی که خطا خوردند (برای focus/scroll)
 */
export function applyApiErrorsToForm<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): Array<Path<T>> {
  const ax = err as AxiosError<any>;
  const failed: Array<Path<T>> = [];

  if (!ax?.isAxiosError || !ax.response) return failed;
  const data = ax.response.data as any;
  if (!data) return failed;

  // الگوی احتمالی: { message: [{ field, message }] } یا { errors: { field: msg } }
  const list =
    Array.isArray(data.message) && typeof data.message[0] === 'object'
      ? data.message
      : Array.isArray(data.errors)
        ? data.errors
        : null;

  if (list) {
    for (const item of list) {
      const field = item?.field || item?.property;
      const message = item?.constraints
        ? Object.values(item.constraints)[0]
        : item?.message;
      if (field && message) {
        setError(field as Path<T>, { type: 'server', message: String(message) });
        failed.push(field as Path<T>);
      }
    }
  } else if (data.errors && typeof data.errors === 'object') {
    for (const [field, message] of Object.entries(data.errors)) {
      setError(field as Path<T>, { type: 'server', message: String(message) });
      failed.push(field as Path<T>);
    }
  }

  return failed;
}