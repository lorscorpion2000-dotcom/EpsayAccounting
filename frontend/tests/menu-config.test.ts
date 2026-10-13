import { describe, it, expect } from 'vitest';
import {
  MENU,
  findActiveSection,
  buildFilteredMenu,
} from '@/layouts/menu-config';
import { getMenuPermission } from '@/config/route-permissions';

/** helper: allow only the listed codes */
function permOnly(...codes: string[]) {
  const set = new Set(codes);
  return (code: string) => set.has(code);
}

const allowAll = () => true;
const denyAll = () => false;

describe('menu-config / findActiveSection', () => {
  it('returns "dashboard" for /dashboard', () => {
    expect(findActiveSection('/dashboard')).toBe('dashboard');
  });

  it('returns the parent section for nested paths', () => {
    expect(findActiveSection('/payroll/periods')).toBe('payroll');
    expect(findActiveSection('/accounting/journals')).toBe('accounting');
  });

  it('returns empty string for unknown path', () => {
    expect(findActiveSection('/does-not-exist')).toBe('');
  });
});

describe('menu-config / buildFilteredMenu', () => {
  it('MENU has at least one section with /approvals item', () => {
    const hasApprovals = MENU.some((s) =>
      s.items.some((it) => it.to === '/approvals'),
    );
    expect(hasApprovals).toBe(true);
  });

  it('denyAll: only items without permission code survive', () => {
    const filtered = buildFilteredMenu(denyAll);
    // بعضی مسیرها در route-permissions آزادند (code = '')
    // پس همه sectionها نباید حذف شوند
    for (const s of filtered) {
      expect(s.items.length).toBeGreaterThan(0);
      for (const it of s.items) {
        expect(getMenuPermission(it.to)).toBeNull();
      }
    }
    // و همه آیتم‌های مجاز حذف شده‌اند
    const allItems = filtered.flatMap((s) => s.items);
    const forbidden = allItems.filter((it) => getMenuPermission(it.to) !== null);
    expect(forbidden.length).toBe(0);
  });

  it('allowAll: keeps all sections', () => {
    const filtered = buildFilteredMenu(allowAll);
    expect(filtered.length).toBe(MENU.length);
  });

  it('label "/approvals" -> "کارتابل تأییدها" when has approvals.update', () => {
    // کاربر باید approvals.read برای دیدن + approvals.update برای label تغییر نکند
    const filtered = buildFilteredMenu(
      permOnly('approvals.read', 'approvals.update'),
    );
    const approvalsItem = filtered
      .flatMap((s) => s.items)
      .find((it) => it.to === '/approvals');
    expect(approvalsItem).toBeDefined();
    expect(approvalsItem!.label).toBe('کارتابل تأییدها');
  });

  it('label "/approvals" -> "کارتابل من" when missing approvals.update', () => {
    // کاربر با approvals.read ولی بدون approvals.update
    const filtered = buildFilteredMenu(permOnly('approvals.read'));
    const approvalsItem = filtered
      .flatMap((s) => s.items)
      .find((it) => it.to === '/approvals');
    expect(approvalsItem).toBeDefined();
    expect(approvalsItem!.label).toBe('کارتابل من');
  });

  it('sections with zero items are removed', () => {
    const filtered = buildFilteredMenu(permOnly('accounting.read'));
    for (const s of filtered) {
      expect(s.items.length).toBeGreaterThan(0);
    }
  });
});
