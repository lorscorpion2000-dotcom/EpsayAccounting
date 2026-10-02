import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { formatNumber, toPersianDigits } from '@/utils/format';
import type {
  CashFlowData, ProjectProgress, ProfitLossData,
} from '../services/dashboard.api';

// ═══════════════════════════════════════════════════════════
// Cash Flow Pie Chart
// ═══════════════════════════════════════════════════════════
export function CashFlowChart({ cashFlow }: { cashFlow: CashFlowData | null }) {
  const cashFlowData = cashFlow
    ? [
        { name: 'بانک', value: cashFlow.bank, color: '#6C63FF' },
        { name: 'صندوق', value: cashFlow.cash, color: '#2EC4B6' },
        { name: 'تنخواه', value: cashFlow.pettyCash, color: '#EB5B38' },
      ]
    : [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-brand-600" />
          ترکیب نقدینگی
        </h2>
        <span className="text-xs text-slate-500">
          جمع: <span className="num font-bold text-slate-800">{formatNumber(cashFlow?.total || 0)}</span>
        </span>
      </div>
      {cashFlowData.every((c) => c.value === 0) ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          اطلاعاتی برای نمایش وجود ندارد
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cashFlowData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                label={(entry: any) => toPersianDigits(entry.name)}
              >
                {cashFlowData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatNumber(Number(v)) + ' ریال'} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
        {cashFlowData.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></span>
              <span className="text-slate-600">{c.name}</span>
            </div>
            <div className="font-bold text-slate-800 num">{formatNumber(c.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Profit & Loss Bar Chart
// ═══════════════════════════════════════════════════════════
export function ProfitLossChart({ profitLoss }: { profitLoss: ProfitLossData | null }) {
  const profitLossData = profitLoss
    ? [
        { name: 'درآمدها', value: profitLoss.revenues },
        { name: 'هزینه‌ها', value: profitLoss.expenses },
      ]
    : [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          سود و زیان
        </h2>
        <span
          className={clsx(
            'text-xs px-2 py-0.5 rounded-md font-bold',
            (profitLoss?.profit || 0) >= 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700',
          )}
        >
          {(profitLoss?.profit || 0) >= 0 ? 'سود' : 'زیان'}
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={profitLossData}
            layout="vertical"
            margin={{ right: 30, left: 5, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={130}
              tick={{
                fontSize: 14,
                fill: '#334155',
                fontWeight: 600,
                textAnchor: 'end',
              }}
            />
            <Tooltip formatter={(v: any) => formatNumber(Number(v)) + ' ریال'} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={32}>
              <Cell fill="#2EC4B6" />
              <Cell fill="#EB5B38" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">سود / زیان خالص</span>
        <span
          className={clsx(
            'text-lg font-bold num',
            (profitLoss?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700',
          )}
          dir="ltr"
        >
          {formatNumber(Math.abs(profitLoss?.profit || 0))}{' '}
          <span className="text-xs font-normal">ریال</span>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Projects Progress Bar Chart
// ═══════════════════════════════════════════════════════════
export function ProjectsProgressChart({ projects }: { projects: ProjectProgress[] }) {
  const navigate = useNavigate();
  const projectsChart = projects.slice(0, 6).map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name,
    'پیشرفت فیزیکی': p.physicalProgress,
    'پیشرفت مالی': p.financialProgress,
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          مقایسه پیشرفت پروژه‌ها
        </h2>
        <button
          onClick={() => navigate('/projects')}
          className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          مشاهده همه
          <ArrowRight className="w-3 h-3 rotate-180" />
        </button>
      </div>
      {projectsChart.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          هیچ پروژه‌ای برای نمایش وجود ندارد
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectsChart} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => toPersianDigits(v) + '٪'}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(v: any) => toPersianDigits(v) + '٪'}
                contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl' }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Vazirmatn', fontSize: '12px' }}
                iconType="circle"
              />
              <Bar dataKey="پیشرفت فیزیکی" fill="#6C63FF" radius={[8, 8, 0, 0]} maxBarSize={40} />
              <Bar dataKey="پیشرفت مالی" fill="#2EC4B6" radius={[8, 8, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}