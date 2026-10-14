import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, Package, Eye, RefreshCw, CheckCircle2, Send, XCircle, Archive } from 'lucide-react';
import clsx from 'clsx';
import { adjustmentApi } from '../services/adjustment.api';
import { api } from '@/services/api';
import type { MaterialPriceDiff } from '@/types/adjustment';
import { ADJ_STATUS_LABELS, ADJ_STATUS_COLORS } from '@/types/adjustment';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function MaterialPriceDiffListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MaterialPriceDiff[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<MaterialPriceDiff | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        adjustmentApi.priceDiffs.list({
          projectId: projectFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectFilter, statusFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await adjustmentApi.priceDiffs.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const doAction = async (item: MaterialPriceDiff, action: string) => {
    if (action === 'confirm' && !confirm('تأیید شود؟')) return;
    if (action === 'post' && !confirm('سند حسابداری ثبت شود؟')) return;
    if (action === 'cancel' && !confirm('لغو شود؟')) return;
    try {
      if (action === 'confirm') await adjustmentApi.priceDiffs.confirm(item.id);
      else if (action === 'post') await adjustmentApi.priceDiffs.post(item.id);
      else if (action === 'cancel') await adjustmentApi.priceDiffs.cancel(item.id);
      toast.success('انجام شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            مابه‌التفاوت مصالح
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            محاسبه مابه‌التفاوت بهای مصالح پایه با بهای روز خرید
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/material-price-diffs/new')}>
            <Plus className="w-4 h-4" /> مورد جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ADJ_STATUS_LABELS).map(([k, v]) => (
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
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ موردی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/material-price-diffs/new')}>
              <Plus className="w-4 h-4" /> اولین مورد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">مصالح</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">مقدار</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-28">قیمت پایه</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-28">قیمت واقعی</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">مابه‌التفاوت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">وضعیت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => {
                  const diff = Number(it.diffAmount);
                  return (
                    <tr key={it.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{it.code}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-800 text-xs">{it.project?.name}</td>
                      <td className="px-3 py-3 text-slate-700 text-xs">{it.materialType}</td>
                      <td className="px-3 py-3 text-center num text-xs">
                        {toPersianDigits(Number(it.quantity).toFixed(2))} {it.unit || ''}
                      </td>
                      <td className="px-3 py-3 text-left num text-xs">
                        {toPersianDigits(Math.round(Number(it.basePrice)).toLocaleString())}
                      </td>
                      <td className="px-3 py-3 text-left num text-xs">
                        {toPersianDigits(Math.round(Number(it.actualPrice)).toLocaleString())}
                      </td>
                      <td className={clsx('px-3 py-3 text-left num text-xs font-bold',
                        diff > 0 ? 'text-red-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-500')}>
                        {diff > 0 ? '+' : ''}{toPersianDigits(Math.round(diff).toLocaleString())}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-md', ADJ_STATUS_COLORS[it.status])}>
                          {ADJ_STATUS_LABELS[it.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate('/material-price-diffs/' + it.id)}
                            className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                            <Eye className="w-4 h-4" />
                          </button>
                          <AdminDeleteButton endpoint="/material-price-diffs" id={it.id} itemLabel={(it as any).code || (it as any).id} onSuccess={load} />
                          {it.status === 'DRAFT' && (
                            <>
                              <button onClick={() => doAction(it, 'confirm')}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="تأیید">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem(it)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {it.status === 'CONFIRMED' && (
                            <button onClick={() => doAction(it, 'post')}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {['DRAFT', 'CONFIRMED'].includes(it.status) && (
                            <button onClick={() => doAction(it, 'cancel')}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="لغو">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {it.journalEntry && (
                            <span className="text-[10px] num text-emerald-600" dir="ltr">{it.journalEntry.code}</span>
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
        isOpen={!!actionItem}
        title="حذف مورد"
        message={actionItem ? `«${actionItem.code}» حذف شود؟` : ''}
        confirmLabel="بله"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
