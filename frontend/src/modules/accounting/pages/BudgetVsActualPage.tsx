import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Target, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2,
  BarChart3, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import {
  budgetVsActualApi,
  type BudgetVsActualReport,
  type ProjectRef,
} from '../services/budget-vs-actual.api';

const fmt = (n: number | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

const LEVEL_LABEL: Record<string, string> = {
  PHASE: 'فاز',
  WORK_PACKAGE: 'بسته کار',
  ACTIVITY: 'فعالیت',
  SUB_ACTIVITY: 'زیرفعالیت',
  PROJECT_LEVEL: 'سطح پروژه',
};

export default function BudgetVsActualPage() {
  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1);

  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [projectId, setProjectId] = useState('');
  const [from, setFrom] = useState(fromISO(firstOfYear.toISOString()));
  const [to, setTo] = useState(fromISO(today.toISOString()));
  const [data, setData] = useState<BudgetVsActualReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'budget' | 'actual'>('budget');

  useEffect(() => {
    budgetVsActualApi.projects().then((list) => {
      setProjects(list);
      if (list.length && !projectId) setProjectId(list[0].id);
    }).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await budgetVsActualApi.get(projectId, toISO(from), toISO(to));
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) load();   }, [projectId]);

  const health = useMemo(() => {
    if (!data) return 'unknown';
    const p = data.summary.percentUsed;
    if (p > 100) return 'over';
    if (p > 85)  return 'warn';
    return 'ok';
  }, [data]);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">بودجه در مقابل واقعی</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مصرف بودجه پروژه به تفکیک حساب و خطوط بودجه
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading || !projectId}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">پروژه</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">از تاریخ</label>
            <PersianDatePicker value={from} onChange={setFrom} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">تا تاریخ</label>
            <PersianDatePicker value={to} onChange={setTo} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={load} disabled={loading || !projectId}
            className="px-5 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium disabled:opacity-50">
            {loading ? 'در حال محاسبه...' : 'محاسبه‌ی گزارش'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPI label="بودجه مصوب" value={fmt(data.summary.totalBudget)} tone="slate" />
            <KPI label="مصرف واقعی" value={fmt(data.summary.totalActual)} tone="fuchsia" />
            <KPI label="واریانس" value={fmt(data.summary.variance)}
                 tone={data.summary.variance >= 0 ? 'emerald' : 'rose'}
                 icon={data.summary.variance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} />
            <KPI label="درصد مصرف" value={data.summary.percentUsed.toFixed(1) + '%'}
                 tone={health === 'over' ? 'rose' : health === 'warn' ? 'amber' : 'emerald'}
                 icon={health === 'over' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} />
          </div>

          <div className="mb-4">
            <ProgressBar percent={data.summary.percentUsed} health={health} />
          </div>

          {data.totalsByLevel.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {data.totalsByLevel.map((t) => (
                <div key={t.level} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Layers size={14} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{LEVEL_LABEL[t.level] ?? t.level}</div>
                    <div className="text-sm font-bold font-mono text-slate-800">{fmt(t.budget)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
            <TabBtn active={tab === 'budget'} onClick={() => setTab('budget')} icon={<BarChart3 size={14} />}>
              خطوط بودجه ({data.budgetLines.length})
            </TabBtn>
            <TabBtn active={tab === 'actual'} onClick={() => setTab('actual')} icon={<Target size={14} />}>
              مصرف به تفکیک حساب ({data.actualByAccount.length})
            </TabBtn>
          </div>

          {tab === 'budget' && <BudgetTable rows={data.budgetLines} />}
          {tab === 'actual' && <ActualTable rows={data.actualByAccount} totalBudget={data.summary.totalBudget} />}
        </>
      )}

      {!projectId && !loading && (
        <div className="text-center py-16 text-slate-400">برای دیدن گزارش، یک پروژه انتخاب کنید</div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: {
  active: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {icon}{children}
    </button>
  );
}

function ProgressBar({ percent, health }: { percent: number; health: string }) {
  const colors = {
    ok:   'bg-emerald-500',
    warn: 'bg-amber-500',
    over: 'bg-rose-500',
    unknown: 'bg-slate-400',
  }[health] ?? 'bg-slate-400';
  const clamped = Math.min(percent, 100);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2 text-xs text-slate-600">
        <span>میزان مصرف از بودجه</span>
        <span className="font-mono font-bold">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
      {percent > 100 && (
        <div className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
          <AlertTriangle size={12} /> از بودجه فراتر رفته — نیاز به بررسی
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, tone, icon }: {
  label: string; value: string; tone: 'slate'|'fuchsia'|'emerald'|'rose'|'amber'; icon?: React.ReactNode;
}) {
  const c = {
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose:    'bg-rose-50 text-rose-700 border-rose-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${c}`}>
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">{icon}{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

function BudgetTable({ rows }: { rows: any[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-right px-3 py-3 font-medium w-32">کد WBS</th>
            <th className="text-right px-3 py-3 font-medium">عنوان</th>
            <th className="text-center px-3 py-3 font-medium w-28">سطح</th>
            <th className="text-left px-3 py-3 font-medium w-32">مبلغ بودجه</th>
            <th className="text-center px-3 py-3 font-medium w-28">تاریخ تصویب</th>
            <th className="text-center px-3 py-3 font-medium w-20">قفل</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={6} className="text-center py-10 text-slate-400">هیچ بودجه‌ای برای این پروژه ثبت نشده</td></tr>
          )}
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/60">
              <td className="px-3 py-2 font-mono text-xs text-slate-600">{b.wbsCode ?? '—'}</td>
              <td className="px-3 py-2 text-slate-800">
                {b.wbsTitle ?? b.description ?? 'بودجه در سطح پروژه'}
              </td>
              <td className="px-3 py-2 text-center text-xs text-slate-500">
                {b.wbsLevel ? LEVEL_LABEL[b.wbsLevel] ?? b.wbsLevel : '—'}
              </td>
              <td className="px-3 py-2 text-left font-mono text-xs font-bold text-slate-800">{fmt(b.amount)}</td>
              <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(b.approvedAt)}</td>
              <td className="px-3 py-2 text-center text-xs">
                {b.isLocked ? <span className="text-rose-600">🔒</span> : <span className="text-slate-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActualTable({ rows, totalBudget }: { rows: any[]; totalBudget: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-right px-3 py-3 font-medium w-32">کد حساب</th>
            <th className="text-right px-3 py-3 font-medium">نام حساب</th>
            <th className="text-center px-3 py-3 font-medium w-24">تعداد</th>
            <th className="text-left px-3 py-3 font-medium w-36">مبلغ واقعی</th>
            <th className="text-left px-3 py-3 font-medium w-24">سهم از بودجه</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="text-center py-10 text-slate-400">مصرفی در این بازه ثبت نشده</td></tr>
          )}
          {rows.map((r) => {
            const share = totalBudget ? (r.actual / totalBudget) * 100 : 0;
            return (
              <tr key={r.accountId} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.accountCode}</td>
                <td className="px-3 py-2 text-slate-800">{r.accountName}</td>
                <td className="px-3 py-2 text-center text-xs text-slate-500">{r.count}</td>
                <td className="px-3 py-2 text-left font-mono text-xs font-bold text-fuchsia-700">{fmt(r.actual)}</td>
                <td className="px-3 py-2 text-left font-mono text-xs text-slate-600">{share.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}