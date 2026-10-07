import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// مسیرهای مجاز وقتی کاربر باید رمز عوض کنه
const ALLOWED = [
  { method: 'PATCH', re: /\/auth\/change-password\/?$/ },
  { method: 'GET', re: /\/auth\/me\/?$/ },
  { method: 'PATCH', re: /\/auth\/preferences\/?$/ },
  { method: 'PATCH', re: /\/auth\/profile\/?$/ },
];

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user || !user.mustChangePassword) return true;

    const method = (req.method || '').toUpperCase();
    const fullPath = (req.originalUrl || req.url || '').split('?')[0];

    const isAllowed = ALLOWED.some(
      (a) => a.method === method && a.re.test(fullPath),
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        'ابتدا رمز عبور پیش‌فرض خود را تغییر دهید',
      );
    }
    return true;
  }
}
