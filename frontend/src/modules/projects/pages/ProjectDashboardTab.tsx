import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, Wallet,
  Package, Users, Activity, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import clsx from 'clsx';
import { api } from '@/services/api';
import { formatNumber, toPersianDigits } from '@/utils/format';

const COLORS = ['#6C63FF', '#2EC4B6', '#EB5B38', '#F5A623', '#8E44AD', '#3498DB', '#E91E63'];

export default function ProjectDashboardTab() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [scurve, setScurve] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const now = new Date();
    const from = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    Promise.all([
      api.get('/reports/project/' + id, { params: { from, to } }).then(r => r.data),
      api.get('/wip/s-curve/' + id).then(r => r.data).catch(() => null),
    ])
      .then(([r, sc]) => { setReport(r); setScurve(sc); })
      .catch(() => toast.error('خطا در بارگذاری داشبورد'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!report) return <div className="card p-12 text-center text-slate-400 text-sm">داده‌ای موجود نیست</div>;

  const kpi = report.kpi || {};
  const cashFlow = report.cashFlow || {};
  const costByCat = report.costByCategory?.categories || [];
  const progressVsCost = report.progressVsCost || { rows: [] };
  const accounting = report.accounting || {};
  const budget = report.budget || {};
  const aging = report.aging || {};

  const kpiCards = [
    { icon: DollarSign, label: 'بودجه کل', value: kpi.totalBudget || 0, color: 'violet' },
    { icon: TrendingDown, label: 'هزینه واقعی', value: kpi.totalExpense || 0, color: 'rose' },
    { icon: TrendingUp, label: 'درآمد', value: kpi.totalRevenue || 0, color: 'emerald' },
    { icon: Activity, label: 'درصد مصرف بودجه', value: (kpi.percentUsed || 0) + '%', isString: true, color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={clsx('card p-4 border-s-4', {
              'border-s-violet-500': c.color === 'violet',
              'border-s-rose-500': c.color === 'rose',
              'border-s-emerald-500': c.color === 'emerald',
              'border-s-amber-500': c.color === 'amber',
            })}>
              <div className="flex items-center gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', {
                  'bg-violet-100 text-violet-600': c.color === 'violet',
                  'bg-rose-100 text-rose-600': c.color === 'rose',
                  'bg-emerald-100 text-emerald-600': c.color === 'emerald',
                  'bg-amber-100 text-amber-600': c.color === 'amber',
                })}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">{c.label}</div>
                  <div className="text-lg font-bold num text-slate-800 truncate">
                    {c.isString ? toPersianDigits(c.value) : formatNumber(c.value)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* S-Curve */}
      {scurve?.points?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            منحنی S — پیشرفت فیزیکی و مالی
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scurve.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => toPersianDigits(Number(v).toFixed(2)) + '%'} />
                <Legend />
                <Line type="monotone" dataKey="physicalCum" name="پیشرفت فیزیکی" stroke="#6C63FF" strokeWidth={2} />
                <Line type="monotone" dataKey="financialCum" name="پیشرفت مالی" stroke="#EB5B38" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cash Flow + Cost by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cash Flow */}
        {cashFlow.byMonth?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand-600" />
              جریان نقدی ماهانه
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
                  <Legend />
                  <Bar dataKey="in" name="ورودی" fill="#2EC4B6" />
                  <Bar dataKey="out" name="خروجی" fill="#EB5B38" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cost by Category */}
        {costByCat.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-600" />
              هزینه به تفکیک دسته
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costByCat}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    label={(entry: any) => toPersianDigits(entry.name)}
                  >
                    {costByCat.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Progress vs Cost */}
      {progressVsCost.rows?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            پیشرفت در برابر هزینه — {toPersianDigits(progressVsCost.warningCount || 0)} هشدار
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressVsCost.rows.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => toPersianDigits(Number(v).toFixed(2)) + '%'} />
                <Legend />
                <Bar dataKey="progress" name="پیشرفت %" fill="#6C63FF" />
                <Bar dataKey="costPercent" name="هزینه %" fill="#EB5B38" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Aging */}
      {(aging.receivable?.total > 0 || aging.payable?.total > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-bold text-emerald-700 mb-3">مطالبات (AR)</h3>
            <div className="text-2xl font-bold num text-emerald-800 mb-3">
              {formatNumber(aging.receivable?.total || 0)} ریال
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(aging.receivable?.buckets || {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">{k} روز</span>
                  <span className="num font-medium">{formatNumber(Number(v))}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold text-rose-700 mb-3">بدهی‌ها (AP)</h3>
            <div className="text-2xl font-bold num text-rose-800 mb-3">
              {formatNumber(aging.payable?.total || 0)} ریال
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(aging.payable?.buckets || {}).map(([k, v]: any) => (
                <div key={k} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">{k} روز</span>
                  <span className="num font-medium">{formatNumber(Number(v))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
