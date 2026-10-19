import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { sanitize as sanitizeUtil } from '../../common/utils/sanitize.util';

const EXCLUDED = ['/api/auth/login', '/api/auth/me', '/api/auth/preferences', '/api/dashboard', '/api/audit', '/api/upload', '/api/attachments'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(@Optional() private readonly audit?: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method ? req.method.toUpperCase() : '';
    if (['POST', 'PATCH', 'PUT', 'DELETE'].indexOf(method) === -1) return next.handle();

    const url = req.url || '';
    if (EXCLUDED.some((r) => url.indexOf(r) === 0)) return next.handle();

    const userId = req.user ? req.user.id : undefined;
    const entity = this.extractEntity(url);
    const entityId = req.params ? req.params.id : null;

    const safeLog = (entry: any) => {
      try {
        if (this.audit && typeof this.audit.log === 'function') {
          Promise.resolve(this.audit.log(entry)).catch((err) => {
            this.logger.debug?.(`Audit log failed: ${err?.message}`);
          });
        }
      } catch (err: any) {
        this.logger.debug?.(`Audit log caught error: ${err?.message}`);
      }
    };

    return next.handle().pipe(
      tap({
        next: (response) => {
          safeLog({
            userId,
            action: method,
            entity,
            entityId,
            payload: { url: req.url, body: sanitizeUtil(req.body), responseId: response ? response.id : null },
            ipAddress: req.ip || (req.connection ? req.connection.remoteAddress : undefined),
            userAgent: req.headers && req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 500) : undefined,
          });
        },
        error: (err) => {
          safeLog({
            userId,
            action: method + '_FAILED',
            entity,
            entityId,
            payload: { url: req.url, errorMessage: err ? err.message : null, statusCode: err ? err.status : null },
            ipAddress: req.ip || (req.connection ? req.connection.remoteAddress : undefined),
          });
        },
      }),
    );
  }

  private extractEntity(url: string): string {
    const re = new RegExp('^/api/([^/]+)/([^/]+)');
    const m = url.match(re);
    if (m) {
      const seg2 = m[2];
      if (new RegExp('^[0-9a-f-]{8,}$', 'i').test(seg2) || new RegExp('^[0-9]+$').test(seg2)) return m[1];
      return m[1] + '/' + seg2;
    }
    const re2 = new RegExp('^/api/([^?]+)');
    const m2 = url.match(re2);
    return m2 ? m2[1] : 'unknown';
  }
}
