import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, TrendingUp, BarChart3, AlertTriangle,
  Briefcase, CircleDollarSign, Wallet, Activity,
} from 'lucide-react';
import clsx from 'clsx';
import { wipApi } from '../services/wip.api';
import type { WipOverview } from '@/types/wip';
import { toPersianDigits } from '@/utils/format';

export default function WipReportPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<WipOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await wipApi.overview());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!data) return null;

  const t = data.totals;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            کار در جریان ساخت (WIP)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مقایسه درآمد شناسایی‌شده با صورت‌وضعیت‌های صادرشده (استاندارد ۹)
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wallet className="w-4 h-4" /> هزینه واقعی
          </div>
          <div className="text-xl font-bold num mt-2">{toPersianDigits(Math.round(t.realCost).toLocaleString())}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp className="w-4 h-4" /> درآمد شناسایی‌شده
          </div>
          <div className="text-xl font-bold num mt-2 text-emerald-600">{toPersianDigits(Math.round(t.recognizedRevenue).toLocaleString())}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CircleDollarSign className="w-4 h-4" /> صورت‌وضعیت‌ها
          </div>
          <div className="text-xl font-bold num mt-2">{toPersianDigits(Math.round(t.billedAmount).toLocaleString())}</div>
        </div>
        <div className={clsx('card p-4', t.wip !== 0 && 'border-s-4 border-s-amber-400')}>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="w-4 h-4" /> WIP
          </div>
          <div className={clsx('text-xl font-bold num mt-2', t.wip >= 0 ? 'text-amber-600' : 'text-red-600')}>
            {toPersianDigits(Math.round(t.wip).toLocaleString())}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" />
            تفکیک به پروژه
          </h2>
        </div>
        {data.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            هیچ پروژه فعالی وجود ندارد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-24">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">پیشرفت فیزیکی</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">پیشرفت مالی</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">هزینه واقعی</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">درآمد شناسایی</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">صورت‌وضعیت</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">WIP</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">سود</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => {
                  const diff = r.financialPct - r.progressPct;
                  const warn = Math.abs(diff) > 10;
                  return (
                    <tr key={r.project.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">{r.project.code}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-800">
                        <div className="flex items-center gap-2">
                          {warn && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <span>{r.project.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 num text-xs font-bold">
                          {toPersianDigits(r.progressPct.toFixed(1))}٪
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={clsx('inline-block px-2 py-0.5 rounded-md num text-xs font-bold',
                          warn ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                          {toPersianDigits(r.financialPct.toFixed(1))}٪
                        </span>
                      </td>
                      <td className="px-3 py-3 text-left num text-xs">
                        {toPersianDigits(Math.round(r.realCost).toLocaleString())}
                      </td>
                      <td className="px-3 py-3 text-left num text-xs text-emerald-700">
                        {toPersianDigits(Math.round(r.recognizedRevenue).toLocaleString())}
                      </td>
                      <td className="px-3 py-3 text-left num text-xs">
                        {toPersianDigits(Math.round(r.billedAmount).toLocaleString())}
                      </td>
                      <td className={clsx('px-3 py-3 text-left num text-xs font-bold',
                        r.wip >= 0 ? 'text-amber-700' : 'text-red-700')}>
                        {toPersianDigits(Math.round(r.wip).toLocaleString())}
                      </td>
                      <td className={clsx('px-3 py-3 text-left num text-xs font-bold',
                        r.profit >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                        {toPersianDigits(Math.round(r.profit).toLocaleString())}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => navigate(`/wip/s-curve/${r.project.id}`)}
                          className="text-xs text-brand-600 hover:underline">
                          S-Curve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
