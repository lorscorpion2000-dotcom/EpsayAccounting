import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestScope {
  userId: string | null;
  isStaff: boolean;
  projectIds: string[];
  activeProjectId: string | null;
  enabled: boolean;
}

const storage = new AsyncLocalStorage<RequestScope>();

export const ScopeContext = {
  run<T>(scope: RequestScope, cb: () => T): T {
    return storage.run(scope, cb);
  },
  get(): RequestScope | undefined {
    return storage.getStore();
  },
  isEnabled(): boolean {
    return String(process.env.PROJECT_SCOPE_ENABLED || '').toLowerCase() === 'true';
  },
};
