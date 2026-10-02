import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════ 1) صفحه ReportsHubPage ═══════════
const page = `import { BarChart3, FileText, Wallet, Package, Users, Building2, FileCheck2, Truck, TrendingUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReportCard {
  title: string;
  description: string;
  icon: any;
  color: string;
  path?: string;
  soon?: boolean;
}

const CARDS: ReportCard[] = [
  { title: 'گزارش‌های حسابداری', description: 'دفتر روزنامه، معین، تراز آزمایشی', icon: FileText, color: 'from-blue-500 to-blue-700', path: '/accounting/journal-book' },
  { title: 'سود و زیان', description: 'درآمدها، هزینه‌ها و سود خالص دوره', icon: TrendingUp, color: 'from-emerald-500 to-emerald-700', soon: true },
  { title: 'ترازنامه', description: 'دارایی‌ها، بدهی‌ها و سرمایه', icon: BarChart3, color: 'from-purple-500 to-purple-700', soon: true },
  { title: 'گزارش تنخواه', description: 'مصارف تنخواه به تفکیک مرکز هزینه', icon: Wallet, color: 'from-amber-500 to-amber-700', path: '/petty-cash' },
  { title: 'گزارش انبار', description: 'موجودی، رسید و حواله به تفکیک انبار', icon: Package, color: 'from-rose-500 to-rose-700', path: '/warehouse/kardex' },
  { title: 'گزارش پرسنل', description: 'حقوق و دستمزد، حضور و غیاب', icon: Users, color: 'from-cyan-500 to-cyan-700', path: '/payroll/periods' },
  { title: 'گزارش پروژه‌ها', description: 'پیشرفت فیزیکی و مالی پروژه‌ها', icon: Building2, color: 'from-indigo-500 to-indigo-700', path: '/projects' },
  { title: 'گزارش مجوزها و بیمه‌ها', description: 'موارد منقضی‌شده و در حال انقضا', icon: FileCheck2, color: 'from-teal-500 to-teal-700', path: '/timeline/permits' },
  { title: 'گزارش خرید', description: 'درخواست‌ها، سفارشات و تأمین‌کنندگان', icon: Truck, color: 'from-orange-500 to-orange-700', path: '/procurement/orders' },
];

export default function ReportsHubPage() {
  const nav = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-600" />
          گزارشات
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          مرکز گزارشات سیستم — برخی گزارشات در حال تکمیل هستند
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const clickable = !c.soon && c.path;
          return (
            <div
              key={c.title}
              onClick={() => clickable && nav(c.path!)}
              className={
                'card p-6 transition-all ' +
                (clickable ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5' : 'opacity-70')
              }
            >
              <div className="flex items-start gap-4">
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ' + c.color}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-slate-800">{c.title}</div>
                    {c.soon && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">به‌زودی</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-6">{c.description}</p>
                </div>
                {clickable && <ArrowLeft className="w-4 h-4 text-slate-300 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          💡 <b>گزارشات تحلیلی</b> (سود و زیان، ترازنامه، جریان نقدی) در نسخه‌های بعدی اضافه می‌شوند.
        </p>
      </div>
    </div>
  );
}
`;

fs.mkdirSync(ROOT + '/frontend/src/modules/reports/pages', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/reports/pages/ReportsHubPage.tsx', page, 'utf8');
console.log('OK ReportsHubPage.tsx');

// ═══════════ 2) Router ═══════════
const routerPath = ROOT + '/frontend/src/app/router.tsx';
let router = fs.readFileSync(routerPath, 'utf8');

if (!router.includes('ReportsHubPage')) {
  router = router.replace(
    "import DashboardPage from '@/modules/dashboard/pages/DashboardPage';",
    "import DashboardPage from '@/modules/dashboard/pages/DashboardPage';\nimport ReportsHubPage from '@/modules/reports/pages/ReportsHubPage';"
  );
  router = router.replace(
    '<Route path="/dashboard" element={<DashboardPage />} />',
    '<Route path="/dashboard" element={<DashboardPage />} />\n        <Route path="/reports" element={<ReportsHubPage />} />'
  );
  fs.writeFileSync(routerPath, router, 'utf8');
  console.log('OK router');
} else {
  console.log('SKIP router');
}

console.log('');
console.log('=== DONE ===');