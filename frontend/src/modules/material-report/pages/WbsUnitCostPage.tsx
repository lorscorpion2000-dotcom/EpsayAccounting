import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, BarChart3, TrendingUp, TrendingDown, Download,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { materialReportApi } from '../services/material-report.api';
import { api } from '@/services/api';
import type { WbsUnitCostResult } from '@/types/material-report';
import { toPersianDigits } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

export default function WbsUnitCostPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<WbsUnitCostResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/projects').then((r) => {
      setProjects(r.data);
      if (r.data.length > 0 && !projectId) setProjectId(r.data[0].id);
    }).catch(() => []);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    load();
  }, [projectId]);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try { setData(await materialReportApi.unitCost(projectId)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'کد WBS': r.wbsCode,
      'عنوان': r.wbsTitle,
      'واحد': r.unit || '',
      'مقدار': r.quantity,
      'مبلغ قرارداد (واحد)': r.contractUnitPrice,
      'مبلغ قرارداد (کل)': r.contractTotalPrice,
      'هزینه مصالح': r.materialCost,
      'هزینه پیمانکار': r.subCost,
      'هزینه ماشین': r.equipmentCost,
      'سهم سربار': r.overheadShare,
      'جمع هزینه واقعی': r.totalCost,
      'بهای واحد واقعی': r.unitCost,
      'انحراف': r.deviation,
      'درصد انحراف': r.deviationPct.toFixed(2),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'UnitCost');
    XLSX.writeFile(wb, 'wbs-unit-cost-' + todayLocalISO() + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            بهای واحد WBS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مقایسه بهای قراردادی با بهای تمام‌شده واقعی هر ردیف WBS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input text-sm w-64">
            <option value="">— انتخاب پروژه —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn-secondary" onClick={handleExport} disabled={!data}>
            <Download className="w-4 h-4" /> خروجی
          </button>
          <button className="btn-secondary" onClick={load} disabled={!projectId}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500">جمع بهای قراردادی</div>
              <div className="text-lg font-bold num mt-1">
                {toPersianDigits(Math.round(data.totals.contractTotalPrice / 1000000).toLocaleString())} م
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">جمع هزینه واقعی</div>
              <div className="text-lg font-bold num mt-1 text-amber-600">
                {toPersianDigits(Math.round(data.totals.totalCost / 1000000).toLocaleString())} م
              </div>
            </div>
            <div className={clsx('card p-4 border-s-4', data.totals.profit >= 0 ? 'border-s-emerald-500' : 'border-s-red-500')}>
              <div className="text-xs text-slate-500">سود / زیان</div>
              <div className={clsx('text-lg font-bold num mt-1', data.totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {toPersianDigits(Math.round(data.totals.profit / 1000000).toLocaleString())} م
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">حاشیه سود</div>
              <div className={clsx('text-lg font-bold num mt-1', data.totals.profitPct >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {toPersianDigits(data.totals.profitPct.toFixed(1))}٪
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500">مصالح</div>
              <div className="text-sm font-bold num mt-1">{toPersianDigits(Math.round(data.totals.materialCost / 1000000).toLocaleString())} م</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">پیمانکار جزء</div>
              <div className="text-sm font-bold num mt-1">{toPersianDigits(Math.round(data.totals.subCost / 1000000).toLocaleString())} م</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">ماشین‌آلات</div>
              <div className="text-sm font-bold num mt-1">{toPersianDigits(Math.round(data.totals.equipmentCost / 1000000).toLocaleString())} م</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">سربار تسهیم‌شده</div>
              <div className="text-sm font-bold num mt-1">{toPersianDigits(Math.round(data.totals.overheadShare / 1000000).toLocaleString())} م</div>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1300px]">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="text-right px-2 py-3 font-medium text-slate-600 w-24">کد WBS</th>
                    <th className="text-right px-2 py-3 font-medium text-slate-600">عنوان</th>
                    <th className="text-center px-2 py-3 w-16 font-medium text-slate-600">واحد</th>
                    <th className="text-center px-2 py-3 w-20 font-medium text-slate-600">مقدار</th>
                    <th className="text-left px-2 py-3 w-28 font-medium text-slate-600">بهای قرارداد</th>
                    <th className="text-left px-2 py-3 w-28 font-medium text-slate-600">مصالح</th>
                    <th className="text-left px-2 py-3 w-28 font-medium text-slate-600">پیمانکار</th>
                    <th className="text-left px-2 py-3 w-28 font-medium text-slate-600">ماشین</th>
                    <th className="text-left px-2 py-3 w-24 font-medium text-slate-600">سربار</th>
                    <th className="text-left px-2 py-3 w-32 font-medium text-slate-600">هزینه واقعی</th>
                    <th className="text-left px-2 py-3 w-28 font-medium text-slate-600">بهای واحد واقعی</th>
                    <th className="text-center px-2 py-3 w-24 font-medium text-slate-600">انحراف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.wbsId} className="hover:bg-slate-50/50">
                      <td className="px-2 py-2"><span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">{r.wbsCode}</span></td>
                      <td className="px-2 py-2 text-xs text-slate-800">{r.wbsTitle}</td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500">{r.unit || '—'}</td>
                      <td className="px-2 py-2 text-center num text-xs">{toPersianDigits(r.quantity.toFixed(2))}</td>
                      <td className="px-2 py-2 text-left num text-xs">{toPersianDigits(Math.round(r.contractUnitPrice).toLocaleString())}</td>
                      <td className="px-2 py-2 text-left num text-xs">{r.materialCost > 0 ? toPersianDigits(Math.round(r.materialCost).toLocaleString()) : '—'}</td>
                      <td className="px-2 py-2 text-left num text-xs">{r.subCost > 0 ? toPersianDigits(Math.round(r.subCost).toLocaleString()) : '—'}</td>
                      <td className="px-2 py-2 text-left num text-xs">{r.equipmentCost > 0 ? toPersianDigits(Math.round(r.equipmentCost).toLocaleString()) : '—'}</td>
                      <td className="px-2 py-2 text-left num text-xs">{r.overheadShare > 0 ? toPersianDigits(Math.round(r.overheadShare).toLocaleString()) : '—'}</td>
                      <td className="px-2 py-2 text-left num text-xs font-bold text-amber-700">
                        {toPersianDigits(Math.round(r.totalCost).toLocaleString())}
                      </td>
                      <td className="px-2 py-2 text-left num text-xs font-bold">
                        {toPersianDigits(Math.round(r.unitCost).toLocaleString())}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md',
                          r.deviation >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                          {r.deviation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {toPersianDigits(Math.abs(r.deviationPct).toFixed(1))}٪
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
