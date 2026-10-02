import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const ZWNJ = '\u200C'; // نیمفاصله

// ═══════════════════════════════════════════════════════════════
// ARAgingPage — بازسازی کامل
// ═══════════════════════════════════════════════════════════════
const arContent = `import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertCircle, RefreshCw, FileSpreadsheet, Search } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { accountingApi } from '../services/accounting.api';
import { formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

export default function ARAgingPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);

  useEffect(() => {
    accountingApi.fiscalYears.list().then((list) => {
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
    if (!data?.rows?.length) { toast.info('داده\u200Cای نیست'); return; }
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
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            سنی بدهکاران (AR Aging)
          </h1>
          <p className="text-sm text-slate-500 mt-1">مطالبات از طرف\u200Cحساب\u200Cها به تفکیک بازه سنی</p>
        </div>
        <div className="flex gap-2">
          <PrintButton contentRef={printRef} documentTitle="سنی بدهکاران" />
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
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
            به\u200Cروزرسانی
          </button>
        </div>
      </div>

      {data && (
        <div ref={printRef} className="space-y-4">
          <PrintHeader title="سنی بدهکاران (AR Aging)" subtitle={'تا تاریخ ' + asOfDate} />
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
              <div className="p-12 text-center text-slate-500">مطالبه\u200Cای یافت نشد</div>
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
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/ARAgingPage.tsx', arContent, 'utf8');
console.log('OK ARAgingPage.tsx');

// ═══════════════════════════════════════════════════════════════
// APAgingPage — از AR با جایگزینی
// ═══════════════════════════════════════════════════════════════
let apContent = arContent
  .replace(/AR Aging/g, 'AP Aging')
  .replace(/ARAgingPage/g, 'APAgingPage')
  .replace(/arAging/g, 'apAging')
  .replace(/AR-Aging/g, 'AP-Aging')
  .replace(/سنی بدهکاران/g, 'سنی بستانکاران')
  .replace(/مطالبات از طرف\u200Cحساب\u200Cها/g, 'بدهی\u200Cها به طرف\u200Cحساب\u200Cها')
  .replace(/text-orange-600/g, 'text-cyan-600')
  .replace(/مطالبه\u200Cای یافت نشد/g, 'بدهی\u200Cای یافت نشد');

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/APAgingPage.tsx', apContent, 'utf8');
console.log('OK APAgingPage.tsx');

// ═══════════════════════════════════════════════════════════════
// چک فایلهای دیگر (فقط چاپ اگر خراب)
// ═══════════════════════════════════════════════════════════════
const others = [
  'PartyLedgerPage.tsx',
  'ProjectLedgerPage.tsx',
  'ProfitLossPage.tsx',
  'BalanceSheetPage.tsx',
  'DetailedTrialBalancePage.tsx',
];

for (const name of others) {
  const f = ROOT + '/frontend/src/modules/accounting/pages/' + name;
  if (!fs.existsSync(f)) continue;
  const c = fs.readFileSync(f, 'utf8');
  // چک: آیا با ایمپورت سالم شروع میشود
  if (!c.match(/^import\s/m)) {
    console.log('!! ' + name + ' خراب است — نیاز به بازسازی');
  } else if (c.includes('\u064A')) {
    console.log('!! ' + name + ' شامل ی عربی است — نیاز به پاکسازی');
  } else {
    console.log('OK ' + name + ' سالم است');
  }
}

console.log('');
console.log('=== DONE ===');