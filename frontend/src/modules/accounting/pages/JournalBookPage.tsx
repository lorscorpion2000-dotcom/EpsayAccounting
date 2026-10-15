import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, FileSpreadsheet, Calendar, BookOpen, CheckCircle2 } from 'lucide-react';
import { accountingApi } from '../services/accounting.api';
import PrintHeader from '@/components/PrintHeader';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { JournalEntry, FiscalYear } from '@/types/accounting';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED
export default function JournalBookPage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [currentFy, setCurrentFy] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountingApi.fiscalYears.list().then(setFiscalYears);
    accountingApi.fiscalYears.current().then((fy) => {
      if (fy) setCurrentFy(fy.id);
    });
  }, []);

  const loadData = async () => {
    if (!currentFy) return;
    setLoading(true);
    try {
      const data = await accountingApi.reports.journalBook({
        fiscalYearId: currentFy,
        fromDate,
        toDate,
      });
      setJournals(data);
    } catch {
      toast.error('خطا در بارگذاری دفتر روزنامه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentFy, fromDate, toDate]);

  const handleExportExcel = () => {
    if (journals.length === 0) {
      toast.info('داده‌ای برای خروجی وجود ندارد');
      return;
    }
    const rows: any[] = [];
    journals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        rows.push({
          'کد سند': j.code,
          'تاریخ': new Date(j.entryDate).toLocaleDateString('fa-IR'),
          'شرح سند': j.description,
          'کد حساب': l.account?.code,
          'نام حساب': l.account?.name,
          'شرح ردیف': l.description || '',
          'بدهکار': Number(l.debit) || 0,
          'بستانکار': Number(l.credit) || 0,
        });
      });
    });
    void exportToExcel({
      filename: `JournalBook-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'JournalBook',
        rows,
        cols: [
      { wch: 15 }, { wch: 14 }, { wch: 30 }, { wch: 15 },
      { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
    ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  const fyName = fiscalYears.find((f) => f.id === currentFy)?.name || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PrintHeader
        title="دفتر روزنامه"
        subtitle={fyName ? `سال مالی: ${fyName}` : ''}
      />
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            دفتر روزنامه
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {fyName ? `سال مالی: ${fyName}` : 'مشاهده تمام اسناد به ترتیب تاریخ'}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <PagePrintButton documentTitle="دفتر روزنامه" />
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={currentFy}
            onChange={(e) => setCurrentFy(e.target.value)}
            className="input"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.name} {fy.isCurrent ? '(جاری)' : ''}
              </option>
            ))}
          </select>
          <div>
            <PersianDatePicker
              value={fromDate}
              onChange={(v)=>setFromDate(v??undefined)}
              placeholder="از تاریخ"
            />
          </div>
          <div>
            <PersianDatePicker
              value={toDate}
              onChange={(v)=>setToDate(v??undefined)}
              placeholder="تا تاریخ"
            />
          </div>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only text-center mb-6">
        <h2 className="text-xl font-bold">استودیو معماری اپسای</h2>
        <h3 className="text-lg mt-1">دفتر روزنامه</h3>
        <p className="text-sm mt-1">{fyName}</p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : journals.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">هیچ سندی در این بازه ثبت نشده است</p>
        </div>
      ) : (
        <div className="space-y-4">
          {journals.map((j) => {
            const totalDebit = Number(j.totalDebit);
            const totalCredit = Number(j.totalCredit);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

            return (
              <div key={j.id} className="card overflow-hidden">
                {/* Journal header */}
                <div className="bg-gradient-to-l from-slate-50 to-white p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="num text-sm font-bold text-brand-700 font-mono" dir="ltr">
                        {j.code}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="num text-xs text-slate-600">
                        {formatJalaliDate(j.entryDate)}
                      </span>
                      {isBalanced && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          تراز
                        </span>
                      )}
                    </div>
                    {j.reference && (
                      <span className="text-xs text-slate-500 num">
                        مرجع: {j.reference}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-800">{j.description}</div>
                </div>

                {/* Lines */}
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-slate-500 w-24">کد</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-500">نام حساب</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-500">شرح</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-500 w-32">بدهکار</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-500 w-32">بستانکار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {j.lines?.map((l, idx) => (
                      <tr key={l.id || idx}>
                        <td className="px-3 py-2">
                          <span className="num font-mono text-slate-600" dir="ltr">
                            {l.account?.code}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-800">{l.account?.name}</td>
                        <td className="px-3 py-2 text-slate-500">{l.description || '—'}</td>
                        <td className="px-3 py-2 text-left">
                          {Number(l.debit) > 0 ? (
                            <span className="num text-emerald-700" dir="ltr">
                              {formatNumber(Number(l.debit))}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-left">
                          {Number(l.credit) > 0 ? (
                            <span className="num text-brand-700" dir="ltr">
                              {formatNumber(Number(l.credit))}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-slate-700 text-xs">
                        جمع سند
                      </td>
                      <td className="px-3 py-2 text-left">
                        <span className="num font-bold text-emerald-800 text-xs" dir="ltr">
                          {formatNumber(totalDebit)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-left">
                        <span className="num font-bold text-brand-800 text-xs" dir="ltr">
                          {formatNumber(totalCredit)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          {/* Summary */}
          <div className="card p-4 bg-slate-100 border-slate-300">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800">
                جمع کل ({toPersianDigits(journals.length)} سند)
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xs text-slate-500">بدهکار</div>
                  <div className="num font-bold text-emerald-700" dir="ltr">
                    {formatNumber(journals.reduce((s, j) => s + Number(j.totalDebit), 0))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">بستانکار</div>
                  <div className="num font-bold text-brand-700" dir="ltr">
                    {formatNumber(journals.reduce((s, j) => s + Number(j.totalCredit), 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
