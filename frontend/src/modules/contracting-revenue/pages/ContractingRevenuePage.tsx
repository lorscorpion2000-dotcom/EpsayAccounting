import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Percent, FileSpreadsheet,
  Printer, RefreshCw, BarChart3, Building2,
} from 'lucide-react';
import {
  contractingRevenueApi,
  type SummaryResponse,
  type ProjectRow,
  type ClientRow,
  type PeriodRow,
  type ProjectOption,
  type ClientOption,
} from '../services/contracting-revenue.api';

const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n));
const fmtPct = (n: number) => n.toFixed(1) + '٪';

export default function ContractingRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [byProject, setByProject] = useState<ProjectRow[]>([]);
  const [byClient, setByClient] = useState<ClientRow[]>([]);
  const [byPeriod, setByPeriod] = useState<PeriodRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    projectId: '',
    clientId: '',
    groupBy: 'month' as 'month' | 'quarter',
  });

  const [tab, setTab] = useState<'project' | 'client'>('project');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, c, per] = await Promise.all([
        contractingRevenueApi.summary(filters),
        contractingRevenueApi.byProject(filters),
        contractingRevenueApi.byClient(filters),
        contractingRevenueApi.byPeriod(filters),
      ]);
      setSummary(s);
      setByProject(p);
      setByClient(c);
      setByPeriod(per);
    } catch (e) {
      toast.error('خطا در بارگذاری گزارش درآمد پیمانکاری');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          contractingRevenueApi.projectsList(),
          contractingRevenueApi.clientsList(),
        ]);
        setProjects(p);
        setClients(c);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => { void load(); }, [filters]);

  const exportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      if (summary) {
        const ws1 = XLSX.utils.json_to_sheet([
          { 'شاخص': 'جمع درآمد', 'مقدار': summary.totalRevenue },
          { 'شاخص': 'خالص قابل وصول', 'مقدار': summary.totalNetPayable },
          { 'شاخص': 'هزینه کارفرما', 'مقدار': summary.totalPassThrough },
          { 'شاخص': 'هزینه‌های شرکت', 'مقدار': summary.totalCost },
          { 'شاخص': 'سود', 'مقدار': summary.profit },
          { 'شاخص': 'حاشیه سود ٪', 'مقدار': Number(summary.margin.toFixed(2)) },
          { 'شاخص': 'تعداد صورت‌وضعیت', 'مقدار': summary.statementCount },
          { 'شاخص': 'تعداد پروژه', 'مقدار': summary.projectCount },
        ]);
        XLSX.utils.book_append_sheet(wb, ws1, 'خلاصه');
      }
      if (byProject.length) {
        const ws2 = XLSX.utils.json_to_sheet(byProject.map(r => ({
          'کد پروژه': r.projectCode,
          'نام پروژه': r.projectName,
          'کارفرما': r.clientName || '',
          'درآمد': r.revenue,
          'خالص قابل وصول': r.netPayable,
          'هزینه': r.cost,
          'سود': r.profit,
          'حاشیه ٪': Number(r.margin.toFixed(2)),
        })));
        XLSX.utils.book_append_sheet(wb, ws2, 'پروژه‌ها');
      }
      if (byClient.length) {
        const ws3 = XLSX.utils.json_to_sheet(byClient.map(r => ({
          'کارفرما': r.clientName,
          'درآمد': r.revenue,
          'خالص قابل وصول': r.netPayable,
          'هزینه': r.cost,
          'سود': r.profit,
          'حاشیه ٪': Number(r.margin.toFixed(2)),
          'تعداد پروژه': r.projectCount,
        })));
        XLSX.utils.book_append_sheet(wb, ws3, 'کارفرماها');
      }
      if (byPeriod.length) {
        const ws4 = XLSX.utils.json_to_sheet(byPeriod.map(r => ({
          'دوره': r.period,
          'درآمد': r.revenue,
          'هزینه': r.cost,
          'سود': r.profit,
        })));
        XLSX.utils.book_append_sheet(wb, ws4, 'دوره‌ها');
      }
      XLSX.writeFile(wb, 'contracting-revenue.xlsx');
      toast.success('فایل Excel دانلود شد');
    } catch {
      toast.error('خطا در ساخت Excel');
    }
  };

  const chartData = useMemo(() => byPeriod, [byPeriod]);

  return (
    <div dir="rtl" className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> درآمد پیمانکاری
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 rounded border flex items-center gap-1 hover:bg-slate-50">
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} /> بروزرسانی
          </button>
          <button onClick={exportExcel} className="px-3 py-2 rounded border flex items-center gap-1 hover:bg-slate-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => handlePrint()} className="px-3 py-2 rounded border flex items-center gap-1 hover:bg-slate-50">
            <Printer className="w-4 h-4" /> چاپ / PDF
          </button>
        </div>
      </div>

      <div className="rounded border p-3 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs block mb-1">از تاریخ</label>
          <input type="date" value={filters.fromDate}
            onChange={(e) => setFilters(f => ({ ...f, fromDate: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs block mb-1">تا تاریخ</label>
          <input type="date" value={filters.toDate}
            onChange={(e) => setFilters(f => ({ ...f, toDate: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs block mb-1">پروژه</label>
          <select value={filters.projectId}
            onChange={(e) => setFilters(f => ({ ...f, projectId: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm">
            <option value="">همه</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">کارفرما</label>
          <select value={filters.clientId}
            onChange={(e) => setFilters(f => ({ ...f, clientId: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm">
            <option value="">همه</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">تفکیک دوره</label>
          <select value={filters.groupBy}
            onChange={(e) => setFilters(f => ({ ...f, groupBy: e.target.value as 'month' | 'quarter' }))}
            className="w-full border rounded px-2 py-1 text-sm">
            <option value="month">ماهانه</option>
            <option value="quarter">فصلی</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="جمع درآمد"
            value={fmt(summary.totalRevenue)} color="green" />
          <KpiCard icon={<TrendingDown className="w-5 h-5" />} label="هزینه‌های شرکت"
            value={fmt(summary.totalCost)} color="red" />
          <KpiCard icon={<Wallet className="w-5 h-5" />} label="سود"
            value={fmt(summary.profit)} color="blue" />
          <KpiCard icon={<Percent className="w-5 h-5" />} label="حاشیه سود"
            value={fmtPct(summary.margin)} color="purple" />
        </div>
      )}

      <div className="rounded border p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">روند درآمد و هزینه</h2>
          <div className="flex gap-1">
            <button onClick={() => setChartType('bar')}
              className={'px-2 py-1 text-xs rounded border ' + (chartType === 'bar' ? 'bg-blue-100 border-blue-400' : '')}>میله‌ای</button>
            <button onClick={() => setChartType('line')}
              className={'px-2 py-1 text-xs rounded border ' + (chartType === 'line' ? 'bg-blue-100 border-blue-400' : '')}>خطی</button>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                <Bar dataKey="revenue" name="درآمد" fill="#22c55e" />
                <Bar dataKey="cost" name="هزینه" fill="#ef4444" />
                <Bar dataKey="profit" name="سود" fill="#3b82f6" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="درآمد" stroke="#22c55e" />
                <Line type="monotone" dataKey="cost" name="هزینه" stroke="#ef4444" />
                <Line type="monotone" dataKey="profit" name="سود" stroke="#3b82f6" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <TabButton active={tab === 'project'} onClick={() => setTab('project')}>
          <Building2 className="w-4 h-4" /> به تفکیک پروژه
        </TabButton>
        <TabButton active={tab === 'client'} onClick={() => setTab('client')}>
          <TrendingUp className="w-4 h-4" /> به تفکیک کارفرما
        </TabButton>
      </div>

      <div ref={printRef} className="rounded border overflow-x-auto">
        <div className="hidden print:block p-2">
          <h2 className="text-center font-bold text-lg">گزارش درآمد پیمانکاری</h2>
          <p className="text-center text-sm mb-2">
            از {filters.fromDate || '—'} تا {filters.toDate || '—'}
          </p>
        </div>
        {tab === 'project' ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-right">کد</th>
                <th className="p-2 text-right">پروژه</th>
                <th className="p-2 text-right">کارفرما</th>
                <th className="p-2 text-left">درآمد</th>
                <th className="p-2 text-left">خالص قابل وصول</th>
                <th className="p-2 text-left">هزینه</th>
                <th className="p-2 text-left">سود</th>
                <th className="p-2 text-left">حاشیه</th>
              </tr>
            </thead>
            <tbody>
              {byProject.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-slate-400">داده‌ای موجود نیست</td></tr>
              )}
              {byProject.map(r => (
                <tr key={r.projectId} className="border-t">
                  <td className="p-2">{r.projectCode}</td>
                  <td className="p-2">{r.projectName}</td>
                  <td className="p-2">{r.clientName || '—'}</td>
                  <td className="p-2 text-left">{fmt(r.revenue)}</td>
                  <td className="p-2 text-left">{fmt(r.netPayable)}</td>
                  <td className="p-2 text-left">{fmt(r.cost)}</td>
                  <td className={'p-2 text-left font-semibold ' + (r.profit >= 0 ? 'text-green-700' : 'text-red-700')}>{fmt(r.profit)}</td>
                  <td className="p-2 text-left">{fmtPct(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-right">کارفرما</th>
                <th className="p-2 text-center">تعداد پروژه</th>
                <th className="p-2 text-left">درآمد</th>
                <th className="p-2 text-left">خالص قابل وصول</th>
                <th className="p-2 text-left">هزینه</th>
                <th className="p-2 text-left">سود</th>
                <th className="p-2 text-left">حاشیه</th>
              </tr>
            </thead>
            <tbody>
              {byClient.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-400">داده‌ای موجود نیست</td></tr>
              )}
              {byClient.map(r => (
                <tr key={r.clientId || '__none__'} className="border-t">
                  <td className="p-2">{r.clientName}</td>
                  <td className="p-2 text-center">{r.projectCount}</td>
                  <td className="p-2 text-left">{fmt(r.revenue)}</td>
                  <td className="p-2 text-left">{fmt(r.netPayable)}</td>
                  <td className="p-2 text-left">{fmt(r.cost)}</td>
                  <td className={'p-2 text-left font-semibold ' + (r.profit >= 0 ? 'text-green-700' : 'text-red-700')}>{fmt(r.profit)}</td>
                  <td className="p-2 text-left">{fmtPct(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={'rounded border p-3 ' + (colors[color] || '')}>
      <div className="flex items-center gap-2 text-sm opacity-80">{icon}<span>{label}</span></div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={'px-3 py-2 text-sm flex items-center gap-1 border-b-2 ' + (active ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-slate-500')}>
      {children}
    </button>
  );
}
