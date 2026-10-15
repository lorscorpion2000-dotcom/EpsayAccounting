import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, FileSpreadsheet, Printer, BarChart3, Calculator } from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import PrintHeader from '@/components/PrintHeader';
import type { FiscalYear, TrialBalanceResult } from '@/types/accounting';
import { ACCOUNT_LEVEL_LABELS } from '@/types/accounting';
import { formatNumber } from '@/utils/format';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED
export default function TrialBalancePage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [currentFy, setCurrentFy] = useState('');
  const [result, setResult] = useState<TrialBalanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountingApi.fiscalYears.list().then(setFiscalYears);
    accountingApi.fiscalYears.current().then((fy) => {
      if (fy) setCurrentFy(fy.id);
    });
  }, []);

  useEffect(() => {
    if (!currentFy) return;
    setLoading(true);
    accountingApi.reports.trialBalance({ fiscalYearId: currentFy })
      .then(setResult)
      .catch(() => toast.error('خطا در بارگذاری تراز آزمایشی'))
      .finally(() => setLoading(false));
  }, [currentFy]);

  const handleExportExcel = () => {
    if (!result || result.rows.length === 0) {
      toast.info('داده‌ای برای خروجی وجود ندارد');
      return;
    }
    const rows = result.rows.map((r) => ({
      'کد حساب': r.accountCode,
      'نام حساب': r.accountName,
      'سطح': ACCOUNT_LEVEL_LABELS[r.accountLevel],
      'بدهکار': r.debit,
      'بستانکار': r.credit,
      'مانده': r.balance,
    }));
    rows.push({
      'کد حساب': '',
      'نام حساب': 'جمع کل',
      'سطح': '',
      'بدهکار': result.totals.debit,
      'بستانکار': result.totals.credit,
      'مانده': result.totals.difference,
    });
    void exportToExcel({
      filename: `TrialBalance-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'TrialBalance',
        rows,
        cols: [
      { wch: 15 }, { wch: 40 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 20 },
    ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  const fyName = fiscalYears.find((f) => f.id === currentFy)?.name || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PrintHeader
        title="تراز آزمایشی ۴ ستونی"
        subtitle={fyName ? `سال مالی: ${fyName}` : ''}
      />
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            تراز آزمایشی ۴ ستونی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {fyName ? `سال مالی: ${fyName}` : 'گزارش مانده حساب‌ها'}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <select
            value={currentFy}
            onChange={(e) => setCurrentFy(e.target.value)}
            className="input w-auto"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.name} {fy.isCurrent ? '(جاری)' : ''}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <PagePrintButton documentTitle="تراز آزمایشی" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !result || result.rows.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هیچ گردشی در این سال مالی ثبت نشده است</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b-2 border-slate-300">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد حساب</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام حساب</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">سطح</th>
                  <th className="text-left px-4 py-3 font-bold text-emerald-700 w-44">بدهکار</th>
                  <th className="text-left px-4 py-3 font-bold text-brand-700 w-44">بستانکار</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 w-44">مانده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows.map((row) => (
                  <tr key={row.accountId} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <span className="num text-xs text-slate-600 font-mono" dir="ltr">
                        {row.accountCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">{row.accountName}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                      {ACCOUNT_LEVEL_LABELS[row.accountLevel]}
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <span className="num text-emerald-700" dir="ltr">
                        {row.debit ? formatNumber(row.debit) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <span className="num text-brand-700" dir="ltr">
                        {row.credit ? formatNumber(row.credit) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <span
                        className={clsx(
                          'num font-medium',
                          row.balance > 0 ? 'text-emerald-800' :
                          row.balance < 0 ? 'text-brand-800' : 'text-slate-500',
                        )}
                        dir="ltr"
                      >
                        {row.balance ? formatNumber(Math.abs(row.balance)) : '—'}
                        {row.balance > 0 && <span className="text-xs ms-1">بد</span>}
                        {row.balance < 0 && <span className="text-xs ms-1">بس</span>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-800">
                    جمع کل
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span className="num font-bold text-emerald-800" dir="ltr">
                      {formatNumber(result.totals.debit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span className="num font-bold text-brand-800" dir="ltr">
                      {formatNumber(result.totals.credit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span
                      className={clsx(
                        'num font-bold',
                        Math.abs(result.totals.difference) < 0.01
                          ? 'text-emerald-700'
                          : 'text-red-700',
                      )}
                      dir="ltr"
                    >
                      {formatNumber(Math.abs(result.totals.difference))}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Balance status */}
      {result && result.rows.length > 0 && (
        <div
          className={clsx(
            'card p-4 flex items-center gap-3',
            Math.abs(result.totals.difference) < 0.01
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200',
          )}
        >
          <Calculator className={clsx(
            'w-6 h-6',
            Math.abs(result.totals.difference) < 0.01 ? 'text-emerald-600' : 'text-red-600',
          )} />
          <div className="flex-1">
            <div className={clsx(
              'font-bold',
              Math.abs(result.totals.difference) < 0.01 ? 'text-emerald-800' : 'text-red-800',
            )}>
              {Math.abs(result.totals.difference) < 0.01 ? 'تراز است ✅' : 'تراز نیست ❌'}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              اختلاف تراز: {formatNumber(Math.abs(result.totals.difference))} ریال
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
