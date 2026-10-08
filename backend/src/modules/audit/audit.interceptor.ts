import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

const EXCLUDED = ['/api/auth/login', '/api/auth/me', '/api/auth/preferences', '/api/dashboard', '/api/audit', '/api/upload', '/api/attachments'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method ? req.method.toUpperCase() : '';
    if (['POST', 'PATCH', 'PUT', 'DELETE'].indexOf(method) === -1) return next.handle();

    const url = req.url || '';
    if (EXCLUDED.some((r) => url.indexOf(r) === 0)) return next.handle();

    const userId = req.user ? req.user.id : undefined;
    const entity = this.extractEntity(url);
    const entityId = req.params ? req.params.id : null;

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.audit.log({
            userId,
            action: method,
            entity,
            entityId,
            payload: { url: req.url, body: this.sanitize(req.body), responseId: response ? response.id : null },
            ipAddress: req.ip || (req.connection ? req.connection.remoteAddress : undefined),
            userAgent: req.headers && req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 500) : undefined,
          });
        },
        error: (err) => {
          this.audit.log({
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
    const s = url.match(re2);
    return s ? s[1] : 'unknown';
  }

  private sanitize(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const copy = JSON.parse(JSON.stringify(body));
    const sensitive = ['password', 'passwordHash', 'token', 'jwt', 'secret'];
    const clean = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (sensitive.some((s) => key.toLowerCase().indexOf(s) !== -1)) obj[key] = '***REDACTED***';
        else if (typeof obj[key] === 'object' && obj[key] !== null) clean(obj[key]);
      }
    };
    clean(copy);
    return copy;
  }
}
