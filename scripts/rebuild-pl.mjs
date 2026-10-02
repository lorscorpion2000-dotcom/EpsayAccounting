import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const ZWNJ = '\u200C';

// ═══════════════════════════════════════════════════════════════
// ProfitLossPage
// ═══════════════════════════════════════════════════════════════
const plContent = `import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { accountingApi } from '../services/accounting.api';
import { formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

export default function ProfitLossPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [fiscalYearId, setFiscalYearId] = useState('');

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
    if (!id) { toast.error('ابتدا سال مالی را انتخاب کنید'); return; }
    setLoading(true);
    try { setData(await accountingApi.reports.profitLoss({ fiscalYearId: id })); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data) return;
    const rows: any[] = [];
    rows.push({ 'نوع': 'درآمد', 'کد': '', 'حساب': '', 'مبلغ': '' });
    data.incomes.forEach((a: any) => rows.push({ 'نوع': 'درآمد', 'کد': a.code, 'حساب': a.name, 'مبلغ': a.amount }));
    rows.push({ 'نوع': 'جمع درآمد', 'کد': '', 'حساب': '', 'مبلغ': data.totals.totalIncome });
    rows.push({ 'نوع': '', 'کد': '', 'حساب': '', 'مبلغ': '' });
    rows.push({ 'نوع': 'هزینه', 'کد': '', 'حساب': '', 'مبلغ': '' });
    data.expenses.forEach((a: any) => rows.push({ 'نوع': 'هزینه', 'کد': a.code, 'حساب': a.name, 'مبلغ': a.amount }));
    rows.push({ 'نوع': 'جمع هزینه', 'کد': '', 'حساب': '', 'مبلغ': data.totals.totalExpense });
    rows.push({ 'نوع': '', 'کد': '', 'حساب': '', 'مبلغ': '' });
    rows.push({ 'نوع': 'سود (زیان) خالص', 'کد': '', 'حساب': '', 'مبلغ': data.totals.netIncome });

    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L');
    XLSX.writeFile(wb, 'ProfitLoss.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            صورت سود و زیان
          </h1>
          <p className="text-sm text-slate-500 mt-1">درآمد${ZWNJ}ها هزینه${ZWNJ}ها و سود خالص دوره</p>
        </div>
        <div className="flex gap-2">
          <PrintButton contentRef={printRef} documentTitle="سود و زیان" />
          <button className="btn-secondary" onClick={() => load()}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">سال مالی</label>
          <select value={fiscalYearId} onChange={(e) => { setFiscalYearId(e.target.value); load(e.target.value); }} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {fiscalYears.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} نمایش
          </button>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="card p-8 bg-white">
          <PrintHeader title="صورت سود و زیان" subtitle={fiscalYears.find((f: any) => f.id === fiscalYearId)?.name || ''} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-emerald-800">درآمدها</span>
              </div>
              {data.incomes.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">درآمدی ثبت نشده</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {data.incomes.map((a: any) => (
                      <tr key={a.code}>
                        <td className="px-2 py-2 text-xs num text-slate-500" dir="ltr">{a.code}</td>
                        <td className="px-2 py-2 text-xs">{a.name}</td>
                        <td className="px-2 py-2 text-left num font-medium text-emerald-700" dir="ltr">{formatNumber(a.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50/50 font-bold">
                      <td colSpan={2} className="px-2 py-2 text-emerald-800">جمع درآمدها</td>
                      <td className="px-2 py-2 text-left num text-emerald-800" dir="ltr">{formatNumber(data.totals.totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-3">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">هزینه${ZWNJ}ها</span>
              </div>
              {data.expenses.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">هزینه${ZWNJ}ای ثبت نشده</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {data.expenses.map((a: any) => (
                      <tr key={a.code}>
                        <td className="px-2 py-2 text-xs num text-slate-500" dir="ltr">{a.code}</td>
                        <td className="px-2 py-2 text-xs">{a.name}</td>
                        <td className="px-2 py-2 text-left num font-medium text-red-700" dir="ltr">{formatNumber(a.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50/50 font-bold">
                      <td colSpan={2} className="px-2 py-2 text-red-800">جمع هزینه${ZWNJ}ها</td>
                      <td className="px-2 py-2 text-left num text-red-800" dir="ltr">{formatNumber(data.totals.totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className={clsx('mt-6 p-5 rounded-lg border-2', data.totals.netIncome >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300')}>
            <div className="flex items-center justify-between">
              <div className={clsx('font-bold text-lg', data.totals.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800')}>
                {data.totals.netIncome >= 0 ? 'سود خالص دوره' : 'زیان خالص دوره'}
              </div>
              <div className={clsx('text-2xl font-bold num', data.totals.netIncome >= 0 ? 'text-emerald-800' : 'text-red-800')} dir="ltr">
                {formatNumber(Math.abs(data.totals.netIncome))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/ProfitLossPage.tsx', plContent, 'utf8');
console.log('OK ProfitLossPage.tsx');