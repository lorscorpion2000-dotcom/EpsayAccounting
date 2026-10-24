import { ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ScopeContext } from './scope.context';

const logger = new Logger("ProjectScope");

// مدل‌هایی که فیلد projectId دارند (از DMMF Prisma در زمان راه‌اندازی ساخته می‌شود)
const PROJECT_SCOPED_MODELS = new Set<string>();

// مدل‌هایی که projectId دارند ولی نباید scope-filter شوند
const EXCLUDED_MODELS = new Set<string>([
  "UserProject",      // خودِ جدول تخصیص
  "Warehouse",        // ساختاری
  "CostCenter",       // ساختاری
  "EmployeeProfile",  // پرسنل چند-پروژه
  "PettyCashAccount", // ممکن است company-wide باشد
]);

interface DmmfField { name: string }
interface DmmfModel { name: string; fields: DmmfField[] }
interface DmmfShape { datamodel: { models: DmmfModel[] } }

(function init() {
  try {
    const dmmf = (Prisma as unknown as { dmmf?: DmmfShape }).dmmf;
    const models = dmmf?.datamodel?.models || [];
    for (const m of models) {
      if (Array.isArray(m.fields) && m.fields.some((f) => f.name === "projectId")) {
        PROJECT_SCOPED_MODELS.add(m.name);
      }
    }
  } catch (e) {
    logger.warn("Failed to build DMMF model set: " + (e instanceof Error ? e.message : String(e)));
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
  if (!params.model || !PROJECT_SCOPED_MODELS.has(params.model)) return next(params);
  if (EXCLUDED_MODELS.has(params.model)) return next(params);

  // اگر کاربر پروژه‌ی فعال انتخاب کرده، فقط همان یک پروژه مجاز است.
  // اگر انتخاب نکرده و کاربر ستادی است، هیچ فیلتری اعمال نمی‌شود.
  const single = scope.activeProjectId;
  if (!single && scope.isStaff) return next(params);

  // اگر نه activeProjectId داریم و نه کاربر ستادی، از پروژه‌های مجاز کاربر استفاده می‌کنیم
  const projectIds = scope.projectIds || [];
  const projectFilter = single ? single : { in: projectIds };

  // ─── خواندن ───
  if (READ_ACTIONS.has(params.action)) {
    if (params.action === "findUnique") {
      (params as { action: string }).action = "findFirst";
    }
    params.args = params.args || {};
    const where = { ...(params.args.where || {}) };
    where.projectId = projectFilter;
    params.args.where = where;
    return next(params);
  }

  // ─── ویرایش گروهی / حذف گروهی ───
  if (FILTERED_WRITE_ACTIONS.has(params.action)) {
    params.args = params.args || {};
    const where = { ...(params.args.where || {}) };
    where.projectId = projectFilter;
    params.args.where = where;
    return next(params);
  }

  // ─── ساخت (اگر خارج از محدوده باشد، رد شود) ───
  if (CREATE_ACTIONS.has(params.action)) {
    const data = params.args?.data;
    const items = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
    for (const it of items) {
      const pid = it?.projectId as string | null | undefined;
      if (pid !== undefined && pid !== null) {
        const allowed = single ? (pid === single) : projectIds.includes(pid);
        if (!allowed) {
          throw new ForbiddenException("دسترسی به این پروژه مجاز نیست");
        }
      }
    }
    return next(params);
  }

  // ویرایش/حذف تک‌رکورد در v1 فیلتر نمی‌شود — سرویس‌ها باید چک کنند.
  return next(params);
};
