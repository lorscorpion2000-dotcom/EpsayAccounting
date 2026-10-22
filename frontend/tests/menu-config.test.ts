import { describe, it, expect } from 'vitest';
import {
  MENU,
  findActiveSection,
  buildFilteredMenu,
  type MenuItem,
} from '@/layouts/menu-config';
import { getMenuPermission } from '@/config/route-permissions';

/** helper: allow only the listed codes */
function permOnly(...codes: string[]) {
  const set = new Set(codes);
  return (code: string) => set.has(code);
}

const allowAll = () => true;
const denyAll = () => false;

/** helper: استخراج همه آیتم‌های یک section (items + subsections.items) */
function allItemsOf(section: any): MenuItem[] {
  const direct = section.items ?? [];
  const sub = (section.subsections ?? []).flatMap((s: any) => s.items ?? []);
  return [...direct, ...sub];
}

describe('menu-config / findActiveSection', () => {
  it('returns "dashboard" for /dashboard', () => {
    expect(findActiveSection('/dashboard')).toBe('dashboard');
  });

  it('returns the parent section for nested paths (3-level)', () => {
    // /payroll/* الان زیر financial.subsections.payroll است
    expect(findActiveSection('/payroll/periods')).toBe('financial');
    // /accounting/* الان زیر financial.subsections.accounting است
    expect(findActiveSection('/accounting/journals')).toBe('financial');
    // /reports/project زیر dashboard.subsections.reports-hub است
    expect(findActiveSection('/reports/project')).toBe('reports');
    // مسیر مستقل: /contracts
    expect(findActiveSection('/contracts')).toBe('contracts');
  });

  it('returns empty string for unknown path', () => {
    expect(findActiveSection('/does-not-exist')).toBe('');
  });
});

describe('menu-config / buildFilteredMenu', () => {
  it('MENU has at least one section with /approvals item', () => {
    const hasApprovals = MENU.some((s) =>
      allItemsOf(s).some((it) => it.to === '/approvals'),
    );
    expect(hasApprovals).toBe(true);
  });

  it('denyAll: only items without permission code survive', () => {
    const filtered = buildFilteredMenu(denyAll);
    for (const s of filtered) {
      const items = allItemsOf(s);
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) {
        expect(getMenuPermission(it.to)).toBeNull();
      }
    }
    // همه آیتم‌های حذف‌شده باید permission داشته باشند
    const allItems = filtered.flatMap(allItemsOf);
    const forbidden = allItems.filter((it) => getMenuPermission(it.to) !== null);
    expect(forbidden.length).toBe(0);
  });

  it('allowAll: keeps all sections', () => {
    const filtered = buildFilteredMenu(allowAll);
    expect(filtered.length).toBe(MENU.length);
  });

  it('label "/approvals" -> "کارتابل تأییدها" when has approvals.update', () => {
    const filtered = buildFilteredMenu(
      permOnly('approvals.read', 'approvals.update'),
    );
    const approvalsItem = filtered
      .flatMap(allItemsOf)
      .find((it) => it.to === '/approvals');
    expect(approvalsItem).toBeDefined();
    expect(approvalsItem!.label).toBe('کارتابل تأییدات');
  });

  it('label "/approvals" -> "کارتابل من" when missing approvals.update', () => {
    const filtered = buildFilteredMenu(permOnly('approvals.read'));
    const approvalsItem = filtered
      .flatMap(allItemsOf)
      .find((it) => it.to === '/approvals');
    expect(approvalsItem).toBeDefined();
    expect(approvalsItem!.label).toBe('کارتابل من');
  });

  it('sections with zero items are removed', () => {
    const filtered = buildFilteredMenu(permOnly('accounting.read'));
    for (const s of filtered) {
      const items = allItemsOf(s);
      expect(items.length).toBeGreaterThan(0);
    }
  });
});
