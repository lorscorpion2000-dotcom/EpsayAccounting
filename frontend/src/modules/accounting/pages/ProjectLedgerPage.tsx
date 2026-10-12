import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Building2, Search, FileSpreadsheet } from 'lucide-react';

import { projectsApi } from '@/modules/projects/services/projects.api';
import { accountingApi } from '../services/accounting.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

import { exportToExcel } from '@/utils/export-excel';
export default function ProjectLedgerPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectsApi.list().then(setProjects as any).catch(() => []);
  }, []);

  const load = async () => {
    if (!projectId) { toast.error('ابتدا پروژه را انتخاب کنید'); return; }
    setLoading(true);
    try { setData(await accountingApi.reports.projectLedger({ projectId })); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('دادهای نیست'); return; }
    const rows = data.rows.map((r: any, i: number) => ({
      'ردیف': i + 1,
      'تاریخ': new Date(r.entryDate).toLocaleDateString('fa-IR'),
      'کد سند': r.entryCode,
      'حساب': r.accountCode + ' - ' + r.accountName,
      'شرح': r.description || '',
      'بدهکار': r.debit,
      'بستانکار': r.credit,
      'مانده': r.balance,
    }));
    void exportToExcel({
      filename: 'ProjectLedger-' + (data.project?.name || '') + '.xlsx',
      sheets: [{
        name: 'ProjectLedger',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-600" />
          ریز حساب پروژه
        </h1>
        <p className="text-sm text-slate-500 mt-1">تمام مالی پروژه در یک نگاه</p>
      </div>

      <div className="card p-4 no-print grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">پروژه</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} {p.code ? '(' + p.code + ')' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" onClick={load} disabled={!projectId || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            نمایش
          </button>
          <PrintButton contentRef={printRef} documentTitle="گزارش" />
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}>
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="space-y-6">
          <PrintHeader title="گزارش" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بدهکار</div>
              <div className="text-xl font-bold num text-orange-700" dir="ltr">{formatNumber(data.totals.debit)}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بستانکار</div>
              <div className="text-xl font-bold num text-cyan-700" dir="ltr">{formatNumber(data.totals.credit)}</div>
            </div>
            <div className="card p-4 no-print bg-indigo-50 border-indigo-200">
              <div className="text-xs text-indigo-700 mb-1">مانده نهایی</div>
              <div className="text-xl font-bold num text-indigo-700" dir="ltr">{formatNumber(Math.abs(data.totals.balance))}</div>
            </div>
          </div>

          <div className="card overflow-hidden">
            {data.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-500">تراکنشی یافت نشد</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-24">تاریخ</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-28">کد سند</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-40">حساب</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">شرح</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">بدهکار</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">بستانکار</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">مانده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 num text-xs">{formatJalaliDate(r.entryDate)}</td>
                        <td className="px-3 py-2"><span className="num text-xs" dir="ltr">{r.entryCode}</span></td>
                        <td className="px-3 py-2 text-xs"><span className="num" dir="ltr">{r.accountCode}</span> {r.accountName}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{r.description}</td>
                        <td className="px-3 py-2 text-left num text-xs text-orange-700" dir="ltr">{r.debit ? formatNumber(r.debit) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs text-cyan-700" dir="ltr">{r.credit ? formatNumber(r.credit) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs font-bold" dir="ltr">{formatNumber(Math.abs(r.balance))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
