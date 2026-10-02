import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Frontend API — افزودن ۷ متد
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/accounting/services/accounting.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes("partyLedger")) {
  // پیدا کردن بلاک reports
  const idx = api.indexOf('reports: {');
  if (idx < 0) { console.log('!! reports block not found'); process.exit(1); }
  
  // پیدا کردن آخر reports block: اولین "\n  },\n" بعد از reports
  let depth = 0;
  let endIdx = -1;
  for (let i = idx + 9; i < api.length - 2; i++) {
    if (api[i] === '{') depth++;
    if (api[i] === '}') {
      if (depth === 0) { endIdx = i; break; }
      depth--;
    }
  }
  if (endIdx < 0) { console.log('!! end of reports not found'); process.exit(1); }
  
  const newMethods = `
    partyLedger: async (params: { partnerId: string; fiscalYearId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/party-ledger', { params });
      return data;
    },
    projectLedger: async (params: { projectId: string; fiscalYearId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/project-ledger', { params });
      return data;
    },
    arAging: async (params?: { fiscalYearId?: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/ar-aging', { params });
      return data;
    },
    apAging: async (params?: { fiscalYearId?: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/ap-aging', { params });
      return data;
    },
    profitLoss: async (params: { fiscalYearId: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/profit-loss', { params });
      return data;
    },
    balanceSheet: async (params: { fiscalYearId: string; asOfDate?: string }) => {
      const { data } = await api.get('/accounting/reports/balance-sheet', { params });
      return data;
    },
    detailedTrialBalance: async (params: { fiscalYearId: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get('/accounting/reports/detailed-trial-balance', { params });
      return data;
    },
`;
  api = api.slice(0, endIdx) + newMethods + api.slice(endIdx);
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('OK api (7 methods)');
} else {
  console.log('SKIP api');
}

// ═══════════════════════════════════════════════════════════════
// 2) PartyLedgerPage.tsx
// ═══════════════════════════════════════════════════════════════
const partyPage = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Users, Search, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { api } from '@/services/api';
import { accountingApi } from '../services/accounting.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';

export default function PartyLedgerPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/partners').then((r) => setPartners(r.data)).catch(() => []);
  }, []);

  const load = async () => {
    if (!partnerId) { toast.error('ابتدا طرف حساب را انتخاب کنید'); return; }
    setLoading(true);
    try {
      setData(await accountingApi.reports.partyLedger({ partnerId }));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('دادهای نیست'); return; }
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
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'PartyLedger');
    XLSX.writeFile(wb, 'PartyLedger-' + (data.partner?.name || '') + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? partners.filter((p) => p.name.includes(search) || (p.code && p.code.includes(search)))
    : partners.slice(0, 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            ریز حساب طرف حساب
          </h1>
          <p className="text-sm text-slate-500 mt-1">تمام تراکنشهای مالی یک شخص با مانده در هر لحظه</p>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">طرف حساب</label>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>{p.name} {p.code ? '(' + p.code + ')' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" onClick={load} disabled={!partnerId || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            نمایش
          </button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}>
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data && (
        <>
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
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/PartyLedgerPage.tsx', partyPage, 'utf8');
console.log('OK PartyLedgerPage.tsx');

// ═══════════════════════════════════════════════════════════════
// 3) ProjectLedgerPage.tsx
// ═══════════════════════════════════════════════════════════════
const projPage = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Building2, Search, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { projectsApi } from '@/modules/projects/services/projects.api';
import { accountingApi } from '../services/accounting.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';

export default function ProjectLedgerPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectsApi.list().then(setProjects as any).catch(() => []);
  }, []);

  const load = async () => {
    if (!projectId) { toast.error('ابتدا پروه را انتخاب کنید'); return; }
    setLoading(true);
    try { setData(await accountingApi.reports.projectLedger({ projectId })); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data?.rows?.length) { toast.info('دادهای نیست'); return; }
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
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'ProjectLedger');
    XLSX.writeFile(wb, 'ProjectLedger-' + (data.project?.name || '') + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-brand-600" />
          ریز حساب پروه
        </h1>
        <p className="text-sm text-slate-500 mt-1">تمام مالی پروه در یک نگاه</p>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">پروه</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} {p.code ? '(' + p.code + ')' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1" onClick={load} disabled={!projectId || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            نمایش
          </button>
          <button className="btn-secondary" onClick={exportExcel} disabled={!data}>
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بدهکار</div>
              <div className="text-xl font-bold num text-orange-700" dir="ltr">{formatNumber(data.totals.debit)}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 mb-1">مجموع بستانکار</div>
              <div className="text-xl font-bold num text-cyan-700" dir="ltr">{formatNumber(data.totals.credit)}</div>
            </div>
            <div className="card p-4 bg-indigo-50 border-indigo-200">
              <div className="text-xs text-indigo-700 mb-1">مانده نهایی</div>
              <div className="text-xl font-bold num text-indigo-700" dir="ltr">{formatNumber(Math.abs(data.totals.balance))}</div>
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
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/pages/ProjectLedgerPage.tsx', projPage, 'utf8');
console.log('OK ProjectLedgerPage.tsx');

console.log('');
console.log('=== DONE ===');