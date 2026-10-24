import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestScope, ScopeContext } from './scope.context';
import type { Request } from 'express';

interface ScopedUser {
  id?: string;
  isStaff?: boolean;
  projectIds?: string[];
}

type ScopedRequest = Request & { user?: ScopedUser };

@Injectable()
export class ProjectScopeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<ScopedRequest>();
    const user = req?.user || {};

    const rawHeader = req?.headers?.['x-active-project'] || req?.headers?.['X-Active-Project'];
    const requested = typeof rawHeader === 'string' && rawHeader.length > 0 ? rawHeader : null;

    // اگر کاربر به این پروژه دسترسی ندارد، هدر را نادیده بگیر
    const userProjectIds: string[] = Array.isArray(user.projectIds) ? user.projectIds : [];
    const validActive =
      requested && (user.isStaff || userProjectIds.includes(requested))
        ? requested
        : null;

    const scope: RequestScope = {
      userId: user.id || null,
      isStaff: !!user.isStaff,
      projectIds: userProjectIds,
      activeProjectId: validActive,
      enabled: ScopeContext.isEnabled(),
    };

    return new Observable((subscriber) => {
      ScopeContext.run(scope, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
