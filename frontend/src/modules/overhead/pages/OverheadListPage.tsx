import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, Calculator, Eye, RefreshCw, CheckCircle2, Archive } from 'lucide-react';
import clsx from 'clsx';
import { overheadApi } from '../services/overhead.api';
import { api } from '@/services/api';
import type { OverheadAllocation } from '@/types/overhead';
import {
  OVERHEAD_METHOD_LABELS, OVERHEAD_STATUS_LABELS, OVERHEAD_STATUS_COLORS,
} from '@/types/overhead';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function OverheadListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OverheadAllocation[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<OverheadAllocation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, fy] = await Promise.all([
        overheadApi.list({
          fiscalYearId: yearFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.get('/fiscal-years').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setYears(fy);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [yearFilter, statusFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await overheadApi.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handlePost = async (a: OverheadAllocation) => {
    if (!confirm('سند تسهیم سربار ثبت شود؟')) return;
    try {
      await overheadApi.post(a.id);
      toast.success('سند تسهیم ثبت شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const totalPosted = items
    .filter((i) => i.status === 'POSTED')
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand-600" />
            تسهیم سربار ستاد
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تقسیم هزینه‌های دفتر مرکزی بین پروژه‌ها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/overhead-allocations/new')}>
            <Plus className="w-4 h-4" /> تسهیم جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">تعداد تسهیم‌ها</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(items.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">ثبت‌شده</div>
          <div className="text-2xl font-bold num mt-1 text-emerald-600">
            {toPersianDigits(items.filter((i) => i.status === 'POSTED').length)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">مجموع ثبت‌شده (ریال)</div>
          <div className="text-xl font-bold num mt-1 text-brand-600">
            {toPersianDigits(Math.round(totalPosted).toLocaleString())}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="input">
            <option value="">همه سال‌های مالی</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(OVERHEAD_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ تسهیمی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/overhead-allocations/new')}>
              <Plus className="w-4 h-4" /> اولین تسهیم
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">دوره</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">روش تسهیم</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">پروژه‌ها</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ کل</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{a.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center num text-xs" dir="ltr">{a.periodMonth}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{OVERHEAD_METHOD_LABELS[a.method]}</td>
                    <td className="px-4 py-3 text-center num text-xs">
                      {toPersianDigits(a._count?.items ?? a.items?.length ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-left num text-xs font-bold">
                      {toPersianDigits(Number(a.totalAmount).toLocaleString())}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', OVERHEAD_STATUS_COLORS[a.status])}>
                        {OVERHEAD_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/overhead"
                          id={a.id}
                          itemLabel={(a as any).code || (a as any).name || (a as any).title || (a as any).fullName || (a as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => navigate('/overhead-allocations/' + a.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {a.status === 'DRAFT' && (
                          <>
                            <button onClick={() => handlePost(a)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت در حسابداری">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem(a)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {a.journalEntry && (
                          <span className="text-[10px] num text-emerald-600" dir="ltr">
                            {a.journalEntry.code}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionItem}
        title="حذف تسهیم"
        message={actionItem ? `آیا از حذف «${actionItem.code}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
