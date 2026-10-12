import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, Wallet, Package, Users, Building2, FileCheck2, Truck, TrendingUp, TrendingDown, ArrowLeft, Loader2, RefreshCw, DollarSign, Activity, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line } from 'recharts';
import { api } from '@/services/api';
import PrintHeader from '@/components/PrintHeader';


import { formatNumber } from '@/utils/format';



interface QuickLink {
  title: string;
  description: string;
  icon: any;
  color: string;
  path?: string;
  soon?: boolean;
}

const ACCOUNTING_REPORTS: QuickLink[] = [
  { title: 'دفتر روزنامه', description: 'تمام اسناد به ترتیب تاریخ', icon: FileText, color: 'from-blue-500 to-blue-700', path: '/accounting/journal-book' },
  { title: 'دفتر معین', description: 'ریز تراکنش‌های یک حساب', icon: FileText, color: 'from-indigo-500 to-indigo-700', path: '/accounting/ledger' },
  { title: 'تراز آزمایشی', description: 'مانده تمام حساب‌ها', icon: BarChart3, color: 'from-violet-500 to-violet-700', path: '/accounting/trial-balance' },
  { title: 'تراز تفصیلی', description: 'مانده ابتدا گردش و انتها', icon: BarChart3, color: 'from-purple-500 to-purple-700', path: '/accounting/reports/detailed-trial-balance' },
  { title: 'سود و زیان', description: 'درآمدها هزینه‌ها و سود', icon: TrendingUp, color: 'from-emerald-500 to-emerald-700', path: '/accounting/reports/profit-loss' },
  { title: 'ترازنامه', description: 'دارایی بدهی و سرمایه', icon: Activity, color: 'from-teal-500 to-teal-700', path: '/accounting/reports/balance-sheet' },
  { title: 'ریز حساب طرف', description: 'تراکنش‌های هر شخص', icon: Users, color: 'from-cyan-500 to-cyan-700', path: '/accounting/reports/party-ledger' },
  { title: 'ریز حساب پروژه', description: 'مالی هر پروژه', icon: Building2, color: 'from-sky-500 to-sky-700', path: '/accounting/reports/project-ledger' },
  { title: 'سنی بدهکاران', description: 'مطالبات به تفکیک سن', icon: AlertCircle, color: 'from-amber-500 to-amber-700', path: '/accounting/reports/ar-aging' },
  { title: 'سنی بستانکاران', description: 'بدهی‌ها به تفکیک سن', icon: AlertCircle, color: 'from-orange-500 to-orange-700', path: '/accounting/reports/ap-aging' },
];

export default function ReportsHubPage() {
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [k, cf, pl, al] = await Promise.all([
        api.get('/dashboard/kpis').then((r) => r.data).catch(() => null),
        api.get('/dashboard/cash-flow').then((r) => r.data).catch(() => []),
        api.get('/dashboard/profit-loss').then((r) => r.data).catch(() => null),
        api.get('/dashboard/alerts').then((r) => r.data).catch(() => null),
      ]);
      setKpis(k);
      setCashFlow(Array.isArray(cf) ? cf : []);
      setProfitLoss(pl);
      setAlerts(al);
    } catch {
      toast.error('خطا در بارگذاری گزارشات');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = Number(kpis?.totalRevenue || profitLoss?.totalIncome || 0);
  const totalExpenses = Number(kpis?.totalExpenses || profitLoss?.totalExpense || 0);
  const netProfit = totalRevenue - totalExpenses;

  // داده نمودار
  const profitData = [
    { name: 'درآمد', value: totalRevenue, fill: '#10b981' },
    { name: 'هزینه', value: totalExpenses, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" ref={printRef}>
      <PrintHeader
        title="مرکز گزارشات"
        subtitle="خلاصه وضعیت مالی و تحلیلهای مدیریتی"
      />

      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            مرکز گزارشات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            خلاصه وضعیت مالی و دسترسی سریع به گزارشات تحلیلی
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> به‌روزرسانی
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-emerald-700 font-medium">درآمد کل</div>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold num text-emerald-800" dir="ltr">
            {formatNumber(totalRevenue)}
          </div>
          <div className="text-xs text-emerald-600 mt-1">ریال</div>
        </div>

        <div className="card p-5 bg-gradient-to-bl from-red-50 to-white border-red-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-red-700 font-medium">هزینه کل</div>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-xl font-bold num text-red-800" dir="ltr">
            {formatNumber(totalExpenses)}
          </div>
          <div className="text-xs text-red-600 mt-1">ریال</div>
        </div>

        <div className={clsx(
          'card p-5 bg-gradient-to-bl border',
          netProfit >= 0
            ? 'from-blue-50 to-white border-blue-200'
            : 'from-amber-50 to-white border-amber-200'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className={clsx('text-xs font-medium', netProfit >= 0 ? 'text-blue-700' : 'text-amber-700')}>
              {netProfit >= 0 ? 'سود خالص' : 'زیان خالص'}
            </div>
            <DollarSign className={clsx('w-5 h-5', netProfit >= 0 ? 'text-blue-600' : 'text-amber-600')} />
          </div>
          <div className={clsx('text-xl font-bold num', netProfit >= 0 ? 'text-blue-800' : 'text-amber-800')} dir="ltr">
            {formatNumber(Math.abs(netProfit))}
          </div>
          <div className={clsx('text-xs mt-1', netProfit >= 0 ? 'text-blue-600' : 'text-amber-600')}>
            ریال
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-bl from-violet-50 to-white border-violet-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-violet-700 font-medium">پروژه‌های فعال</div>
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-xl font-bold num text-violet-800">
            {kpis?.activeProjects ?? kpis?.projectsCount ?? '—'}
          </div>
          <div className="text-xs text-violet-600 mt-1">پروژه</div>
        </div>
      </div>

      {/* نمودارها */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* نمودار ستونی درآمد/هزینه */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">مقایسه درآمد و هزینه</h3>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          {profitData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              داده‌ای برای نمایش نیست
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => (v / 1e9).toFixed(1) + 'B'} />
                <Tooltip
                  formatter={(v: any) => [formatNumber(Number(v)) + ' ریال', '']}
                  contentStyle={{ fontFamily: 'inherit', direction: 'rtl' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {profitData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* جریان نقدی */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">جریان نقدی</h3>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          {cashFlow.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              داده‌ای برای نمایش نیست
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => (v / 1e9).toFixed(1) + 'B'} />
                <Tooltip formatter={(v: any) => [formatNumber(Number(v)) + ' ریال', '']} contentStyle={{ fontFamily: 'inherit', direction: 'rtl' }} />
                <Legend wrapperStyle={{ fontFamily: 'inherit' }} />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="درآمد" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="هزینه" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* هشدارها */}
      {alerts && (alerts.expiringPermits > 0 || alerts.pendingApprovals > 0 || alerts.lowStock > 0) && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">هشدارها</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {alerts.expiringPermits > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <span className="num font-bold">{alerts.expiringPermits}</span>
                مجوز در حال انقضا
              </div>
            )}
            {alerts.pendingApprovals > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <span className="num font-bold">{alerts.pendingApprovals}</span>
                سند در انتظار تأیید
              </div>
            )}
            {alerts.lowStock > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <span className="num font-bold">{alerts.lowStock}</span>
                کالای کم‌موجود
              </div>
            )}
          </div>
        </div>
      )}

      {/* دسترسی سریع به گزارشات حسابداری */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          گزارشات تحلیلی
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCOUNTING_REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                onClick={() => r.path && nav(r.path)}
                className="card p-5 transition-all cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 group"
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br shrink-0', r.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 mb-1">{r.title}</div>
                    <p className="text-xs text-slate-500 leading-6">{r.description}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* دسترسی سریع به ماول‌ها */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600" />
          گزارشات ماول‌ها
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: 'گزارش تنخواه', icon: Wallet, path: '/petty-cash', color: 'text-amber-600' },
            { title: 'گزارش انبار', icon: Package, path: '/warehouse/kardex', color: 'text-rose-600' },
            { title: 'گزارش پرسنل', icon: Users, path: '/payroll/periods', color: 'text-cyan-600' },
            { title: 'گزارش پروژه‌ها', icon: Building2, path: '/projects', color: 'text-indigo-600' },
            { title: 'گزارش مجوزها', icon: FileCheck2, path: '/timeline/permits', color: 'text-teal-600' },
            { title: 'گزارش خرید', icon: Truck, path: '/procurement/orders', color: 'text-orange-600' },
            { title: 'سرمایه شرکا', icon: Wallet, path: '/partner-capital/balance-sheet', color: 'text-violet-600' },
            { title: 'قراردادها', icon: FileText, path: '/contracts', color: 'text-blue-600' },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.title}
                onClick={() => nav(r.path)}
                className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all text-right"
              >
                <Icon className={clsx('w-5 h-5 shrink-0', r.color)} />
                <span className="text-sm font-medium text-slate-700">{r.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
