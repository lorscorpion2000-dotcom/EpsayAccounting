import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TelegramService } from '../services/telegram.service';
import { sanitizeString } from '../utils/sanitize.util';

/**
 * ترجمه خطاهای Prisma به پیام‌های فارسی قابل فهم برای کاربر
 */
function translatePrismaError(exception: unknown): string | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = exception.meta as any;
    const target = meta?.target;
    const field = Array.isArray(target) ? target.join(', ') : (target || '');

    switch (exception.code) {
      case 'P2002': // Unique constraint
        return 'مقدار «' + field + '» تکراری است. اگر قبلاً این رکورد را حذف کرده‌اید، ابتدا از «سوابق حذف» بازیابی یا حذف دائمی کنید.';
      case 'P2003': // Foreign key
        return 'این رکورد به رکورد دیگری وابسته است و قابل حذف یا تغییر نیست.';
      case 'P2025': // Record not found
        return 'رکورد مورد نظر پیدا نشد یا حذف شده است.';
      case 'P2000':
        return 'مقدار وارد شده برای فیلد «' + field + '» طولانی‌تر از حد مجاز است.';
      case 'P2004':
        return 'مقدار وارد شده برای فیلد «' + field + '» با قوانین پایگاه داده سازگار نیست.';
      default:
        return 'خطای پایگاه داده (' + exception.code + '). در صورت تکرار با پشتیبانی تماس بگیرید.';
    }
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    return 'اطلاعات ارسالی با ساختار مورد انتظار هماهنگ نیست. لطفاً مقادیر فرم را بررسی کنید.';
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return 'ارتباط با پایگاه داده برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.';
  }

  if (exception instanceof Prisma.PrismaClientRustPanicError) {
    return 'خطای داخلی پایگاه داده. لطفاً به مدیر سیستم اطلاع دهید.';
  }

  return null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private telegram: TelegramService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'خطای داخلی سرور';

    // ۱) اول Prisma errors
    const prismaMsg = translatePrismaError(exception);
    if (prismaMsg) {
      status = HttpStatus.BAD_REQUEST;
      message = prismaMsg;
    } else if (exception instanceof HttpException) {
      // ۲) NestJS HttpException
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : (r as any).message || r;
    } else if (exception instanceof Error) {
      // ۳) سایر خطاها — اگر شامل Prisma بود، ترجمه
      const m = exception.message || '';
      if (m.includes('Unique constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'مقدار تکراری است. اگر قبلاً این رکورد را حذف کرده‌اید، ابتدا از «سوابق حذف» بازیابی یا حذف دائمی کنید.';
      } else if (m.includes('Foreign key constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'این رکورد به رکورد دیگری وابسته است و قابل حذف نیست.';
      } else {
        message = exception.message;
      }
    }

    // پیام لاگ (sanitize شده)
    const rawMsg = typeof message === 'string' ? message : JSON.stringify(message);
    const errMsg = sanitizeString(rawMsg);
    const method = request.method || '?';
    const url = request.url || '?';
    this.logger.error(method + ' ' + url + ' → ' + status + ': ' + errMsg, exception instanceof Error ? exception.stack : '');

    // اطلاع‌رسانی خطاهای 5xx
    if (status >= 500) {
      const user = request.user?.username || 'anonymous';
      const line = method + ' ' + url + '\nUser: ' + user + '\nError: ' + errMsg.slice(0, 400);
      this.telegram.send('ERROR', line).catch(() => {});
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: url,
    });
  }
}
