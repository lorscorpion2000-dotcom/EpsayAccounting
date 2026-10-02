import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-roles', p, 'utf8');
console.log('✅ بکاپ');

let changed = 0;

// 1) import useAuthStore
if (!p.includes('useAuthStore')) {
  p = p.replace(
    "import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';",
    "import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';\nimport { useAuthStore } from '@/store/auth.store';"
  );
  changed++;
  console.log('✅ import useAuthStore');
}

// 2) افزودن نقشه تب به نقش‌ها + helper
if (!p.includes('TAB_ROLES')) {
  const tabRolesDef = `
// نقشه: هر تب برای کدام نقش\u200Cها نمایش داده شود
const TAB_ROLES: Record<string, string[]> = {
  all: ['admin'],
  pettyCashTransactions: ['admin', 'accountant', 'approver'],
  pettyCashRequests: ['admin', 'accountant', 'approver'],
  purchaseRequests: ['admin', 'purchaser', 'site_supervisor', 'approver'],
  purchaseOrders: ['admin', 'purchaser', 'approver'],
  dailyReports: ['admin', 'site_supervisor', 'project_manager', 'approver'],
  goodsReceipts: ['admin', 'accountant', 'purchaser', 'warehouse_keeper', 'approver'],
  subcontractorStatements: ['admin', 'project_manager', 'accountant', 'approver'],
  leaveRequests: ['admin', 'hr', 'approver'],
  advanceRequests: ['admin', 'hr', 'accountant', 'approver'],
};

function canSeeTab(tab: string, roles: string[]): boolean {
  if (roles.includes('admin') || roles.includes('super_admin')) return true;
  const allowed = TAB_ROLES[tab] || [];
  return roles.some((r) => allowed.includes(r));
}

`;

  // درج بعد از تعریف interface PendingData
  const anchor = 'export default function ApprovalsPage() {';
  p = p.replace(anchor, tabRolesDef + '\n' + anchor);
  changed++;
  console.log('✅ TAB_ROLES + canSeeTab');
}

// 3) افزودن state نقش‌ها
if (!p.includes('userRoles')) {
  const anchor = "const [actionLoading, setActionLoading] = useState(false);";
  p = p.replace(
    anchor,
    anchor + `\n  const { user } = useAuthStore();\n  const userRoles = (user?.roles || []) as string[];`
  );
  changed++;
  console.log('✅ userRoles state');
}

// 4) فیلتر تب‌ها در JSX
if (!p.includes('{canSeeTab(') && !p.includes('canSeeTab(' + "'all'" + ',')) {
  // همه TabButtonهای موجود را در شرط بپیچانیم
  // روش: هر TabButton به‌صورت `{canSeeTab('xxx', userRoles) && (<TabButton ... />)}`
  
  // تب all
  p = p.replace(
    /<TabButton active=\{tab === 'all'\} onClick=\{\(\) => setTab\('all'\)\} label="همه" count=\{allItems\.length\} \/>/,
    `{canSeeTab('all', userRoles) && <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="همه" count={allItems.length} />}`
  );

  // بقیه تب‌ها — با regex
  const tabPatterns = [
    { key: 'pettyCashTransactions', label: 'تراکنش\u200Cهای تنخواه' },
    { key: 'pettyCashRequests', label: 'درخواست\u200Cهای شارژ' },
    { key: 'purchaseRequests', label: 'درخواست\u200Cهای خرید' },
    { key: 'purchaseOrders', label: 'دستورات خرید' },
    { key: 'dailyReports', label: 'گزارش\u200Cهای روزانه' },
    { key: 'goodsReceipts', label: 'رسیدهای انبار' },
    { key: 'subcontractorStatements', label: 'صورت\u200Cوضعیت\u200Cها' },
    { key: 'leaveRequests', label: 'مرخصی\u200Cها' },
    { key: 'advanceRequests', label: 'مساعده' },
  ];

  for (const tabInfo of tabPatterns) {
    const k = tabInfo.key;
    // پیدا کردن `<TabButton active={tab === 'k'} ... count={pending.k.length} />`
    const regex = new RegExp(
      `<TabButton\\s+active=\\{tab === '${k}'\\}[\\s\\S]*?count=\\{pending\\.${k}\\.length\\}\\s*\\/>`,
      'g'
    );
    const matches = p.match(regex);
    if (matches && matches.length > 0) {
      p = p.replace(matches[0], `{canSeeTab('${k}', userRoles) && ${matches[0]}}`);
      changed++;
    }
  }
  console.log('✅ تب\u200Cها فیلتر شدند');
}

// 5) انتخاب خودکار تب بر اساس نقش
if (!p.includes('autoSelectedTab')) {
  // در useEffect loadData، بعد از لود، اگر نقش محدود بود، تب پیش‌فرض انتخاب شود
  const loadDataAnchor = 'useEffect(() => { loadData(); }, []);';
  
  const autoSelectCode = `useEffect(() => { loadData(); }, []);

  // انتخاب خودکار تب بر اساس نقش کاربر
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []) as string[];
    if (roles.includes('admin') || roles.includes('super_admin')) return; // admin می\u200Cتواند تب را دستی انتخاب کند

    const availableTabs = Object.entries(TAB_ROLES)
      .filter(([k]) => k !== 'all' && canSeeTab(k, roles))
      .map(([k]) => k);

    // اگر تب فعلی در دسترس نیست، اولین تب مجاز انتخاب شود
    if (!availableTabs.includes(tab)) {
      if (availableTabs.length > 0) {
        setTab(availableTabs[0] as Tab);
      }
    }
  }, [user]);`;

  if (p.includes(loadDataAnchor)) {
    p = p.replace(loadDataAnchor, autoSelectCode);
    changed++;
    console.log('✅ انتخاب خودکار تب');
  }
}

// 6) نمایش «کارتابل من» در هدر
if (!p.includes('کارتابل من')) {
  // پیدا کردن h1 — معمولاً `<h1 className="text-2xl font-bold text-slate-800">...`
  const h1Regex = /<h1 className="text-2xl font-bold[^"]*">([^<]+)<\/h1>/;
  const h1Match = p.match(h1Regex);
  if (h1Match) {
    p = p.replace(
      h1Match[0],
      `<h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {userRoles.includes('admin') || userRoles.includes('super_admin') ? 'کارتابل مدیران' : 'کارتابل من'}
        </h1>`
    );
    changed++;
    console.log('✅ عنوان کارتابل من/مدیران');
  } else {
    console.log('ℹ h1 پیدا نشد برای عنوان');
  }
}

fs.writeFileSync(pagePath, p, 'utf8');
console.log('');
console.log('✅ ApprovalsPage.tsx ذخیره شد (' + changed + ' تغییر)');