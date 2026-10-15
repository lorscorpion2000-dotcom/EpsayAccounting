import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, BarChart3, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';

import { accountingApi } from '../services/accounting.api';
import { formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

import { exportToExcel } from '@/utils/export-excel';
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
    if (!id) { toast.error('Ø³Ø§Ù„ Ù…Ø§Ù„ÛŒ Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯'); return; }
    setLoading(true);
    try {
      setData(await accountingApi.reports.detailedTrialBalance({
        fiscalYearId: id,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }));
    } catch { toast.error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒ Ù†ÛŒØ³Øª'); return; }
    const rows = data.rows.map((r: any, i: number) => ({
      'Ø±Ø¯ÛŒÙ': i + 1,
      'Ú©Ø¯': r.accountCode,
      'Ù†Ø§Ù…': r.accountName,
      'Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¨ØªØ¯Ø§ - Ø¨Ø¯Ù‡Ú©Ø§Ø±': r.openingDebit,
      'Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¨ØªØ¯Ø§ - Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±': r.openingCredit,
      'Ú¯Ø±Ø¯Ø´ - Ø¨Ø¯Ù‡Ú©Ø§Ø±': r.periodDebit,
      'Ú¯Ø±Ø¯Ø´ - Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±': r.periodCredit,
      'Ù…Ø§Ù†Ø¯Ù‡ Ø§Ù†ØªÙ‡Ø§ - Ø¨Ø¯Ù‡Ú©Ø§Ø±': r.closingDebit,
      'Ù…Ø§Ù†Ø¯Ù‡ Ø§Ù†ØªÙ‡Ø§ - Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±': r.closingCredit,
    }));
    void exportToExcel({
      filename: 'DetailedTB.xlsx',
      sheets: [{
        name: 'TB',
        rows,
      }],
    });
    toast.success('Excel Ø¯Ø§Ù†Ù„ÙˆØ¯ Ø´Ø¯');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            ØªØ±Ø§Ø² Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ ØªÙØµÛŒÙ„ÛŒ
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ø¨Ø§ Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¨ØªØ¯Ø§ Ú¯Ø±Ø¯Ø´ Ø¯ÙˆØ±Ù‡ Ùˆ Ù…Ø§Ù†Ø¯Ù‡ Ø§Ù†ØªÙ‡Ø§</p>
        </div>
        <div className="flex gap-2">
          <PrintButton contentRef={printRef} documentTitle="ØªØ±Ø§Ø² Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ ØªÙØµÛŒÙ„ÛŒ"  orientation="landscape" /> {/* LANDSCAPE_PATCH */}
          <button className="btn-secondary" onClick={() => load()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ø³Ø§Ù„ Ù…Ø§Ù„ÛŒ</label>
          <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="input w-full">
            <option value="">â€” Ø§Ù†ØªØ®Ø§Ø¨ â€”</option>
            {fiscalYears.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Ø§Ø² ØªØ§Ø±ÛŒØ®</label>
          <PersianDatePicker value={fromDate} onChange={(v: string | null) => setFromDate(v || '')} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">ØªØ§ ØªØ§Ø±ÛŒØ®</label>
          <PersianDatePicker value={toDate} onChange={(v: string | null) => setToDate(v || '')} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Ù†Ù…Ø§ÛŒØ´
          </button>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="card overflow-hidden">
          <div className="p-6 border-b">
            <PrintHeader title="ØªØ±Ø§Ø² Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ ØªÙØµÛŒÙ„ÛŒ" subtitle={fiscalYears.find((f: any) => f.id === fiscalYearId)?.name || ''} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px]">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th rowSpan={2} className="border-l px-2 py-2 text-right font-medium text-slate-600 w-20">Ú©Ø¯</th>
                  <th rowSpan={2} className="border-l px-2 py-2 text-right font-medium text-slate-600">Ù†Ø§Ù… Ø­Ø³Ø§Ø¨</th>
                  <th colSpan={2} className="border-l px-2 py-2 text-center font-medium text-slate-600 bg-blue-50">Ù…Ø§Ù†Ø¯Ù‡ Ø§Ø¨ØªØ¯Ø§ÛŒ Ø¯ÙˆØ±Ù‡</th>
                  <th colSpan={2} className="border-l px-2 py-2 text-center font-medium text-slate-600 bg-emerald-50">Ú¯Ø±Ø¯Ø´ Ø¯ÙˆØ±Ù‡</th>
                  <th colSpan={2} className="px-2 py-2 text-center font-medium text-slate-600 bg-amber-50">Ù…Ø§Ù†Ø¯Ù‡ Ø§Ù†ØªÙ‡Ø§ÛŒ Ø¯ÙˆØ±Ù‡</th>
                </tr>
                <tr>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-blue-50 w-32">Ø¨Ø¯Ù‡Ú©Ø§Ø±</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-blue-50 w-32">Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-emerald-50 w-32">Ø¨Ø¯Ù‡Ú©Ø§Ø±</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-emerald-50 w-32">Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±</th>
                  <th className="border-l px-2 py-1 text-left font-medium text-slate-500 bg-amber-50 w-32">Ø¨Ø¯Ù‡Ú©Ø§Ø±</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500 bg-amber-50 w-32">Ø¨Ø³ØªØ§Ù†Ú©Ø§Ø±</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r: any) => (
                  <tr key={r.accountId} className="hover:bg-slate-50/50">
                    <td className="border-l px-2 py-1 num" dir="ltr">{r.accountCode}</td>
                    <td className="border-l px-2 py-1">{r.accountName}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.openingDebit ? formatNumber(r.openingDebit) : 'â€”'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.openingCredit ? formatNumber(r.openingCredit) : 'â€”'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.periodDebit ? formatNumber(r.periodDebit) : 'â€”'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.periodCredit ? formatNumber(r.periodCredit) : 'â€”'}</td>
                    <td className="border-l px-2 py-1 text-left num" dir="ltr">{r.closingDebit ? formatNumber(r.closingDebit) : 'â€”'}</td>
                    <td className="px-2 py-1 text-left num" dir="ltr">{r.closingCredit ? formatNumber(r.closingCredit) : 'â€”'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="border-l px-2 py-2 text-right">Ø¬Ù…Ø¹ Ú©Ù„</td>
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
