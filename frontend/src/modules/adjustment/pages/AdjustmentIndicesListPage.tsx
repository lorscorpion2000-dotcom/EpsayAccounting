import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, TrendingUp, Edit, RefreshCw, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { adjustmentApi } from '../services/adjustment.api';
import type { AdjustmentIndex } from '@/types/adjustment';
import { PERSIAN_MONTHS_ADJ } from '@/types/adjustment';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function AdjustmentIndicesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdjustmentIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionItem, setActionItem] = useState<AdjustmentIndex | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adjustmentApi.indices.list({
        year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        category: categoryFilter || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [yearFilter, categoryFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await adjustmentApi.indices.remove(actionItem.id);
      toast.success('به سطل زباله منتقل شد — قابل بازیابی توسط مدیر');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const filtered = search
    ? items.filter((i) => i.category.includes(search) || i.code.includes(search))
    : items;

  const categories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-600" />
            شاخص‌های تعدیل
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت شاخص‌های ماهانه تعدیل برای گروه‌های کاری (ابنیه، راه، تأسیسات و ...)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/adjustment-indices/new')}>
            <Plus className="w-4 h-4" /> شاخص جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <input type="number" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            placeholder="سال" className="input num" dir="ltr" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input">
            <option value="">همه گروه‌ها</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ شاخصی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/adjustment-indices/new')}>
              <Plus className="w-4 h-4" /> اولین شاخص
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">سال</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">ماه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">گروه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">شاخص</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">سال پایه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it.id} className={clsx('hover:bg-slate-50/50', !it.isActive && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{it.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(it.year)}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      {PERSIAN_MONTHS_ADJ[it.month - 1] || it.month}
                    </td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{it.category}</td>
                    <td className="px-4 py-3 text-center num font-bold text-brand-700">
                      {toPersianDigits(Number(it.indexValue).toLocaleString())}
                    </td>
                    <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(it.baseYear)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md',
                        it.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                        {it.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton endpoint="/adjustment-indices" id={it.id} itemLabel={(it as any).code || (it as any).category} onSuccess={load} />
                        <button onClick={() => navigate('/adjustment-indices/' + it.id + '/edit')}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setActionItem(it)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف (به سطل زباله)">
                          <Trash2 className="w-4 h-4" />
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
        title="انتقال به سطل زباله"
        message={actionItem ? `شاخص «${actionItem.code}» به سطل زباله منتقل می‌شود. تا بازیابی توسط مدیر، در لیست نمایش داده نمی‌شود.` : ''}
        confirmLabel="بله، منتقل کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
