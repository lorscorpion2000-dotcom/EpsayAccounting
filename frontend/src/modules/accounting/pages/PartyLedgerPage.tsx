import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Users, Search, FileSpreadsheet, X } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/services/api';
import { accountingApi } from '../services/accounting.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

import { exportToExcel } from '@/utils/export-excel';

export default function PartyLedgerPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/partners').then((r) => setPartners(r.data)).catch(() => []);
    accountingApi.fiscalYears.list().then((list) => {
      setFiscalYears(list);
      const cur = list.find((f: any) => f.isCurrent);
      if (cur) setFiscalYearId(cur.id);
    }).catch(() => []);
  }, []);

  const load = async () => {
    if (!partnerId) { toast.error('ابتدا طرف حساب را انتخاب کنید'); return; }
    setLoading(true);
    try {
      setData(await accountingApi.reports.partyLedger({
        partnerId,
        fiscalYearId: fiscalYearId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const clearFilters = () => {
    setFiscalYearId('');
    setFromDate('');
    setToDate('');
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('داده‌ای نیست'); return; }
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
      filename: 'PartyLedger-' + (data.partner?.name || '') + '.xlsx',
      sheets: [{
        name: 'PartyLedger',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? partners.filter((p) =>
        (p.name || '').includes(search) ||
        (p.code && p.code.includes(search)))
    : partners;

  const partnerLabel = data?.partner
    ? data.partner.name + (data.partner.code ? ' (' + data.partner.code + ')' : '')
    : '';

  const hasSecondaryFilter = !!(fiscalYearId || fromDate || toDate);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            ریز حساب طرف حساب
          </h1>
          <p className="text-sm text-slate-500 mt-1">تمام تراکنش‌های مالی یک شخص با مانده در هر لحظه</p>
        </div>
      </div>

      <div className="card p-4 space-y-3 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">جستجو در طرف حساب‌ها</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="نام یا کد..."
              className="input w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">طرف حساب *</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="input w-full"
            >
              <option value="">— انتخاب کنید —</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? '(' + p.code + ')' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">سال مالی</label>
            <select
              value={fiscalYearId}
              onChange={(e) => setFiscalYearId(e.target.value)}
              className="input w-full"
            >
              <option value="">— همه —</option>
              {fiscalYears.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.isCurrent ? '(جاری)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">از تاریخ (اختیاری)</label>
            <PersianDatePicker
              value={fromDate}
              onChange={(v: string | null) => setFromDate(v || '')}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">تا تاریخ (اختیاری)</label>
            <PersianDatePicker
              value={toDate}
              onChange={(v: string | null) => setToDate(v || '')}
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
          {hasSecondaryFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> پاک کردن فیلترهای سال/تاریخ
            </button>
          ) : (
            <span className="text-xs text-slate-400">بدون فیلتر سال/تاریخ</span>
          )}
          <div className="flex items-center gap-2">
            <PrintButton contentRef={printRef} documentTitle="ریز حساب طرف حساب" />
            <button className="btn-secondary" onClick={exportExcel} disabled={!data}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button className="btn-primary" onClick={load} disabled={!partnerId || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              نمایش
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="space-y-6">
          <PrintHeader title="ریز حساب طرف حساب" subtitle={partnerLabel} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بدهکار</div>
              <div className="text-xl font-bold num text-orange-700" dir="ltr">{formatNumber(data.totals.debit)}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بستانکار</div>
              <div className="text-xl font-bold num text-cyan-700" dir="ltr">{formatNumber(data.totals.credit)}</div>
            </div>
            <div className={clsx('card p-4', data.totals.balance > 0 ? 'bg-orange-50 border-orange-200' : data.totals.balance < 0 ? 'bg-cyan-50 border-cyan-200' : '')}>
              <div className="text-xs text-slate-500 mb-1">مانده نهایی</div>
              <div className={clsx('text-xl font-bold num', data.totals.balance > 0 ? 'text-orange-700' : data.totals.balance < 0 ? 'text-cyan-700' : 'text-slate-700')} dir="ltr">
                {formatNumber(Math.abs(data.totals.balance))}
              </div>
              <div className="text-xs text-slate-500">
                {data.totals.balance > 0 ? 'بدهکار' : data.totals.balance < 0 ? 'بستانکار' : 'تسویه'}
              </div>
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
