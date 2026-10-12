import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Briefcase, FileCheck, TrendingUp, TrendingDown,
  Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Bell,
  ClipboardList, ShoppingCart, FileSpreadsheet, Clock,
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardExecApi } from '../services/dashboard-exec.api';
import type { DashboardExecutive } from '@/types/dashboard-exec';
import { toPersianDigits, formatJalaliDate } from '@/utils/format';

export default function ExecutiveDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardExecutive | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await dashboardExecApi.executive()); }
    catch { toast.error('خطا در بارگذاری داشبورد'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!data) return null;

  const k = data.kpi;
  const cf = data.cashFlowForecast;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">داشبورد مدیریتی</h1>
          <p className="text-sm text-slate-500 mt-1">
            نمای کلی عملکرد مالی و عملیاتی سازمان
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Briefcase}
          label="پروژه‌های فعال"
          value={toPersianDigits(k.activeProjects)}
          color="brand"
        />
        <KpiCard
          icon={FileCheck}
          label="قراردادهای فعال"
          value={toPersianDigits(k.activeContracts)}
          sub={toPersianDigits(Math.round(k.totalContractValue / 1000000).toLocaleString()) + ' میلیون ریال'}
          color="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="درآمد سال جاری"
          value={toPersianDigits(Math.round(k.ytdRevenue / 1000000).toLocaleString()) + ' م'}
          color="emerald"
        />
        <KpiCard
          icon={TrendingDown}
          label="هزینه سال جاری"
          value={toPersianDigits(Math.round(k.ytdCost / 1000000).toLocaleString()) + ' م'}
          color="amber"
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="سود سال جاری"
          value={toPersianDigits(Math.round(k.ytdProfit / 1000000).toLocaleString()) + ' م'}
          color={k.ytdProfit >= 0 ? 'emerald' : 'red'}
        />
        <KpiCard
          icon={Wallet}
          label="موجودی نقد و بانک"
          value={toPersianDigits(Math.round(k.cashOnHand / 1000000).toLocaleString()) + ' م'}
          color="brand"
        />
        <KpiCard
          icon={ArrowDownCircle}
          label="حساب‌های دریافتنی"
          value={toPersianDigits(Math.round(k.receivables / 1000000).toLocaleString()) + ' م'}
          color="blue"
        />
        <KpiCard
          icon={ArrowUpCircle}
          label="حساب‌های پرداختنی"
          value={toPersianDigits(Math.round(k.payables / 1000000).toLocaleString()) + ' م'}
          color="red"
        />
      </div>

      {/* Pending Approvals */}
      {data.pendingApprovals.total > 0 && (
        <div className="card p-5 border-s-4 border-s-amber-400 bg-amber-50/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-amber-600" />
              <div>
                <div className="font-bold text-amber-900">
                  {toPersianDigits(data.pendingApprovals.total)} مورد در انتظار تایید
                </div>
                <div className="text-xs text-amber-700 mt-1 flex items-center gap-4 flex-wrap">
                  {data.pendingApprovals.dailyReports > 0 && (
                    <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {toPersianDigits(data.pendingApprovals.dailyReports)} گزارش روزانه</span>
                  )}
                  {data.pendingApprovals.purchaseRequests > 0 && (
                    <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {toPersianDigits(data.pendingApprovals.purchaseRequests)} درخواست خرید</span>
                  )}
                  {data.pendingApprovals.statements > 0 && (
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> {toPersianDigits(data.pendingApprovals.statements)} صورت‌وضعیت</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/approvals')} className="btn-primary text-sm">
              کارتابل تاییدها
            </button>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {data.monthlyTrend.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4">روند درآمد و هزینه (۶ ماه اخیر)</h2>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'monospace' }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'م'} />
                <Tooltip
                  contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: 'inherit', fontSize: 12 }}
                  formatter={(value: any, name: any) => [
                    toPersianDigits(Math.round(value).toLocaleString()) + ' ریال',
                    name === 'revenue' ? 'درآمد' : name === 'cost' ? 'هزینه' : 'سود',
                  ]}
                />
                <Legend
                  formatter={(v: string) => v === 'revenue' ? 'درآمد' : v === 'cost' ? 'هزینه' : 'سود'}
                  wrapperStyle={{ fontFamily: 'inherit', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Projects */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" />
            پروژه‌های اصلی
          </h2>
          {data.projects.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">پروژه‌ای یافت نشد</div>
          ) : (
            <div className="space-y-3">
              {data.projects.map((p) => (
                <div key={p.id}
                  onClick={() => navigate('/projects/' + p.id)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500 num font-mono" dir="ltr">{p.code}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-slate-500">مبلغ قرارداد</div>
                    <div className="text-sm font-bold num">
                      {toPersianDigits(Math.round(p.contractAmount / 1000000).toLocaleString())} م
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cash Flow Forecast */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            پیش‌بینی جریان نقدینگی
          </h2>
          <div className="space-y-4">
            <ForecastRow label="۳۰ روز آینده" data={cf.d30} />
            <ForecastRow label="۶۰ روز آینده" data={cf.d60} />
            <ForecastRow label="۹۰ روز آینده" data={cf.d90} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(data.chequeAlerts.length > 0 || data.guaranteeAlerts.length > 0 || data.insuranceAlerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.chequeAlerts.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                چک‌های سررسید ۷ روز آینده
              </h3>
              <div className="space-y-2">
                {data.chequeAlerts.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded bg-amber-50">
                    <div className="truncate flex-1">
                      <span className="num font-mono me-1" dir="ltr">{c.code}</span>
                      <span className="text-slate-600">{c.partner}</span>
                    </div>
                    <div className="text-left ms-2">
                      <div className="font-bold num">{toPersianDigits(Math.round(c.amount / 1000000).toLocaleString())} م</div>
                      <div className="text-[10px] text-slate-500 num">{formatJalaliDate(c.dueDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.guaranteeAlerts.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                ضمانت‌نامه‌های منقضی‌شده نزدیک
              </h3>
              <div className="space-y-2">
                {data.guaranteeAlerts.slice(0, 5).map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-xs p-2 rounded bg-red-50">
                    <div className="truncate flex-1">
                      <span className="font-medium">{g.title}</span>
                    </div>
                    <div className="text-left ms-2">
                      <div className="font-bold num">{toPersianDigits(Math.round(g.amount / 1000000).toLocaleString())} م</div>
                      <div className="text-[10px] text-slate-500 num">{formatJalaliDate(g.expiryDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.insuranceAlerts.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                بیمه‌نامه‌های نزدیک به انقضا
              </h3>
              <div className="space-y-2">
                {data.insuranceAlerts.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-xs p-2 rounded bg-orange-50">
                    <div className="truncate flex-1">
                      <span className="font-medium">{i.title}</span>
                    </div>
                    <div className="text-left ms-2">
                      <div className="text-[10px] text-slate-500 num">{formatJalaliDate(i.expiryDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    brand: 'from-brand-500 to-brand-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
    blue: 'from-blue-500 to-blue-700',
    red: 'from-red-500 to-red-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={'w-10 h-10 rounded-lg bg-gradient-to-br ' + colors[color] + ' flex items-center justify-center text-white shadow-md'}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-3">{label}</div>
      <div className="text-lg font-bold num mt-1">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5 num">{sub}</div>}
    </div>
  );
}

function ForecastRow({ label, data }: any) {
  const net = data.net;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="flex items-center gap-4 text-xs">
        <div className="text-center">
          <div className="text-slate-500">ورود</div>
          <div className="font-bold num text-emerald-600">
            {toPersianDigits(Math.round(data.inflow / 1000000).toLocaleString())} م
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500">خروج</div>
          <div className="font-bold num text-red-600">
            {toPersianDigits(Math.round(data.outflow / 1000000).toLocaleString())} م
          </div>
        </div>
        <div className="text-center border-s border-slate-200 ps-4">
          <div className="text-slate-500">خالص</div>
          <div className={'font-bold num ' + (net >= 0 ? 'text-emerald-700' : 'text-red-700')}>
            {toPersianDigits(Math.round(net / 1000000).toLocaleString())} م
          </div>
        </div>
      </div>
    </div>
  );
}
