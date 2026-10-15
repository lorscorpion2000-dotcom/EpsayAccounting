import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, BookMarked, Filter, Download, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { useRef } from 'react';
import { advancedLedgerApi } from '../services/advanced-ledger.api';
import { api } from '@/services/api';
import type { AdvLedgerResponse } from '@/types/advanced-ledger';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import PrintHeader from '@/components/PrintHeader';
import PagePrintButton from '@/components/PagePrintButton'; // ADV_LEDGER_BTN_FIX
import { todayLocalISO } from '@/utils/local-date';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function startOfYearISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  // از 1 فروردین (21 مارس)
  const start = new Date(year, 2, 21);
  if (start > d) start.setFullYear(year - 1);
  return start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
}

export default function AdvancedLedgerPage() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);

  const [data, setData] = useState<AdvLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setAccountsLoaded] = useState(false);

  // Filters
  const [accountId, setAccountId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [includeSubAccounts, setIncludeSubAccounts] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    Promise.all([
      api.get('/accounts/flat').then((r) => r.data).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
      api.get('/cost-centers').then((r) => r.data).catch(() => []),
    ]).then(([acc, prj, prt, cc]) => {
      setAccounts(acc);
      setProjects(prj);
      setPartners(prt);
      setCostCenters(cc);
      setAccountsLoaded(true);
    });
  }, []);

  const load = async () => {
    if (!accountId || !fromDate || !toDate) {
      toast.error('حساب و بازه تاریخ الزامی است');
      return;
    }
    setLoading(true);
    setPage(1);
    try {
      const result = await advancedLedgerApi.report({
        accountId,
        projectId: projectId || undefined,
        partnerId: partnerId || undefined,
        costCenterId: costCenterId || undefined,
        fromDate,
        toDate,
        includeSubAccounts,
      });
      setData(result);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  /* ADV_LEDGER_PRINT_FIX: handlePrint removed */

  const handleExportExcel = () => {
    if (!data) return;
    const rows = data.rows.map((r, idx) => ({
      'ردیف': idx + 1,
      'تاریخ': formatJalaliDate(r.entryDate),
      'شماره سند': r.entryCode,
      'کد حساب': r.accountCode,
      'نام حساب': r.accountName,
      'شرح': r.description || '',
      'پروژه': r.project?.name || '',
      'طرف حساب': r.partner?.name || '',
      'بدهکار': r.debit,
      'بستانکار': r.credit,
      'مانده': r.balance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, 'advanced-ledger-' + todayLocalISO() + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  const clearFilters = () => {
    setProjectId('');
    setPartnerId('');
    setCostCenterId('');
  };

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows;
  }, [data]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const hasSecondaryFilter = projectId || partnerId || costCenterId;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-brand-600" />
            دفتر معین
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            گردش تفصیلی حساب‌ها با فیلتر پروژه، طرف حساب و مرکز هزینه
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" /> فیلترها
          </button>
          {data && (
            <>
              <button className="btn-secondary" onClick={handleExportExcel}>
                <Download className="w-4 h-4" /> خروجی اکسل
              </button>
              <PagePrintButton documentTitle="دفتر معین پیشرفته" /> {/* ADV_LEDGER_BTN_FIX */}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-6 space-y-4 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label">حساب (کل / معین / تفصیلی) *</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                <option value="">— انتخاب حساب —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">شامل زیرحساب‌ها</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="incSub" checked={includeSubAccounts} onChange={(e) => setIncludeSubAccounts(e.target.checked)}
                  className="w-4 h-4 accent-brand-600" />
                <label htmlFor="incSub" className="text-sm text-slate-700">
                  بله، زیرحساب‌ها هم نمایش داده شوند
                </label>
              </div>
            </div>
            <div>
              <label className="label">از تاریخ *</label>
              <PersianDatePicker value={fromDate} onChange={setFromDate} />
            </div>
            <div>
              <label className="label">تا تاریخ *</label>
              <PersianDatePicker value={toDate} onChange={setToDate} />
            </div>
            <div>
              <label className="label">مرکز هزینه</label>
              <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} className="input">
                <option value="">— همه —</option>
                {costCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">پروژه</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
                <option value="">— همه —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">طرف حساب</label>
              <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input">
                <option value="">— همه —</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {hasSecondaryFilter ? (
              <button type="button" onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> پاک کردن فیلترهای جانبی
              </button>
            ) : <span />}
            <button type="button" onClick={load} disabled={loading || !accountId} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              نمایش گزارش
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {!data && !loading && (
        <div className="card p-12 text-center text-slate-400 text-sm">
          برای مشاهده گزارش، حساب و بازه تاریخ را انتخاب کرده و «نمایش گزارش» را بزنید.
        </div>
      )}

      {loading && (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
            <div className="card p-4">
              <div className="text-xs text-slate-500">مانده اول دوره</div>
              <div className="text-lg font-bold num mt-1">
                {toPersianDigits(Math.round(data.summary.openingBalance).toLocaleString())}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingUp className="w-4 h-4" /> بدهکار دوره
              </div>
              <div className="text-lg font-bold num mt-1 text-emerald-600">
                {toPersianDigits(Math.round(data.summary.totalDebit).toLocaleString())}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingDown className="w-4 h-4" /> بستانکار دوره
              </div>
              <div className="text-lg font-bold num mt-1 text-red-600">
                {toPersianDigits(Math.round(data.summary.totalCredit).toLocaleString())}
              </div>
            </div>
            <div className="card p-4 border-s-4 border-s-brand-500">
              <div className="text-xs text-slate-500">مانده پایان دوره</div>
              <div className={clsx('text-lg font-bold num mt-1',
                data.summary.closingBalance >= 0 ? 'text-brand-700' : 'text-red-700')}>
                {toPersianDigits(Math.round(data.summary.closingBalance).toLocaleString())}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between no-print">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-brand-600" />
                گردش حساب
                <span className="text-sm font-normal text-slate-400">
                  ({toPersianDigits(filteredRows.length)} ردیف)
                </span>
              </h2>
              {data.period && (
                <span className="text-xs text-slate-500 num">
                  {formatJalaliDate(data.period.from)} تا {formatJalaliDate(data.period.to)}
                </span>
              )}
            </div>

            <div ref={printRef}>
              <div className="hidden print:block p-4">
                <PrintHeader title="دفتر معین" subtitle={
                  data.period ? formatJalaliDate(data.period.from) + ' تا ' + formatJalaliDate(data.period.to) : ''
                } />
              </div>

              {pagedRows.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  در این بازه تراکنشی وجود ندارد
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[1100px]">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-center px-2 py-2 w-10 font-medium text-slate-600">#</th>
                        <th className="text-center px-2 py-2 w-24 font-medium text-slate-600">تاریخ</th>
                        <th className="text-center px-2 py-2 w-28 font-medium text-slate-600">شماره سند</th>
                        <th className="text-right px-2 py-2 w-28 font-medium text-slate-600">کد حساب</th>
                        <th className="text-right px-2 py-2 w-40 font-medium text-slate-600">نام حساب</th>
                        <th className="text-right px-2 py-2 font-medium text-slate-600">شرح</th>
                        <th className="text-right px-2 py-2 w-32 font-medium text-slate-600">پروژه</th>
                        <th className="text-right px-2 py-2 w-32 font-medium text-slate-600">طرف حساب</th>
                        <th className="text-left px-2 py-2 w-28 font-medium text-slate-600">بدهکار</th>
                        <th className="text-left px-2 py-2 w-28 font-medium text-slate-600">بستانکار</th>
                        <th className="text-left px-2 py-2 w-28 font-medium text-slate-600">مانده</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      {page === 1 && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="px-2 py-2 text-right font-bold text-slate-700">
                            مانده اول دوره
                          </td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2 text-left num font-bold">
                            {toPersianDigits(Math.round(data.summary.openingBalance).toLocaleString())}
                          </td>
                        </tr>
                      )}
                      {pagedRows.map((r, i) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-2 py-2 text-center text-slate-400 num">
                            {toPersianDigits((page - 1) * pageSize + i + 1)}
                          </td>
                          <td className="px-2 py-2 text-center num text-slate-600">
                            {formatJalaliDate(r.entryDate)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => navigate('/accounting/journals/' + r.entryId)}
                              className="num text-xs font-mono text-brand-600 hover:underline" dir="ltr">
                              {r.entryCode}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="num font-mono text-brand-700" dir="ltr">{r.accountCode}</span>
                          </td>
                          <td className="px-2 py-2 text-right text-slate-700">{r.accountName}</td>
                          <td className="px-2 py-2 text-right text-slate-600 max-w-xs truncate" title={r.description}>
                            {r.description}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-500 text-[10px]">{r.project?.name || '—'}</td>
                          <td className="px-2 py-2 text-right text-slate-500 text-[10px]">{r.partner?.name || '—'}</td>
                          <td className="px-2 py-2 text-left num text-emerald-700">
                            {r.debit > 0 ? toPersianDigits(Math.round(r.debit).toLocaleString()) : '—'}
                          </td>
                          <td className="px-2 py-2 text-left num text-red-700">
                            {r.credit > 0 ? toPersianDigits(Math.round(r.credit).toLocaleString()) : '—'}
                          </td>
                          <td className={clsx('px-2 py-2 text-left num font-bold',
                            r.balance >= 0 ? 'text-slate-800' : 'text-red-700')}>
                            {toPersianDigits(Math.round(r.balance).toLocaleString())}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 font-bold">
                      <tr>
                        <td colSpan={8} className="px-2 py-3 text-right text-slate-700">جمع دوره</td>
                        <td className="px-2 py-3 text-left num text-emerald-700">
                          {toPersianDigits(Math.round(data.summary.totalDebit).toLocaleString())}
                        </td>
                        <td className="px-2 py-3 text-left num text-red-700">
                          {toPersianDigits(Math.round(data.summary.totalCredit).toLocaleString())}
                        </td>
                        <td className="px-2 py-3 text-left num text-brand-700">
                          {toPersianDigits(Math.round(data.summary.closingBalance).toLocaleString())}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between no-print">
                <div className="text-xs text-slate-500">
                  صفحه <span className="num font-bold">{toPersianDigits(page)}</span> از <span className="num font-bold">{toPersianDigits(totalPages)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn-secondary text-xs disabled:opacity-40">
                    <ChevronRight className="w-3 h-3" /> قبلی
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="btn-secondary text-xs disabled:opacity-40">
                    بعدی <ChevronLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sub-account breakdown (if multiple) */}
          {data.accounts.length > 1 && (
            <div className="card overflow-hidden no-print">
              <div className="px-6 py-4 border-b bg-slate-50">
                <h2 className="font-bold text-slate-800">تفکیک به حساب‌ها</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-slate-600 w-32">کد</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">نام</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">مانده اول</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">مانده پایان</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600 w-24">تغییر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.accounts.filter((a) => Math.abs(a.openingBalance) > 0.01 || Math.abs(a.closingBalance) > 0.01).map((a) => {
                      const delta = a.closingBalance - a.openingBalance;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2"><span className="num font-mono text-brand-700" dir="ltr">{a.code}</span></td>
                          <td className="px-3 py-2 text-slate-700">{a.name}</td>
                          <td className="px-3 py-2 text-left num">{toPersianDigits(Math.round(a.openingBalance).toLocaleString())}</td>
                          <td className="px-3 py-2 text-left num font-bold">{toPersianDigits(Math.round(a.closingBalance).toLocaleString())}</td>
                          <td className={clsx('px-3 py-2 text-center num', delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {delta >= 0 ? '+' : ''}{toPersianDigits(Math.round(delta).toLocaleString())}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
