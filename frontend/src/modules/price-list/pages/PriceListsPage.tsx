import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, BookOpen, Eye, Edit, RefreshCw, CheckCircle2, BarChart3, Archive } from 'lucide-react';
import clsx from 'clsx';
import { priceListApi } from '../services/price-list.api';
import type { PriceList, BoqStats } from '@/types/price-list';
import { PRICE_LIST_STATUS_LABELS, PRICE_LIST_STATUS_COLORS } from '@/types/price-list';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function PriceListsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PriceList[]>([]);
  const [stats, setStats] = useState<BoqStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [actionItem, setActionItem] = useState<PriceList | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, st] = await Promise.all([
        priceListApi.lists.list({
          search: search || undefined,
          status: statusFilter || undefined,
          year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        }),
        priceListApi.lists.stats().catch(() => null),
      ]);
      setItems(data);
      setStats(st);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, yearFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await priceListApi.lists.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handlePublish = async (pl: PriceList) => {
    try {
      await priceListApi.lists.publish(pl.id);
      toast.success('منتشر شد');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            فهرست بها (BOQ)
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت فهرست‌بهای ابلاغی و پایه‌ای</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/price-lists/new')}>
            <Plus className="w-4 h-4" /> فهرست جدید
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500">تعداد فهرست‌ها</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.lists)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">منتشرشده</div>
            <div className="text-2xl font-bold num mt-1 text-emerald-600">{toPersianDigits(stats.published)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">تعداد ردیف‌ها</div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.items)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">متصل به WBS</div>
            <div className="text-2xl font-bold num mt-1 text-brand-600">{toPersianDigits(stats.linked)}</div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <input type="number" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            placeholder="سال" className="input num" dir="ltr" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(PRICE_LIST_STATUS_LABELS).map(([k, v]) => (
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
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ فهرست بهایی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/price-lists/new')}>
              <Plus className="w-4 h-4" /> اولین فهرست
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">سال</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">از تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">تا تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">ردیف‌ها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{pl.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{pl.title}</td>
                    <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(pl.year)}</td>
                    <td className="px-4 py-3 text-center num text-xs">{formatJalaliDate(pl.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-center num text-xs">
                      {pl.effectiveTo ? formatJalaliDate(pl.effectiveTo) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center num">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                        <BarChart3 className="w-3 h-3" />
                        {toPersianDigits(pl._count?.items ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', PRICE_LIST_STATUS_COLORS[pl.status])}>
                        {PRICE_LIST_STATUS_LABELS[pl.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/price-list"
                          id={pl.id}
                          itemLabel={(pl as any).code || (pl as any).name || (pl as any).title || (pl as any).fullName || (pl as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => navigate(`/price-lists/${pl.id}`)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/price-lists/${pl.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                          <Edit className="w-4 h-4" />
                        </button>
                        {pl.status === 'DRAFT' && (
                          <button onClick={() => handlePublish(pl)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="انتشار">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setActionItem(pl)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                          <Archive className="w-4 h-4" />
                        </button>
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
        title="حذف فهرست بها"
        message={actionItem ? `آیا از حذف «${actionItem.title}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}