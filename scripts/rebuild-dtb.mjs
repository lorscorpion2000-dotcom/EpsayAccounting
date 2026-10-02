import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const Z = '\u200C';

const dtb = `import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, BarChart3, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { accountingApi } from '../services/accounting.api';
import { formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

export default function DetailedTrialBalancePage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    accountingApi.fiscalYears.list().then((list) => {
      setFiscalYears(list);
      const cur = list.find((f: any) => f.isCurrent);
      if (cur) {
        setFiscalYearId(cur.id);
        load(cur.id);
      }
    }).catch(() => []);
  }, []);

  const load = async (fyId?: string) => {
    const id = fyId || fiscalYearId;
    if (!id) { toast.error('سال مالی را انتخاب کنید'); return; }
    setLoading(true);
    try {
      setData(await accountingApi.reports.detailedTrialBalance({
        fiscalYearId: id,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('داده${Z}ای نیست'); return; }
    const rows = data.rows.map((r: any, i: number) => ({
      'ردیف': i + 1,
      'کد': r.accountCode,
      'نام': r.accountName,
      'مانده ابتدا - بدهکار': r.openingDebit,
      'مانده ابتدا - بستانکار': r.openingCredit,
      'گردش - بدهکار': r.periodDebit,
      'گردش - بستانکار': r.periodCredit,
      'مانده انتها - بدهکار': r.closingDebit,
      'مانده انتها - بستانکار': r.closingCredit,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'TB');
    XLSX.writeFile(wb, 'DetailedTB.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            تراز آزمایشی تفصیلی
          </h1>
          <p className="text-sm text-slate-500 mt-1">با مانده ابتدا گردش دوره و مانده انتها</p>
        </div>
        <div className="flex gap-2">
          <PrintButton contentRef={printRef} documentTitle="تراز آزمایشی تفصیلی" />
          <button className="btn-secondary" onClick={() => load()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
        <div>
          <label className="block text-xs text-slate-500 mb-1">سال مالی</label>
          <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="input w-full">
            <option value="">— انتخاب —</option>
            {fiscalYears.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">از تاریخ</label>
          <PersianDatePicker value={fromDate} onChange={(v: string | null) => setFromDate(v || '')} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">تا تاریخ</label>
          <PersianDatePicker value={toDate} onChange={(v: string | null) => setToDate(v || '')} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} نمایش
          </button>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="card overflow-hidden">
          <div className="p-6 border-b">
            <PrintHeader title="تراز آزمایشی تفصیلی" subtitle={fiscalYears.find((f: any) => f.id === fiscalYearId)?.name || ''} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th rowSpan={2} className="border-l px-2 py-2 text-right font-medium text-slate-600 w-20">کد</th>
                  <th rowSpan={2} className="border-l px-2 py-2 text-right font-medium text-slate-600">نام حساب</th>
                  <th colSpan={2} className="border-l px-2 py-2 text-center font-medium text-slate-600 bg-blue-50">مانده ابتدای دوره</th>
                  <th colSpan={2} className="border-l px-2 py-2 text-center font-medium text-slate-600 bg-emerald-50">گردش دوره</th>
                  <th colSpan={2} className="px-2 py-2 text-center font-medium text-slate-600 bg-amber-50">مانده انتهای دوره</th>
                </tr>
                <tr>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-blue-50 w-32">بدهکار</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-blue-50 w-32">بستانکار</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-emerald-50 w-32">بدهکار</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-emerald-50 w-32">بستانکار</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-amber-50 w-32">بدهکار</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500 bg-amber-50 w-32">بستانکار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r: any) => (
                  <tr key={r.accountId} className="hover:bg-slate-50/50">
                    <td className="border-l px-2 py-1 num" dir="ltr">{r.accountCode}</td>
                    <td className="border-l px-2 py-1">{r.accountName}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.openingDebit ? formatNumber(r.openingDebit) : '—'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.openingCredit ? formatNumber(r.openingCredit) : '—'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.periodDebit ? formatNumber(r.periodDebit) : '—'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.periodCredit ? formatNumber(r.periodCredit) : '—'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.closingDebit ? formatNumber(r.closingDebit) : '—'}</td>
                    <td className="px-2 py-1 text-left num" dir="ltr">{r.closingCredit ? formatNumber(r.closingCredit) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="border-l px-2 py-2 text-right">جمع کل</td>
                  <td className="border-l px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.openingDebit)}</td>
                  <td className="border-l px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.openingCredit)}</td>
                  <td className="border-l px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.periodDebit)}</td>
                  <td className="border-l px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.periodCredit)}</td>
                  <td className="border-l px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.closingDebit)}</td>
                  <td className="px-2 py-2 text-left num" dir="ltr">{formatNumber(data.totals.closingCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/DetailedTrialBalancePage.tsx', dtb, 'utf8');
console.log('OK DetailedTrialBalancePage.tsx');