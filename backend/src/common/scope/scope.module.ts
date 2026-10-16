import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProjectScopeInterceptor } from './project-scope.interceptor';

@Global()
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ProjectScopeInterceptor },
  ],
})
export class ScopeModule {}
