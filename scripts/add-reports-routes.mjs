import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Router — افزودن ۷ روت
// ═══════════════════════════════════════════════════════════════
const routerPath = ROOT + '/frontend/src/app/router.tsx';
let router = fs.readFileSync(routerPath, 'utf8');
let changes = 0;

// imports
const newImports = [
  { name: 'PartyLedgerPage', path: '@/modules/accounting/pages/PartyLedgerPage' },
  { name: 'ProjectLedgerPage', path: '@/modules/accounting/pages/ProjectLedgerPage' },
  { name: 'ARAgingPage', path: '@/modules/accounting/pages/ARAgingPage' },
  { name: 'APAgingPage', path: '@/modules/accounting/pages/APAgingPage' },
  { name: 'ProfitLossPage', path: '@/modules/accounting/pages/ProfitLossPage' },
  { name: 'AccountingBalanceSheetPage', path: '@/modules/accounting/pages/BalanceSheetPage' },
  { name: 'DetailedTrialBalancePage', path: '@/modules/accounting/pages/DetailedTrialBalancePage' },
];

// anchor: import TrialBalancePage
const importAnchor = "import TrialBalancePage from '@/modules/accounting/pages/TrialBalancePage';";
if (router.includes(importAnchor)) {
  let importBlock = '\n';
  for (const imp of newImports) {
    if (!router.includes(`import ${imp.name} from '${imp.path}';`)) {
      importBlock += `import ${imp.name} from '${imp.path}';\n`;
    }
  }
  router = router.replace(importAnchor, importAnchor + importBlock);
  changes++; console.log('OK imports');
}

// routes — anchor: trial-balance route
const routeAnchor = '<Route path="/accounting/trial-balance" element={<TrialBalancePage />} />';
if (router.includes(routeAnchor)) {
  const newRoutes = `
        <Route path="/accounting/reports/party-ledger" element={<PartyLedgerPage />} />
        <Route path="/accounting/reports/project-ledger" element={<ProjectLedgerPage />} />
        <Route path="/accounting/reports/ar-aging" element={<ARAgingPage />} />
        <Route path="/accounting/reports/ap-aging" element={<APAgingPage />} />
        <Route path="/accounting/reports/profit-loss" element={<ProfitLossPage />} />
        <Route path="/accounting/reports/balance-sheet" element={<AccountingBalanceSheetPage />} />
        <Route path="/accounting/reports/detailed-trial-balance" element={<DetailedTrialBalancePage />} />`;
  router = router.replace(routeAnchor, routeAnchor + newRoutes);
  changes++; console.log('OK routes');
}

fs.writeFileSync(routerPath, router, 'utf8');

// ═══════════════════════════════════════════════════════════════
// 2) Sidebar — افزودن آیتمهای گزارشات زیر حسابداری
// ═══════════════════════════════════════════════════════════════
const layoutPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

// anchor: trial-balance item
const sidebarAnchor = "{ to: '/accounting/trial-balance', label: 'تراز آزمایشی', icon: BarChart3 },";
if (layout.includes(sidebarAnchor) && !layout.includes("'/accounting/reports/profit-loss'")) {
  const newItems = sidebarAnchor + `
      { to: '/accounting/reports/detailed-trial-balance', label: 'تراز تفصیلی', icon: BarChart3 },
      { to: '/accounting/reports/profit-loss', label: 'سود و زیان', icon: TrendingUp },
      { to: '/accounting/reports/balance-sheet', label: 'ترازنامه', icon: Scale },
      { to: '/accounting/reports/party-ledger', label: 'ریز حساب طرف', icon: UsersIcon },
      { to: '/accounting/reports/project-ledger', label: 'ریز حساب پروه', icon: Briefcase },
      { to: '/accounting/reports/ar-aging', label: 'سنی بدهکاران', icon: AlertCircle },
      { to: '/accounting/reports/ap-aging', label: 'سنی بستانکاران', icon: AlertCircle },`;
  layout = layout.replace(sidebarAnchor, newItems);
  changes++; console.log('OK sidebar items');
}

// imports آیکونهای جدید
if (!layout.includes('Scale') || !layout.includes('AlertCircle')) {
  // پیدا کردن import lucide
  const lucideMatch = layout.match(/import \{([\s\S]*?)\} from 'lucide-react';/);
  if (lucideMatch) {
    const imports = lucideMatch[1];
    const needed = ['Scale', 'AlertCircle'];
    const missing = needed.filter((n) => !imports.includes(n));
    if (missing.length) {
      // اضافه کردن به آخر imports
      const lastEnd = imports.lastIndexOf(',');
      const newImports = imports.slice(0, lastEnd + 1) + ' ' + missing.join(', ') + imports.slice(lastEnd + 1);
      layout = layout.replace(lucideMatch[0], "import {" + newImports + "} from 'lucide-react';");
      changes++; console.log('OK lucide imports: ' + missing.join(', '));
    }
  }
}

fs.writeFileSync(layoutPath, layout, 'utf8');

console.log('');
console.log('=== DONE (' + changes + ' تغییر) ===');