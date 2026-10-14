import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Users, Edit, Printer, Archive } from 'lucide-react';
import { partnersApi } from '../services/partners.api';
import type { Partner } from '@/types/project';
import QuickPartnerModal from '../components/QuickPartnerModal';
import EditPartnerModal from '../components/EditPartnerModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
const TYPE_LABELS: Record<string, string> = {
  CLIENT: 'کارفرما',
  CONSULTANT: 'مشاور / ناظر',
  CONTRACTOR: 'پیمانکار',
  SUPPLIER: 'تأمین‌کننده',
  EMPLOYEE: 'پرسنل',
  PARTNER: 'شریک',
  OTHER: 'سایر',
};

const TYPE_COLORS: Record<string, string> = {
  CLIENT: 'bg-blue-50 text-blue-700',
  CONSULTANT: 'bg-purple-50 text-purple-700',
  CONTRACTOR: 'bg-emerald-50 text-emerald-700',
  SUPPLIER: 'bg-amber-50 text-amber-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  PARTNER: 'bg-pink-50 text-pink-700',
  OTHER: 'bg-slate-100 text-slate-700',
};

export default function PartnersListPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnersApi.list({
        search: search || undefined,
        type: typeFilter || undefined,
      });
      setPartners(data);
    } catch {
      toast.error('خطا در بارگذاری اشخاص');
    } finally {
      setLoading(false);
    }
  };

  // جستجوی زنده با debounce
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter]);

  const handleDelete = async (force = false) => {
    if (!deletingPartner) return;
    setDeleting(true);
    setForceError(null);
    try {
      const res = await partnersApi.remove(deletingPartner.id, force);
      if (res?.hardDeleted) {
        toast.success('شخص حذف شد');
        setDeletingPartner(null);
        setForceConfirm(false);
        load();
      } else {
        toast.success('شخص غیرفعال شد');
        setDeletingPartner(null);
        load();
      }
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'PARTNER_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">اشخاص</h1>
          <p className="text-sm text-slate-500 mt-1">دایرکتوری جامع اشخاص حقیقی و حقوقی</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          شخص جدید
        </button>
      </div>

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => { e.preventDefault(); load(); }}
            className="flex-1 min-w-[250px]"
          >
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو بر اساس نام یا کد..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" />
            چاپ
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ شخصی ثبت نشده است</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              افزودن اولین شخص
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-slate-600">کد</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">نوع</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">تلفن</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">ایمیل</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 num text-xs text-slate-500" dir="ltr">{p.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{p.name}</div>
                        {(p as any).nationalId && (
                          <div className="text-xs text-slate-500 num" dir="ltr">{(p as any).nationalId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${TYPE_COLORS[p.type] || TYPE_COLORS.OTHER}`}>
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 num text-slate-600" dir="ltr">{(p as any).phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600" dir="ltr">{(p as any).email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/partners"
                          id={p.id}
                          itemLabel={(p as any).code || (p as any).name || (p as any).title || (p as any).fullName || (p as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button
                        onClick={() => setEditingPartner(p)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingPartner(p)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        title="حذف"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create */}
      <QuickPartnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={load}
      />

      {/* Edit */}
      <EditPartnerModal
        isOpen={!!editingPartner}
        partner={editingPartner}
        onClose={() => setEditingPartner(null)}
        onUpdated={load}
      />
      {/* Delete Confirm — normal */}
      <ConfirmDialog
        isOpen={!!deletingPartner && !forceConfirm}
        title="حذف شخص"
        message={deletingPartner ? `شخص «${deletingPartner.name}» غیرفعال شود این عمل قابل بازگشت است.` : ''}
        confirmLabel="بله غیرفعال شود"
        variant="danger"
        loading={deleting}
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeletingPartner(null); setForceError(null); }}
      />

      {/* Force delete dialog */}
      {forceError && deletingPartner && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل (مدیر سیستم)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {forceError}
              </p>
              <p className="text-xs text-slate-500">
                با کلیک روی «حذف کامل» تمام ارجاعهای این شخص پاک میشود. اطمینان دارید
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); }} className="btn-secondary">
                  انصراف
                </button>
                <button onClick={() => handleDelete(true)} disabled={deleting} className="btn-danger">
                  {deleting ? 'در حال حذف...' : 'حذف کامل (خطرناک)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
