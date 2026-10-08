import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Users, Edit, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { salesApi, SalesCustomer } from '../services/sales.api';
import CustomerFormModal from '../components/CustomerFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
export default function SalesCustomersPage() {
  const [items, setItems] = useState<SalesCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesCustomer | null>(null);
  const [deleting, setDeleting] = useState<SalesCustomer | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await salesApi.customers.list(search || undefined)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {
      const res = await salesApi.customers.remove(deleting.id, force);
      toast.success(force ? 'مشتری به‌طور کامل حذف شد' : 'مشتری غیرفعال شد');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'CUSTOMER_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
      }
    }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => ({
      'ردیف': i + 1,
      'نام': c.fullName,
      'کد ملی': c.nationalId || '',
      'موبایل': c.mobilePhone || '',
      'تلفن ثابت': c.landlinePhone || '',
      'ایمیل': c.email || '',
      'شبا': c.bankSheba || '',
    }));
    void exportToExcel({
      filename: 'SalesCustomers-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'Customers',
        rows,
      }],
    });
    toast.success('مشتری حذف شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            مشتریان فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت اطلاعات خریداران واحدها</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> مشتری جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="جستجو بر اساس نام، کد ملی یا موبایل..."
            className="input ps-10 pe-4 w-full"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ مشتری ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین مشتری
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام کامل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد ملی</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">موبایل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">آدرس</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.fullName}</td>
                    <td className="px-4 py-3"><span className="num text-xs" dir="ltr">{c.nationalId || '—'}</span></td>
                    <td className="px-4 py-3"><span className="num text-xs" dir="ltr">{c.mobilePhone || '—'}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-xs">{c.address || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(c); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                          title="حذف"
                        >
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

      <CustomerFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting && !forceConfirm}
        title="حذف مشتری"
        message={deleting ? "مشتری «" + deleting.fullName + "» غیرفعال شود؟" : ""}
        confirmLabel="بله، غیرفعال شود"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل مشتری (مدیر)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <p className="text-xs text-slate-500">با حذف کامل، تمام ارجاع‌های این مشتری پاک می‌شود.</p>
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
