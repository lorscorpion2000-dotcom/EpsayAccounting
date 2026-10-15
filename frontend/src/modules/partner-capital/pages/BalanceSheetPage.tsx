import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wallet, RefreshCw, FileSpreadsheet, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { partnerCapitalApi, BalanceSheet } from '../services/partner-capital.api';
import { formatNumber } from '@/utils/format';
import PrintHeader from '@/components/PrintHeader';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED
export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerCapitalApi.reports.balanceSheet();
      setData(res);
    } catch { toast.error('خطا در بارگذاری تراز'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExportExcel = () => {
    if (!data) return;
    const rows = data.accounts.map((a, i) => ({
      'ردیف': i + 1,
      'کد': a.code,
      'شریک': a.partnerName,
      'کد شریک': a.partnerCode,
      'پروژه': a.projectName,
      'مانده (ریال)': a.balance,
    }));
    rows.push({
      'ردیف': '' as any, 'کد': '', 'شریک': 'جمع کل',
      'کد شریک': '', 'پروژه': '',
      'مانده (ریال)': data.totals.net,
    });
    void exportToExcel({
      filename: 'PartnerBalanceSheet-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'BalanceSheet',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  if (loading) return (
    <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PrintHeader title="تراز تسویه جاری شرکا" subtitle="خلاصه آورده‌ها و برداشت‌های شرکا" />

      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            تراز تسویه جاری شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مانده جاری هر شریک در هر پروژه
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <PagePrintButton documentTitle="سرمایه شرکا" />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-emerald-700">مجموع آورده‌ها</div>
                <div className="text-xl font-bold text-emerald-700 num">{formatNumber(data.totals.contributions)}</div>
                <div className="text-xs text-emerald-600">ریال</div>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-bl from-rose-50 to-white border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-rose-700">مجموع برداشت‌ها</div>
                <div className="text-xl font-bold text-rose-700 num">{formatNumber(data.totals.withdrawals)}</div>
                <div className="text-xs text-rose-600">ریال</div>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-brand-700">مانده خالص</div>
                <div className="text-xl font-bold text-brand-700 num">{formatNumber(data.totals.net)}</div>
                <div className="text-xs text-brand-600">ریال</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {!data || data.accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هیچ داده‌ای برای نمایش وجود ندارد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 w-48">مانده (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.accounts.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center text-slate-500 num text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{a.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.partnerName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {a.projectName}
                      <span className="text-slate-400 num ms-2">({a.projectCode})</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={
                        a.balance > 0 ? 'num font-bold text-emerald-700' :
                        a.balance < 0 ? 'num font-bold text-rose-700' : 'num font-bold text-slate-500'
                      } dir="ltr">
                        {formatNumber(a.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-800">مانده خالص</td>
                  <td className="px-4 py-3 text-left">
                    <span className={
                      data.totals.net > 0 ? 'num font-bold text-emerald-800 text-base' :
                      data.totals.net < 0 ? 'num font-bold text-rose-800 text-base' : 'num font-bold text-slate-800 text-base'
                    } dir="ltr">
                      {formatNumber(data.totals.net)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
