import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, FileSpreadsheet, Printer, Search, BookMarked, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import PrintHeader from '@/components/PrintHeader';
import type { Account, LedgerResult } from '@/types/accounting';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import AccountSelect from '../components/AccountSelect';

import { exportToExcel } from '@/utils/export-excel';
export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [result, setResult] = useState<LedgerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    accountingApi.accounts.postable().then(setAccounts);
  }, []);

  const filteredAccounts = search
    ? accounts.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.includes(search))
    : accounts;

  const loadLedger = async (accountId: string) => {
    setLoading(true);
    try {
      const data = await accountingApi.reports.ledger({ accountId });
      setResult(data);
    } catch {
      toast.error('خطا در بارگذاری دفتر معین');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) loadLedger(selectedAccount);
    else setResult(null);
  }, [selectedAccount]);

  const handleExportExcel = () => {
    if (!result || !result.account) {
      toast.info('ابتدا یک حساب انتخاب کنید');
      return;
    }
    const rows = result.rows.map((r, i) => ({
      'ردیف': i + 1,
      'کد سند': r.entryCode,
      'تاریخ': new Date(r.entryDate).toLocaleDateString('fa-IR'),
      'شرح': r.description,
      'مرجع': r.reference || '',
      'بدهکار': r.debit,
      'بستانکار': r.credit,
      'مانده': r.balance,
    }));
    if (result.totals) {
      rows.push({
        'ردیف': '' as any,
        'کد سند': '',
        'تاریخ': '',
        'شرح': 'جمع کل',
        'مرجع': '',
        'بدهکار': result.totals.debit,
        'بستانکار': result.totals.credit,
        'مانده': result.totals.balance,
      });
    }
    void exportToExcel({
      filename: `Ledger-${result.account.code}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{
        name: 'Ledger',
        rows,
        cols: [
      { wch: 8 }, { wch: 15 }, { wch: 14 }, { wch: 40 },
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PrintHeader
        title="دفتر معین"
        subtitle={result?.account ? `حساب: ${result.account.code} - ${result.account.name}` : ''}
      />
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-brand-600" />
            دفتر معین
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            گردش تفصیلی یک حساب به ترتیب تاریخ
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            چاپ
          </button>
        </div>
      </div>

      {/* Account selector */}
      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی حساب..."
              className="input ps-10 pe-4 w-full"
            />
          </div>
          <AccountSelect
            accounts={accounts}
            value={selectedAccount}
            onChange={setSelectedAccount}
            placeholder="جستجوی حساب..."
          />
        </div>
      </div>

      {/* Result */}
      {!selectedAccount ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">برای مشاهده دفتر معین، یک حساب انتخاب کنید</p>
        </div>
      ) : loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !result || !result.account ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500">حساب یافت نشد</p>
        </div>
      ) : (
        <>
          {/* Account header */}
          <div className="card p-4 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
                <BookMarked className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-0.5">حساب انتخاب‌شده</div>
                <div className="flex items-center gap-2">
                  <span className="num text-sm font-mono text-slate-600" dir="ltr">
                    {result.account.code}
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {result.account.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {result.rows.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">هیچ گردشی در این حساب ثبت نشده است</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-center px-3 py-3 font-medium text-slate-600 w-12">#</th>
                      <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">کد سند</th>
                      <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                      <th className="text-right px-3 py-3 font-medium text-slate-600">شرح</th>
                      <th className="text-left px-3 py-3 font-medium text-slate-600 w-36">بدهکار</th>
                      <th className="text-left px-3 py-3 font-medium text-slate-600 w-36">بستانکار</th>
                      <th className="text-left px-3 py-3 font-bold text-slate-700 w-40">مانده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 text-center text-slate-500 num text-xs">
                          {toPersianDigits(idx + 1)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="num text-xs font-mono text-slate-600" dir="ltr">
                            {row.entryCode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="num text-xs text-slate-700">
                            {formatJalaliDate(row.entryDate)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 text-xs">
                          {row.description}
                          {row.reference && (
                            <span className="text-xs text-slate-400 ms-2 num">
                              ({row.reference})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-left">
                          {row.debit > 0 ? (
                            <span className="num text-emerald-700 text-xs" dir="ltr">
                              {formatNumber(row.debit)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-left">
                          {row.credit > 0 ? (
                            <span className="num text-brand-700 text-xs" dir="ltr">
                              {formatNumber(row.credit)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-left">
                          <span className={clsx(
                            'num font-medium text-xs',
                            row.balance > 0 ? 'text-emerald-800' :
                            row.balance < 0 ? 'text-brand-800' : 'text-slate-500',
                          )} dir="ltr">
                            {formatNumber(Math.abs(row.balance))}
                            {row.balance > 0 && <span className="text-[10px] ms-1">بد</span>}
                            {row.balance < 0 && <span className="text-[10px] ms-1">بس</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {result.totals && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-right font-bold text-slate-800">
                          جمع کل
                        </td>
                        <td className="px-3 py-3 text-left">
                          <span className="num font-bold text-emerald-800 text-xs" dir="ltr">
                            {formatNumber(result.totals.debit)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-left">
                          <span className="num font-bold text-brand-800 text-xs" dir="ltr">
                            {formatNumber(result.totals.credit)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-left">
                          <span className={clsx(
                            'num font-bold text-xs',
                            result.totals.balance > 0 ? 'text-emerald-800' :
                            result.totals.balance < 0 ? 'text-brand-800' : 'text-slate-700',
                          )} dir="ltr">
                            {formatNumber(Math.abs(result.totals.balance))}
                            {result.totals.balance > 0 && <span className="text-[10px] ms-1">بد</span>}
                            {result.totals.balance < 0 && <span className="text-[10px] ms-1">بس</span>}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
