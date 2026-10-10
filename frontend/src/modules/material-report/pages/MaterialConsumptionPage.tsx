import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Package, Search, BarChart3, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { materialReportApi } from '../services/material-report.api';
import { api } from '@/services/api';
import type { ConsumptionResult } from '@/types/material-report';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import { PR_UNIT_LABELS, PRItemUnit } from '@/types/procurement';
import { todayLocalISO } from '@/utils/local-date';

export default function MaterialConsumptionPage() {
  const [data, setData] = useState<ConsumptionResult | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [view, setView] = useState<'items' | 'projects' | 'rows'>('items');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [result, prj] = await Promise.all([
        materialReportApi.consumption({
          projectId: projectFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setData(result);
      setProjects(prj);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectFilter, fromDate, toDate]);

  const handleExport = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.rows.map((r) => ({
      'تاریخ': formatJalaliDate(r.date),
      'کد کالا': r.itemCode,
      'نام کالا': r.itemName,
      'دسته': r.category,
      'واحد': r.unit,
      'مقدار': r.quantity,
      'بهای واحد': r.unitCost,
      'بهای کل': r.totalCost,
      'انبار': r.warehouseName,
      'پروژه': r.projectName,
      'کد WBS': r.wbsCode,
      'عنوان WBS': r.wbsTitle,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consumption');
    XLSX.writeFile(wb, 'material-consumption-' + todayLocalISO() + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  const filteredItems = data?.byItem.filter((it) => !search ||
    it.itemName.includes(search) || it.itemCode.includes(search)) || [];

  const filteredRows = data?.rows.filter((r) => !search ||
    r.itemName.includes(search) || r.itemCode.includes(search) ||
    r.wbsTitle.includes(search)) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            گزارش مصرف مصالح
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تحلیل مصرف به تفکیک کالا، پروژه، WBS و بازه زمانی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleExport} disabled={!data}>
            <Download className="w-4 h-4" /> خروجی اکسل
          </button>
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" /> بروزرسانی
          </button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500">تعداد رکورد</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(data.summary.totalRows)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">جمع هزینه</div>
            <div className="text-xl font-bold num mt-1 text-brand-700">
              {toPersianDigits(Math.round(data.summary.totalCost).toLocaleString())}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">تعداد کالاهای متمایز</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(data.summary.uniqueItems)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <PersianDatePicker value={fromDate} onChange={setFromDate} />
          <PersianDatePicker value={toDate} onChange={setToDate} />
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
        </div>
      </div>

      {/* View selector */}
      <div className="flex items-center gap-2">
        <button onClick={() => setView('items')}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (view === 'items' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
          تفکیک به کالا
        </button>
        <button onClick={() => setView('projects')}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (view === 'projects' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
          تفکیک به پروژه
        </button>
        <button onClick={() => setView('rows')}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
            (view === 'rows' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
          ریز مصرف
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">هیچ مصرفی در این بازه یافت نشد</div>
        ) : view === 'items' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 w-10">#</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">کالا</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">دسته</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">واحد</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">مقدار کل</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">رکورد</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-40">جمع هزینه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it, i) => (
                  <tr key={it.itemId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-center text-slate-400 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-3"><span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{it.itemCode}</span></td>
                    <td className="px-3 py-3 text-slate-800">{it.itemName}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{it.category || '—'}</td>
                    <td className="px-3 py-3 text-center text-xs">{PR_UNIT_LABELS[it.unit as PRItemUnit] || it.unit}</td>
                    <td className="px-3 py-3 text-center num font-bold">{toPersianDigits(it.totalQuantity.toFixed(2))}</td>
                    <td className="px-3 py-3 text-center num text-xs text-slate-500">{toPersianDigits(it.count)}</td>
                    <td className="px-3 py-3 text-left num text-xs font-bold text-brand-700">
                      {toPersianDigits(Math.round(it.totalCost).toLocaleString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === 'projects' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 w-10">#</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">کد پروژه</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">تعداد رکورد</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-40">جمع هزینه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.byProject.map((p, i) => (
                  <tr key={p.projectId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-center text-slate-400 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-3"><span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{p.projectCode}</span></td>
                    <td className="px-3 py-3 text-slate-800">{p.projectName}</td>
                    <td className="px-3 py-3 text-center num text-xs">{toPersianDigits(p.count)}</td>
                    <td className="px-3 py-3 text-left num text-xs font-bold text-brand-700">
                      {toPersianDigits(Math.round(p.totalCost).toLocaleString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead className="bg-slate-50 border-b sticky top-0">
                <tr>
                  <th className="text-center px-2 py-2 w-10">#</th>
                  <th className="text-center px-2 py-2 w-24 font-medium text-slate-600">تاریخ</th>
                  <th className="text-right px-2 py-2 w-24 font-medium text-slate-600">کد کالا</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">کالا</th>
                  <th className="text-center px-2 py-2 w-20 font-medium text-slate-600">مقدار</th>
                  <th className="text-left px-2 py-2 w-28 font-medium text-slate-600">بهای واحد</th>
                  <th className="text-left px-2 py-2 w-28 font-medium text-slate-600">بهای کل</th>
                  <th className="text-right px-2 py-2 w-40 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-2 py-2 w-40 font-medium text-slate-600">WBS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.slice(0, 300).map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-2 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-2 py-2 text-center num text-xs">{formatJalaliDate(r.date)}</td>
                    <td className="px-2 py-2"><span className="num text-xs font-mono" dir="ltr">{r.itemCode}</span></td>
                    <td className="px-2 py-2 text-xs text-slate-800">{r.itemName}</td>
                    <td className="px-2 py-2 text-center num text-xs">{toPersianDigits(r.quantity.toFixed(2))}</td>
                    <td className="px-2 py-2 text-left num text-xs">{toPersianDigits(Math.round(r.unitCost).toLocaleString())}</td>
                    <td className="px-2 py-2 text-left num text-xs font-bold">{toPersianDigits(Math.round(r.totalCost).toLocaleString())}</td>
                    <td className="px-2 py-2 text-xs text-slate-600">{r.projectName || '—'}</td>
                    <td className="px-2 py-2 text-xs text-slate-600">{r.wbsTitle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length > 300 && (
              <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-500">
                ... و {toPersianDigits(filteredRows.length - 300)} ردیف دیگر (خروجی اکسل بگیرید)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
