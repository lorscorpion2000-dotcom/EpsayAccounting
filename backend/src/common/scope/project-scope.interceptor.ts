import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestScope, ScopeContext } from './scope.context';

@Injectable()
export class ProjectScopeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = ctx.switchToHttp().getRequest();
    const user = req?.user || {};

    const scope: RequestScope = {
      userId: user.id || null,
      isStaff: !!user.isStaff,
      projectIds: Array.isArray(user.projectIds) ? user.projectIds : [],
      enabled: ScopeContext.isEnabled(),
    };

    return new Observable((subscriber) => {
      ScopeContext.run(scope, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
