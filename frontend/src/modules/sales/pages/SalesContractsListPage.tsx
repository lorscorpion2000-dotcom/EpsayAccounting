import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, ShoppingBag, Edit, RefreshCw, Eye, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesContract } from '../services/sales.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس', ACTIVE: 'فعال', COMPLETED: 'خاتمه',
  CANCELLED: 'ابطال', SUSPENDED: 'معلق', TERMINATED: 'فسخ',
};

export default function SalesContractsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<SalesContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleting, setDeleting] = useState<SalesContract | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.contracts.list({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {
      const res = await salesApi.contracts.remove(deleting.id, force);
      toast.success(force ? 'به‌طور کامل حذف شد' : 'حذف شد');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'CONTRACT_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            قراردادهای فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت قرارداد فروش واحدها با تقسیط و پرداخت</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => nav('/sales/contracts/new')}>
            <Plus className="w-4 h-4" /> قرارداد جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">قرارداد فروشی ثبت نشده</p>
            <button className="btn-primary" onClick={() => nav('/sales/contracts/new')}>
              <Plus className="w-4 h-4" /> اولین قرارداد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">مشتری</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">واحد / پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ نهایی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.customer?.fullName}</div>
                      {c.customer?.nationalId && <div className="text-xs num text-slate-500" dir="ltr">{c.customer.nationalId}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>واحد {c.unit?.unitNumber}{c.unit?.block ? ' - بلوک ' + c.unit.block : ''}</div>
                      <div className="text-slate-500">{c.unit?.project?.name}</div>
                    </td>
                    <td className="px-4 py-3 num text-xs">{formatJalaliDate(c.contractDate)}</td>
                    <td className="px-4 py-3 text-left num font-bold text-emerald-700" dir="ltr">
                      {formatNumber(Number(c.finalPrice))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-md',
                        c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                        c.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                        c.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/sales/contracts"
                          id={c.id}
                          itemLabel={(c as any).code || (c as any).name || (c as any).title || (c as any).fullName || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => nav('/sales/contracts/' + c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {c.status === 'DRAFT' && (
                          <button
                            onClick={() => nav('/sales/contracts/' + c.id + '/edit')}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {(c.status === 'DRAFT' || c.status === 'CANCELLED') && (
                          <button
                            onClick={() => setDeleting(c)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        isOpen={!!deleting && !forceConfirm}
        title="حذف قرارداد"
        message={deleting ? "قرارداد «" + deleting.code + "» حذف شود؟ واحد آزاد خواهد شد." : ""}
        confirmLabel="بله، حذف شود"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل قرارداد (مدیر)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setDeleting(null); }} className="btn-secondary">انصراف</button>
                <button onClick={() => handleDelete(true)} className="btn-danger">حذف کامل (خطرناک)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}