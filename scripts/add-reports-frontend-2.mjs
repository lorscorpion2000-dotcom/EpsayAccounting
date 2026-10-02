import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// ARAgingPage.tsx
// ═══════════════════════════════════════════════════════════════
const arPage = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertCircle, RefreshCw, FileSpreadsheet, Search } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { accountingApi } from '../services/accounting.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { accountingApi as accApi } from '../services/accounting.api';

export default function ARAgingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);

  useEffect(() => {
    accApi.fiscalYears.list().then((list) => {
      setFiscalYears(list);
      const cur = list.find((f: any) => f.isCurrent);
      if (cur) setFiscalYearId(cur.id);
    }).catch(() => []);
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setData(await accountingApi.reports.arAging({ asOfDate, fiscalYearId: fiscalYearId || undefined }));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('دادهای نیست'); return; }
    const rows = data.rows.map((r: any, i: number) => ({
      'ردیف': i + 1,
      'کد': r.partnerCode,
      'طرف حساب': r.partnerName,
      '0-30 روز': r.current,
      '31-60 روز': r.days31_60,
      '61-90 روز': r.days61_90,
      '91-180 روز': r.days91_180,
      '+180 روز': r.days180plus,
      'مانده کل': r.balance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'AR Aging');
    XLSX.writeFile(wb, 'AR-Aging-' + asOfDate + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            سنی بدهکاران (AR Aging)
          </h1>
          <p className="text-sm text-slate-500 mt-1">مطالبات از طرف حسابها به تفکیک بازه سنی</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">سال مالی</label>
          <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="input w-full">
            <option value="">— همه —</option>
            {fiscalYears.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">تا تاریخ</label>
          <PersianDatePicker value={asOfDate} onChange={(v: string | null) => setAsOfDate(v || '')} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بهروزرسانی
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="card p-3">
              <div className="text-xs text-slate-500">مانده کل</div>
              <div className="text-lg font-bold num text-slate-800" dir="ltr">{formatNumber(data.totals.balance)}</div>
            </div>
            <div className="card p-3 bg-emerald-50 border-emerald-200">
              <div className="text-xs text-emerald-700">۰-۳۰ روز</div>
              <div className="text-sm font-bold num text-emerald-700" dir="ltr">{formatNumber(data.totals.current)}</div>
            </div>
            <div className="card p-3 bg-yellow-50 border-yellow-200">
              <div className="text-xs text-yellow-700">۳۱-۶۰ روز</div>
              <div className="text-sm font-bold num text-yellow-700" dir="ltr">{formatNumber(data.totals.days31_60)}</div>
            </div>
            <div className="card p-3 bg-orange-50 border-orange-200">
              <div className="text-xs text-orange-700">۶۱-۹۰ روز</div>
              <div className="text-sm font-bold num text-orange-700" dir="ltr">{formatNumber(data.totals.days61_90)}</div>
            </div>
            <div className="card p-3 bg-red-50 border-red-200">
              <div className="text-xs text-red-700">۹۱-۱۸۰ روز</div>
              <div className="text-sm font-bold num text-red-700" dir="ltr">{formatNumber(data.totals.days91_180)}</div>
            </div>
            <div className="card p-3 bg-red-100 border-red-300">
              <div className="text-xs text-red-900">+۱۸۰ روز</div>
              <div className="text-sm font-bold num text-red-900" dir="ltr">{formatNumber(data.totals.days180plus)}</div>
            </div>
          </div>

          <div className="card overflow-hidden">
            {data.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-500">مطالبهای یافت نشد</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">طرف حساب</th>
                      <th className="text-left px-3 py-2 font-medium text-emerald-700">۰-۳۰</th>
                      <th className="text-left px-3 py-2 font-medium text-yellow-700">۳۱-۶۰</th>
                      <th className="text-left px-3 py-2 font-medium text-orange-700">۶۱-۹۰</th>
                      <th className="text-left px-3 py-2 font-medium text-red-700">۹۱-۱۸۰</th>
                      <th className="text-left px-3 py-2 font-medium text-red-900">+۱۸۰</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-800">مانده کل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((r: any) => (
                      <tr key={r.partnerId} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{r.partnerName}</div>
                          {r.partnerCode && <div className="text-xs text-slate-500 num" dir="ltr">{r.partnerCode}</div>}
                        </td>
                        <td className="px-3 py-2 text-left num text-xs" dir="ltr">{r.current ? formatNumber(r.current) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs" dir="ltr">{r.days31_60 ? formatNumber(r.days31_60) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs" dir="ltr">{r.days61_90 ? formatNumber(r.days61_90) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs" dir="ltr">{r.days91_180 ? formatNumber(r.days91_180) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs" dir="ltr">{r.days180plus ? formatNumber(r.days180plus) : '—'}</td>
                        <td className="px-3 py-2 text-left num text-xs font-bold" dir="ltr">{formatNumber(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/ARAgingPage.tsx', arPage, 'utf8');
console.log('OK ARAgingPage.tsx');

// ═══════════════════════════════════════════════════════════════
// APAgingPage.tsx — با اصلاح fetch fiscal years
// ═══════════════════════════════════════════════════════════════
const apPage = arPage
  .replace(/AR Aging/g, 'AP Aging')
  .replace(/ARAgingPage/g, 'APAgingPage')
  .replace(/arAging/g, 'apAging')
  .replace(/AR-Aging/g, 'AP-Aging')
  .replace(/سنی بدهکاران/g, 'سنی بستانکاران')
  .replace(/مطالبات از طرف حسابها/g, 'بدهیها به طرف حسابها')
  .replace(/text-orange-600/g, 'text-cyan-600')
  .replace(/مطالبهای یافت نشد/g, 'بدهیای یافت نشد');

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/APAgingPage.tsx', apPage, 'utf8');
console.log('OK APAgingPage.tsx');

// ═══════════════════════════════════════════════════════════════
// P&L Page
// ═══════════════════════════════════════════════════════════════
const plPage = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, FileSpreadsheet, RefreshCw, Search, Printer } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { accountingApi } from '../services/accounting.api';
import { formatNumber } from '@/utils/format';
import { useRef } from 'react';
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
          <p className="text-sm text-slate-500 mt-1">درآمدها هزینهها و سود خالص دوره</p>
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
                <span className="font-bold text-red-800">هزینهها</span>
              </div>
              {data.expenses.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">هزینهای ثبت نشده</div>
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
                      <td colSpan={2} className="px-2 py-2 text-red-800">جمع هزینهها</td>
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

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/ProfitLossPage.tsx', plPage, 'utf8');
console.log('OK ProfitLossPage.tsx');

console.log('');
console.log('=== DONE ===');