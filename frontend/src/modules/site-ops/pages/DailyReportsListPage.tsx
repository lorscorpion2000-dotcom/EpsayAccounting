import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, ClipboardList, Eye, Edit, Send, CheckCircle2, XCircle, RefreshCw, Sun, Cloud, CloudRain, Snowflake, Wind, Archive } from 'lucide-react';
import clsx from 'clsx';
import { siteOpsApi } from '../services/site-ops.api';
import { api } from '@/services/api';
import type { DailyReport, WeatherCondition } from '@/types/site-ops';
import {
  REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, WEATHER_LABELS,
} from '@/types/site-ops';
import type { Project } from '@/types/project';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const WEATHER_ICONS: Record<WeatherCondition, any> = {
  SUNNY: Sun, CLOUDY: Cloud, RAINY: CloudRain, SNOWY: Snowflake, WINDY: Wind, STORM: CloudRain,
};

export default function DailyReportsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DailyReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: DailyReport; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        siteOpsApi.reports.list({
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, projectFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await siteOpsApi.reports.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') {
        await siteOpsApi.reports.submit(actionItem.item.id);
        toast.success('به کارتابل ارسال شد');
      }
      else if (a === 'approve') { await siteOpsApi.reports.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل رد الزامی'); setActionLoading(false); return; }
        await siteOpsApi.reports.reject(actionItem.item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null);
      setReason('');
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = search
    ? items.filter((i) =>
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        i.project?.name?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-600" />
            گزارش‌های روزانه کارگاه
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و مدیریت وقایع روزانه کارگاه ساختمانی</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/site-ops/daily-reports/new')}>
            <Plus className="w-4 h-4" /> گزارش جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ گزارش روزانه‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/site-ops/daily-reports/new')}>
              <Plus className="w-4 h-4" /> اولین گزارش
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ گزارش</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">آب‌وهوا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">نیرو</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">ماشین</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const WeatherIcon = r.weather ? WEATHER_ICONS[r.weather] : null;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3"><span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{r.code}</span></td>
                      <td className="px-4 py-3 text-slate-800 text-xs">{r.project?.name}</td>
                      <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(r.reportDate)}</span></td>
                      <td className="px-4 py-3 text-center">
                        {WeatherIcon ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <WeatherIcon className="w-4 h-4 text-slate-500" />
                            {WEATHER_LABELS[r.weather!]}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center num text-xs">
                        {toPersianDigits(r._count?.workers || 0)}
                      </td>
                      <td className="px-4 py-3 text-center num text-xs">
                        {toPersianDigits(r._count?.equipments || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', REPORT_STATUS_COLORS[r.status])}>
                          {REPORT_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/site-ops/daily-reports"
                          id={r.id}
                          itemLabel={(r as any).code || (r as any).name || (r as any).title || (r as any).fullName || (r as any).username || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => navigate('/site-ops/daily-reports/' + r.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                            <Eye className="w-4 h-4" />
                          </button>
                          {(r.status === 'DRAFT' || r.status === 'REJECTED') && (
                            <>
                              <button onClick={() => navigate('/site-ops/daily-reports/' + r.id + '/edit')} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: r, action: 'submit' })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                                <Send className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: r, action: 'delete' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {r.status === 'SUBMITTED' && (
                            <>
                              <button onClick={() => setActionItem({ item: r, action: 'approve' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: r, action: 'reject' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف گزارش' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' :
          'تایید گزارش'
        }
        message={
          actionItem?.action === 'delete' ? `آیا از حذف «${actionItem.item.code}» اطمینان دارید؟` :
          actionItem?.action === 'submit' ? `گزارش «${actionItem?.item.code}» به کارتابل ارسال می‌شود.` :
          `گزارش «${actionItem?.item.code}» تایید می‌شود.`
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد گزارش</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
