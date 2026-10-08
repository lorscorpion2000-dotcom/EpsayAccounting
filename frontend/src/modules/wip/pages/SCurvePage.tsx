import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { wipApi } from '../services/wip.api';
import type { SCurveData } from '@/types/wip';
import { toPersianDigits } from '@/utils/format';

export default function SCurvePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SCurveData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await wipApi.sCurve(id));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!data) return null;

  const chartData = data.points.map((p) => ({
    month: p.month,
    physical: p.physicalCum,
    financial: p.financialCum,
  }));

  const lastPoint = data.points[data.points.length - 1];
  const diff = lastPoint ? lastPoint.financialCum - lastPoint.physicalCum : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/wip')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> گزارش WIP
        </button>
        <span>/</span>
        <span>نمودار S-Curve</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-600" />
            S-Curve — {data.project.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مقایسه پیشرفت فیزیکی و مالی در طول زمان
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">مبلغ قرارداد</div>
          <div className="text-lg font-bold num mt-1">
            {toPersianDigits(Math.round(data.contractAmount).toLocaleString())}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">پیشرفت فیزیکی</div>
          <div className="text-lg font-bold num mt-1 text-emerald-600">
            {lastPoint ? toPersianDigits(lastPoint.physicalCum.toFixed(1)) + '٪' : '—'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">پیشرفت مالی</div>
          <div className="text-lg font-bold num mt-1 text-blue-600">
            {lastPoint ? toPersianDigits(lastPoint.financialCum.toFixed(1)) + '٪' : '—'}
          </div>
        </div>
        <div className="card p-4 border-s-4 border-s-amber-400">
          <div className="text-xs text-slate-500">اختلاف مالی - فیزیکی</div>
          <div className={'text-lg font-bold num mt-1 ' + (Math.abs(diff) > 10 ? 'text-amber-600' : 'text-slate-700')}>
            {toPersianDigits(diff.toFixed(1))}٪
          </div>
        </div>
      </div>

      <div className="card p-6">
        {chartData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            هیچ داده‌ای برای نمایش وجود ندارد. ابتدا گزارش روزانه تاییدشده یا صورت‌وضعیت ثبت کنید.
          </div>
        ) : (
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v + '٪'}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'inherit',
                    fontSize: 12,
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                  formatter={(value: any, name: any) => [
                    toPersianDigits(Number(value).toFixed(1)) + '٪',
                    name === 'physical' ? 'فیزیکی' : 'مالی',
                  ]}
                />
                <Legend
                  formatter={(value: string) => value === 'physical' ? 'پیشرفت فیزیکی' : 'پیشرفت مالی'}
                  wrapperStyle={{ fontFamily: 'inherit', fontSize: 12 }}
                />
                <ReferenceLine y={100} stroke="#dcfce7" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="physical"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="financial"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Table */}
      {data.points.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="font-bold text-slate-800">داده‌های ماهانه</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-4 py-2 w-32">ماه</th>
                  <th className="text-center px-4 py-2">فیزیکی این ماه</th>
                  <th className="text-center px-4 py-2">فیزیکی تجمعی</th>
                  <th className="text-center px-4 py-2">مالی این ماه</th>
                  <th className="text-center px-4 py-2">مالی تجمعی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.points.map((p) => (
                  <tr key={p.month} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-center num text-xs" dir="ltr">{p.month}</td>
                    <td className="px-4 py-2 text-center num text-xs text-emerald-700">
                      {toPersianDigits(p.physicalPct.toFixed(1))}٪
                    </td>
                    <td className="px-4 py-2 text-center num text-xs font-bold text-emerald-700">
                      {toPersianDigits(p.physicalCum.toFixed(1))}٪
                    </td>
                    <td className="px-4 py-2 text-center num text-xs text-blue-700">
                      {toPersianDigits(p.financialPct.toFixed(1))}٪
                    </td>
                    <td className="px-4 py-2 text-center num text-xs font-bold text-blue-700">
                      {toPersianDigits(p.financialCum.toFixed(1))}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
