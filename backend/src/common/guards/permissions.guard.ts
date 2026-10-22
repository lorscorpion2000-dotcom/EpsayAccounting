import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (user?.roles?.includes('admin') || user?.roles?.includes('super_admin')) return true;
    if (!user?.permissions) throw new ForbiddenException('دسترسی غیرمجاز');

    const has = required.every((p) => user.permissions.includes(p));
    if (!has) throw new ForbiddenException('دسترسی غیرمجاز');
    return true;
  }
}