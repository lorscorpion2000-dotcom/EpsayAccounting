import { ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScopeContext } from './scope.context';

const logger = new Logger("ProjectScope");

// Models that have a `projectId` scalar field (built from DMMF at load time).
const PROJECT_SCOPED_MODELS = new Set<string>();

// مدل‌هایی که projectId دارند ولی نباید scope-filter شوند
const EXCLUDED_MODELS = new Set<string>([
  "UserProject",      // خودِ جدول assignment
  "Warehouse",        // ساختاری
  "CostCenter",       // ساختاری
  "EmployeeProfile",  // پرسنل چند-پروژه
  "PettyCashAccount", // ممکن است company-wide باشد
]);
(function init() {
  try {
    const dmmf: any = (Prisma as any).dmmf || (Prisma as any).dmmf?.datamodel;
    const models = dmmf?.datamodel?.models || [];
    for (const m of models) {
      if (Array.isArray(m.fields) && m.fields.some((f: any) => f.name === "projectId")) {
        PROJECT_SCOPED_MODELS.add(m.name);
      }
    }
  } catch (e) {
    logger.warn("Failed to build DMMF model set: " + (e as Error).message);
  }
})();

export function projectScopedModelNames(): string[] {
  return Array.from(PROJECT_SCOPED_MODELS).sort();
}

const READ_ACTIONS = new Set([
  "findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy",
]);

const FILTERED_WRITE_ACTIONS = new Set(["updateMany", "deleteMany"]);
const CREATE_ACTIONS = new Set(["create", "createMany"]);

export const projectScopeMiddleware: Prisma.Middleware = async (params, next) => {
  const scope = ScopeContext.get();
  if (!scope || !scope.enabled) return next(params);
  if (scope.isStaff) return next(params);
  if (!params.model || !PROJECT_SCOPED_MODELS.has(params.model)) return next(params);
  if (EXCLUDED_MODELS.has(params.model)) return next(params);

  const projectIds = scope.projectIds || [];

  // ─── READ ───
  if (READ_ACTIONS.has(params.action)) {
    if (params.action === "findUnique") {
      (params as any).action = "findFirst";
    }
    params.args = params.args || {};
    const where = { ...(params.args.where || {}) };
    where.projectId = { in: projectIds };
    params.args.where = where;
    return next(params);
  }

  // ─── FILTERED WRITES (many) ───
  if (FILTERED_WRITE_ACTIONS.has(params.action)) {
    params.args = params.args || {};
    const where = { ...(params.args.where || {}) };
    where.projectId = { in: projectIds };
    params.args.where = where;
    return next(params);
  }

  // ─── CREATE (reject out-of-scope) ───
  if (CREATE_ACTIONS.has(params.action)) {
    const data = params.args?.data;
    const items: any[] = Array.isArray(data) ? data : [data];
    for (const it of items) {
      const pid = it?.projectId;
      if (pid !== undefined && pid !== null && !projectIds.includes(pid)) {
        throw new ForbiddenException(
          "دسترسی به این پروژه مجاز نیست",
        );
      }
    }
    return next(params);
  }

  // singular update/delete intentionally not filtered here (v1) — services must enforce.
  return next(params);
};
