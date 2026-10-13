import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Briefcase, Wallet, Package, AlertTriangle, TrendingUp, Activity, CheckCircle2, RefreshCw, DollarSign, FileText, ShoppingCart, ClipboardList, Inbox, CalendarOff, Boxes } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { dashboardApi } from '../services/dashboard.api';
import type {
  DashboardKpis, CashFlowData, ProjectProgress, AlertsData, ProfitLossData,
} from '../services/dashboard.api';
import { formatNumber, toPersianDigits, formatJalaliDate } from '@/utils/format';
import KpiCard from '../components/KpiCard';

// ─── Lazy-loaded chart components (recharts ~408KB) ───────
const CashFlowChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.CashFlowChart }))
);
const ProfitLossChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.ProfitLossChart }))
);
const ProjectsProgressChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.ProjectsProgressChart }))
);

// ─── Skeleton fallback ────────────────────────────────────
function ChartSkeleton({ height = 256 }: { height?: number }) {
  return (
    <div className="card p-6">
      <div className="h-6 w-32 bg-slate-100 rounded mb-4 animate-pulse"></div>
      <div className="bg-slate-50 rounded-lg animate-pulse" style={{ height }}></div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [projects, setProjects] = useState<ProjectProgress[]>([]);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [k, cf, p, a, pl] = await Promise.all([
        dashboardApi.kpis(),
        dashboardApi.cashFlow(),
        dashboardApi.projectsProgress(),
        dashboardApi.alerts(),
        dashboardApi.profitLoss(),
      ]);
      setKpis(k);
      setCashFlow(cf);
      setProjects(p);
      setAlerts(a);
      setProfitLoss(pl);
    } catch (e) {
      toast.error('خطا در بارگذاری داشبورد');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-slate-100"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-80 animate-pulse bg-slate-100"></div>
          <div className="card h-80 animate-pulse bg-slate-100"></div>
        </div>
      </div>
    );
  }

  const pendingBreakdown = alerts?.pendingApprovals;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">داشبورد مدیریتی</h1>
          <p className="text-sm text-slate-500 mt-1">
            خوش آمدید، {user?.fullName} • امروز {toPersianDigits(new Date().toLocaleDateString('fa-IR'))}
          </p>
        </div>
        <button
          className={clsx('btn-secondary', refreshing && 'opacity-60')}
          onClick={() => loadData(false)}
          disabled={refreshing}
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          به‌روزرسانی
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Briefcase} label="پروژه‌های فعال" value={kpis?.activeProjects || 0} color="brand" onClick={() => navigate('/projects')} />
        <KpiCard icon={Wallet} label="موجودی تنخواه" value={kpis?.pettyCashBalance || 0} unit="ریال" color="emerald" onClick={() => navigate('/petty-cash')} />
        <KpiCard icon={Inbox} label="در انتظار تایید" value={kpis?.pendingApprovals || 0} color="amber" onClick={() => navigate('/approvals')} />
        <KpiCard icon={Package} label="کاربران سیستم" value={kpis?.totalUsers || 0} color="violet" onClick={() => navigate('/settings/users')} />
      </div>

      {/* Charts row 1: Cash Flow + P&L + Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <CashFlowChart cashFlow={cashFlow} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton />}>
          <ProfitLossChart profitLoss={profitLoss} />
        </Suspense>

        {/* Pending Approvals Breakdown (static, no charts) */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" />
              کارتابل تاییدها
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold num">
              {toPersianDigits(pendingBreakdown?.total || 0)}
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              { key: 'pettyCashTransactions', label: 'تراکنش تنخواه', icon: Wallet },
              { key: 'pettyCashRequests', label: 'شارژ تنخواه', icon: TrendingUp },
              { key: 'purchaseRequests', label: 'درخواست خرید', icon: ShoppingCart },
              { key: 'purchaseOrders', label: 'دستور خرید', icon: ShoppingCart },
              { key: 'dailyReports', label: 'گزارش روزانه', icon: ClipboardList },
              { key: 'goodsReceipts', label: 'رسید انبار', icon: Package },
              { key: 'subcontractorStatements', label: 'صورت‌وضعیت', icon: FileText },
              { key: 'clientStatements', label: 'صورت‌وضعیت کارفرما', icon: FileText },
              { key: 'workerStatements', label: 'صورت‌وضعیت پرسنل', icon: FileText },
              { key: 'leaveRequests', label: 'مرخصی', icon: CalendarOff },
              { key: 'advanceRequests', label: 'مساعده', icon: DollarSign },
            ].map((item) => {
              const value = pendingBreakdown ? (pendingBreakdown as any)[item.key] : 0;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate('/approvals')}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                    value > 0 ? 'hover:bg-slate-50' : 'opacity-50 cursor-default',
                  )}
                  disabled={value === 0}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                  <span className={clsx(
                    'text-xs font-bold num px-2 py-0.5 rounded-md',
                    value > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500',
                  )}>
                    {toPersianDigits(value)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projects Progress Chart - lazy */}
      <Suspense fallback={<ChartSkeleton height={288} />}>
        <ProjectsProgressChart projects={projects} />
      </Suspense>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Over Budget */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              پروژه‌های با انحراف بودجه
            </h2>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-md font-bold',
              (alerts?.overBudget.length || 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
            )}>
              {toPersianDigits(alerts?.overBudget.length || 0)}
            </span>
          </div>
          {!alerts?.overBudget.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
              <p className="text-sm">همه پروژه‌ها در محدوده بودجه هستند</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.overBudget.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => navigate('/projects/' + p.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                    <span className="text-xs font-bold text-red-700 num">
                      {toPersianDigits(p.deviationPercent)}٪
                    </span>
                  </div>
                  <div className="text-xs text-red-700 flex items-center justify-between">
                    <span>مازاد هزینه:</span>
                    <span className="num font-bold" dir="ltr">{formatNumber(p.deviation)} ریال</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Critical Stock */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              اقلام زیر حد بحرانی
            </h2>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-md font-bold',
              (alerts?.criticalStock.length || 0) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
            )}>
              {toPersianDigits(alerts?.criticalStock.length || 0)}
            </span>
          </div>
          {!alerts?.criticalStock.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
              <p className="text-sm">همه اقلام در محدوده مجاز هستند</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.criticalStock.map((s, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => navigate('/warehouse/kardex')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-sm">{s.itemName}</span>
                    <span className="text-xs text-slate-500 num" dir="ltr">{s.itemCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-700">
                    <span>{s.warehouse}</span>
                    <span className="num">
                      موجودی: <b>{toPersianDigits(s.currentQty)}</b> / بحرانی: <b>{toPersianDigits(s.reorderPoint)}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            فعالیت‌های اخیر
          </h2>
        </div>
        {!alerts?.recentActivities.length ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            هیچ فعالیتی ثبت نشده است
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.recentActivities.map((a, i) => {
              const icons: any = {
                journal: FileText,
                receipt: Package,
                issue: Package,
                statement: FileText,
              };
              const colors: any = {
                journal: 'bg-brand-50 text-brand-600',
                receipt: 'bg-emerald-50 text-emerald-600',
                issue: 'bg-amber-50 text-amber-600',
                statement: 'bg-violet-50 text-violet-600',
              };
              const Icon = icons[a.type] || FileText;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colors[a.type])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-800">{a.title}</span>
                      <span className="text-xs num text-slate-500" dir="ltr">{a.code}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{a.description}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="text-xs font-bold text-slate-800 num" dir="ltr">
                      {formatNumber(a.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 num">
                      {formatJalaliDate(a.date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}