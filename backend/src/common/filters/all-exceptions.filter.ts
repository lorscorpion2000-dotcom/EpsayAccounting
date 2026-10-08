import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { TelegramService } from '../services/telegram.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private telegram: TelegramService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : (r as any).message || r;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // لاگ
    const errMsg = typeof message === 'string' ? message : JSON.stringify(message);
    const method = request.method || '?';
    const url = request.url || '?';
    this.logger.error(method + ' ' + url + ' \u2192 ' + status + ': ' + errMsg, exception instanceof Error ? exception.stack : '');

    // فقط 5xx به تلگرام
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
