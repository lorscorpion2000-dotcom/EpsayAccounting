import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const mlPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let ml = fs.readFileSync(mlPath, 'utf8');
let changed = 0;

// ═══════════════════════════════════════════════════════════════
// 1) سکشن site-ops — افزودن آیتمهای منتقلشده
// ═══════════════════════════════════════════════════════════════
const siteOpsOld = `  {
    key: 'site-ops',
    title: 'عملیات کارگاه',
    icon: ClipboardList,
    items: [
      { to: '/site-ops/daily-reports', label: 'گزارش\u200Cهای روزانه', icon: ClipboardList },
    ],
  },`;

const siteOpsNew = `  {
    key: 'site-ops',
    title: 'عملیات کارگاه',
    icon: ClipboardList,
    items: [
      { to: '/site-ops/daily-reports', label: 'گزارش\u200Cهای روزانه', icon: ClipboardList },
      { to: '/payroll/attendance', label: 'حضور و غیاب', icon: Clock },
      { to: '/payroll/work-logs', label: 'کارکرد روزانه', icon: Briefcase },
      { to: '/payroll/subcontractor-statements', label: 'صورت\u200Cوضعیت پیمانکاران', icon: FileText },
      { to: '/procurement/requests', label: 'درخواست\u200Cهای خرید', icon: ShoppingCart },
    ],
  },`;

if (ml.includes(siteOpsOld)) {
  ml = ml.replace(siteOpsOld, siteOpsNew);
  changed++;
  console.log('OK site-ops سکشن به\u200Cروز شد');
} else {
  console.log('!! site-ops anchor پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 2) سکشن payroll — حذف آیتم\u200Cهای منتقلشده
// ═══════════════════════════════════════════════════════════════
const payrollOld = `  {
    key: 'payroll',
    title: 'حقوق و دستمزد',
    icon: UsersIcon,
    items: [
      { to: '/payroll/employees', label: 'پرسنل', icon: UsersIcon },
      { to: '/payroll/periods', label: 'دوره\u200Cهای حقوق', icon: Calendar },
      { to: '/payroll/attendance', label: 'حضور و غیاب', icon: Clock },
      { to: '/payroll/work-logs', label: 'کارکرد روزانه', icon: Briefcase },
      { to: '/payroll/leave-requests', label: 'مرخصی\u200Cها', icon: CalendarOff },
      { to: '/payroll/advance-requests', label: 'مساعده', icon: Wallet },
      { to: '/payroll/subcontractor-statements', label: 'صورت\u200Cوضعیت پیمانکاران', icon: FileText },
    ],
  },`;

const payrollNew = `  {
    key: 'payroll',
    title: 'حقوق و دستمزد',
    icon: UsersIcon,
    items: [
      { to: '/payroll/employees', label: 'پرسنل', icon: UsersIcon },
      { to: '/payroll/periods', label: 'دوره\u200Cهای حقوق', icon: Calendar },
      { to: '/payroll/leave-requests', label: 'مرخصی\u200Cها', icon: CalendarOff },
      { to: '/payroll/advance-requests', label: 'مساعده', icon: Wallet },
    ],
  },`;

if (ml.includes(payrollOld)) {
  ml = ml.replace(payrollOld, payrollNew);
  changed++;
  console.log('OK payroll سکشن به\u200Cروز شد');
} else {
  console.log('!! payroll anchor پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 3) سکشن procurement — حذف درخواست\u200Cهای خرید
// ═══════════════════════════════════════════════════════════════
const procOld = `  {
    key: 'procurement',
    title: 'خرید و تدارکات',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/requests', label: 'درخواست\u200Cهای خرید', icon: ShoppingCart },
      { to: '/procurement/orders', label: 'دستورات خرید', icon: ShoppingBag },
    ],
  },`;

const procNew = `  {
    key: 'procurement',
    title: 'خرید و تدارکات',
    icon: ShoppingCart,
    items: [
      { to: '/procurement/orders', label: 'دستورات خرید', icon: ShoppingBag },
    ],
  },`;

if (ml.includes(procOld)) {
  ml = ml.replace(procOld, procNew);
  changed++;
  console.log('OK procurement سکشن به\u200Cروز شد');
} else {
  console.log('!! procurement anchor پیدا نشد');
}

if (changed > 0) {
  fs.writeFileSync(mlPath, ml, 'utf8');
  console.log('');
  console.log('✅ MainLayout.tsx ذخیره شد (' + changed + ' تغییر)');
}

console.log('');
console.log('=== DONE ===');