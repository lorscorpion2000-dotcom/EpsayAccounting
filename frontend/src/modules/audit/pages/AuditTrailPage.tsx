import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Search, Filter, Download, Eye, Shield, X } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { auditApi } from '../services/audit.api';
import type { AuditListResponse, AuditStats, AuditLogItem, SecurityStats } from '@/types/audit';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { SecurityView } from '../components/SecurityView';

const ACTION_LABELS: Record<string, string> = {
  POST: 'ایجاد', PATCH: 'ویرایش', PUT: 'ویرایش', DELETE: 'حذف',
  POST_FAILED: 'ایجاد (خطا)', PATCH_FAILED: 'ویرایش (خطا)',
  PUT_FAILED: 'ویرایش (خطا)', DELETE_FAILED: 'حذف (خطا)',
};

const ACTION_COLORS: Record<string, string> = {
  POST: 'bg-emerald-50 text-emerald-700',
  PATCH: 'bg-amber-50 text-amber-700',
  PUT: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
  POST_FAILED: 'bg-orange-50 text-orange-700',
  PATCH_FAILED: 'bg-orange-50 text-orange-700',
  PUT_FAILED: 'bg-orange-50 text-orange-700',
  DELETE_FAILED: 'bg-orange-50 text-orange-700',
};

export default function AuditTrailPage() {
  const [data, setData] = useState<AuditListResponse | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const [mode, setMode] = useState<'trail' | 'security'>('trail');
  const [secData, setSecData] = useState<AuditListResponse | null>(null);
  const [secStats, setSecStats] = useState<SecurityStats | null>(null);
  const [secLoading, setSecLoading] = useState(false);
  const [secAction, setSecAction] = useState('');
  const [secIp, setSecIp] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (search) params.search = search;
      if (entity) params.entity = entity;
      if (action) params.action = action;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const [listRes, stRes] = await Promise.all([
        auditApi.list(params),
        auditApi.stats({ fromDate, toDate }),
      ]);
      setData(listRes);
      setStats(stRes);
    } catch (e: any) {
      toast.error((e && e.response && e.response.data && e.response.data.message) || 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, entity, action, fromDate, toDate]);

  const loadSecurity = async () => {
    setSecLoading(true);
    try {
      const params: any = { page, pageSize };
      if (secAction) params.action = secAction;
      if (secIp) params.ipAddress = secIp;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const [listRes, stRes] = await Promise.all([
        auditApi.securityList(params),
        auditApi.securityStats({ fromDate, toDate }),
      ]);
      setSecData(listRes);
      setSecStats(stRes);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در بارگذاری');
    } finally { setSecLoading(false); }
  };

  useEffect(() => {
    if (mode === 'security') loadSecurity();
  }, [mode, page, secAction, secIp, fromDate, toDate]);

  const handleExport = () => {
    if (!data || !data.items) return;
    const rows = data.items.map((it, i) => ({
      'ردیف': (page - 1) * pageSize + i + 1,
      'تاریخ': formatJalaliDate(it.createdAt),
      'کاربر': it.user ? (it.user.fullName || it.user.username) : '—',
      'عملیات': ACTION_LABELS[it.action] || it.action,
      'موجودیت': it.entity,
      'شناسه': it.entityId || '—',
      'IP': it.ipAddress || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AuditTrail');
    XLSX.writeFile(wb, 'audit-trail-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  const clearFilters = () => {
    setSearch(''); setEntity(''); setAction('');
    setFromDate(''); setToDate(''); setPage(1);
  };

  const entities = stats && stats.byEntity ? stats.byEntity.map((e) => e.entity) : [];
  const actions = stats && stats.byAction ? stats.byAction.map((a) => a.action) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            لاگ تغییرات سیستم
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت تمام ایجاد، ویرایش و حذف‌های کاربران</p>
        </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => { setMode('trail'); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition',
              mode === 'trail' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            لاگ تغییرات
          </button>
          <button
            onClick={() => { setMode('security'); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition',
              mode === 'security' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            گزارش امنیتی
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" /> فیلترها
          </button>
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          {data && data.items && (
            <button className="btn-secondary" onClick={handleExport}>
              <Download className="w-4 h-4" /> اکسل
            </button>
          )}
        </div>
      </div>
      {mode === 'security' && (
        <SecurityView
          data={secData}
          stats={secStats}
          loading={secLoading}
          action={secAction}
          setAction={setSecAction}
          ip={secIp}
          setIp={setSecIp}
          page={page}
          setPage={setPage}
          onRefresh={loadSecurity}
          onViewDetail={setDetailItem}
        />
      )}

      {mode === 'trail' && (
        <>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500">کل رویدادها</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.total)}</div>
          </div>
          <div className="card p-4 border-s-4 border-s-emerald-500">
            <div className="text-xs text-slate-500">امروز</div>
            <div className="text-2xl font-bold num mt-1 text-emerald-700">{toPersianDigits(stats.todayCount)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">کاربران فعال</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.topUsers ? stats.topUsers.length : 0)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">موجودیت‌ها</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(entities.length)}</div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
            </div>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="input">
              <option value="">همه موجودیت‌ها</option>
              {entities.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="input">
              <option value="">همه عملیات</option>
              {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PersianDatePicker value={fromDate} onChange={setFromDate} />
            <PersianDatePicker value={toDate} onChange={setToDate} />
            <div className="flex gap-2">
              <button onClick={load} className="btn-primary flex-1">جستجو</button>
              <button onClick={clearFilters} className="btn-secondary"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !data || !data.items || data.items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">هیچ رویدادی یافت نشد</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-center px-3 py-2 w-12">#</th>
                    <th className="text-center px-3 py-2 w-32">تاریخ</th>
                    <th className="text-right px-3 py-2 w-40">کاربر</th>
                    <th className="text-center px-3 py-2 w-24">عملیات</th>
                    <th className="text-right px-3 py-2 w-40">موجودیت</th>
                    <th className="text-center px-3 py-2 w-32">IP</th>
                    <th className="text-center px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((it, i) => (
                    <tr key={it.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-center text-slate-400 num">{toPersianDigits((page - 1) * pageSize + i + 1)}</td>
                      <td className="px-3 py-2 text-center num">{formatJalaliDate(it.createdAt)}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{it.user ? it.user.fullName : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded font-bold', ACTION_COLORS[it.action] || 'bg-slate-100 text-slate-600')}>
                          {ACTION_LABELS[it.action] || it.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 num text-xs" dir="ltr">{it.entity}</td>
                      <td className="px-3 py-2 text-center num text-[10px]" dir="ltr">{it.ipAddress || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => setDetailItem(it)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  صفحه <span className="num font-bold">{toPersianDigits(page)}</span> از <span className="num font-bold">{toPersianDigits(data.totalPages)}</span>
                  {' · '}<span className="num">{toPersianDigits(data.total)}</span> رویداد
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">قبلی</button>
                  <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary text-xs disabled:opacity-40">بعدی</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>


        </>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">جزئیات رویداد</h3>
              <button onClick={() => setDetailItem(null)} className="p-2 rounded hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">تاریخ</div>
                  <div className="font-medium">{formatJalaliDate(detailItem.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">کاربر</div>
                  <div className="font-medium">{detailItem.user ? detailItem.user.fullName : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">عملیات</div>
                  <div className="font-medium">{ACTION_LABELS[detailItem.action] || detailItem.action}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">موجودیت</div>
                  <div className="font-medium num" dir="ltr">{detailItem.entity}</div>
                </div>
              </div>
              {detailItem.payload && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Payload</div>
                  <pre className="text-xs bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto max-h-[400px] num" dir="ltr">
                    {JSON.stringify(detailItem.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setDetailItem(null)} className="btn-secondary">بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
