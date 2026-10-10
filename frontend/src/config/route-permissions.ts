/**
 * F1 — نقشه مسیرها به permission
 * الگوی regex روی pathname اجرا می‌شود. اولین تطبیق برنده است.
 * اگر مسیری اینجا نباشد، همه کاربران احراز‌شده می‌بینند.
 */

interface RouteRule {
  pattern: RegExp;
  code: string;
}

const RULES: RouteRule[] = [
  // ── تنظیمات ──
  { pattern: /^\/settings\/users/,          code: 'settings.read' },
  { pattern: /^\/settings\/roles/,          code: 'settings.read' },
  { pattern: /^\/settings\/units/,          code: 'settings.read' },
  { pattern: /^\/settings\/fiscal-years/,   code: 'settings.read' },
  { pattern: /^\/settings\/period-lock/,    code: 'settings.read' },
  // /settings/profile همیشه باز است

  // ── قراردادها و پروژه ──
  { pattern: /^\/contracts/,                 code: 'contracts.read' },
  { pattern: /^\/projects/,                  code: 'projects.read' },
  { pattern: /^\/directory/,                 code: 'directory.read' },
  { pattern: /^\/price-lists/,               code: 'price-list.read' },

  // ── فروش ──
  { pattern: /^\/sales/,                     code: 'sales.read' },

  // ── حسابداری ──
  { pattern: /^\/accounting\/accounts/,       code: 'accounting.accounts.read' },
  { pattern: /^\/accounting\/journals/,       code: 'accounting.read' },
  { pattern: /^\/accounting\/journal-book/,   code: 'accounting.read' },
  { pattern: /^\/accounting\/advanced-ledger/,code: 'accounting.read' },
  { pattern: /^\/accounting\/trial-balance/,  code: 'accounting.read' },
  { pattern: /^\/accounting\/mappings/,       code: 'accounting.read' },
  { pattern: /^\/accounting\/cost-centers/,   code: 'accounting.read' },
  { pattern: /^\/accounting\/banks/,          code: 'bank.read' },
  { pattern: /^\/accounting\/cheques/,        code: 'accounting.read' },
  { pattern: /^\/accounting\/fixed-assets/,   code: 'accounting.read' },
  { pattern: /^\/accounting\/depreciation-run/,code: 'accounting.read' },
  { pattern: /^\/accounting/,                code: 'accounting.read' },

  // ── عملیات تعدیل ──
  { pattern: /^\/adjustment-indices/,        code: 'adjustment.read' },
  { pattern: /^\/adjustments/,               code: 'adjustment.read' },
  { pattern: /^\/material-price-diffs/,      code: 'materialpricediff.read' },

  // ── گزارش‌ها ──
  { pattern: /^\/tax-reports/,               code: 'tax-reports.read' },
  { pattern: /^\/operational-reports/,       code: 'operational-reports.read' },
  { pattern: /^\/reports/,                   code: '' }, // آزاد

  // ── تنخواه ──
  { pattern: /^\/petty-cash/,                code: 'petty-cash.read' },

  // ── کارتابل ──
  { pattern: /^\/approvals/,                 code: 'approvals.read' },

  // ── تدارکات ──
  { pattern: /^\/procurement/,               code: 'procurement.read' },

  // ── انبار ──
  { pattern: /^\/warehouse\/warehouses/,      code: 'warehouse.read' },
  { pattern: /^\/warehouse\/items/,           code: 'warehouse.read' },
  { pattern: /^\/warehouse\/categories/,      code: 'warehouse.read' },
  { pattern: /^\/warehouse\/receipts/,        code: 'warehouse.read' },
  { pattern: /^\/warehouse\/issues/,          code: 'warehouse.read' },
  { pattern: /^\/warehouse\/kardex/,          code: 'warehouse.read' },
  { pattern: /^\/warehouse/,                 code: 'warehouse.read' },
  { pattern: /^\/inventory-counts/,          code: 'inventory-count.read' },
  { pattern: /^\/warehouse-transfers/,       code: 'warehouse-transfer.read' },
  { pattern: /^\/material-report/,           code: 'material-report.read' },

  // ── ماشین‌آلات ──
  { pattern: /^\/equipment/,                 code: 'equipment.read' },

  // ── حقوق و دستمزد ──
  { pattern: /^\/payroll/,                   code: 'payroll.read' },

  // ── صورت‌وضعیت‌ها ──
  { pattern: /^\/client-statements/,         code: 'client-statement.read' },

  // ── تسهیم سربار ──
  { pattern: /^\/overhead-allocations/,      code: 'overhead.read' },

  // ── WIP ──
  { pattern: /^\/wip/,                       code: 'wip.read' },

  // ── سرمایه شرکا ──
  { pattern: /^\/partner-capital/,           code: 'partners.read' },

  // ── گاه‌شمار ──
  { pattern: /^\/timeline/,                  code: 'timeline.read' },

  // ── ابزارها ──
  { pattern: /^\/audit/,                     code: 'audit.read' },
  { pattern: /^\/backup/,                    code: 'backup.read' },
  { pattern: /^\/data-io/,                   code: 'data-io.read' },
  { pattern: /^\/recycle-bin/,               code: '' }, // آزاد
  { pattern: /^\/notifications/,             code: '' }, // آزاد
  { pattern: /^\/help/,                      code: '' }, // آزاد
  { pattern: /^\/dashboard/,                 code: '' }, // آزاد
];

/**
 * کد permission لازم برای یک مسیر. رشته خالی یا null یعنی «آزاد برای همه».
 */
export function getRoutePermission(pathname: string): string | null {
  for (const rule of RULES) {
    if (rule.pattern.test(pathname)) {
      return rule.code || null;
    }
  }
  return null;
}

/**
 * کد permission لازم برای یک آیتم منو (نسبت به مسیر)
 */
export function getMenuPermission(to: string): string | null {
  return getRoutePermission(to);
}
