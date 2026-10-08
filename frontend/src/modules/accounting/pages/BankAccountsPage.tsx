import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Landmark, Search, Power } from 'lucide-react';
import { toast } from 'sonner';
import {
  bankAccountsApi,
  type BankAccount,
  type BankAccountInput,
} from '../services/bank-accounts.api';

export default function BankAccountsPage() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const list = await bankAccountsApi.list();
      setItems(list);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (filterActive === 'active' && !b.isActive) return false;
      if (filterActive === 'inactive' && b.isActive) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const blob = [b.code, b.name, b.bankName, b.accountNumber, b.shabaNumber]
          .filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [items, search, filterActive]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (b: BankAccount) => { setEditing(b); setShowForm(true); };

  const handleSubmit = async (payload: BankAccountInput) => {
    setBusy(true);
    try {
      if (editing) {
        await bankAccountsApi.update(editing.id, payload);
        toast.success('حساب بانکی به‌روزرسانی شد');
      } else {
        await bankAccountsApi.create(payload);
        toast.success('حساب بانکی ایجاد شد');
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در ذخیره');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (b: BankAccount) => {
    try {
      await bankAccountsApi.update(b.id, { isActive: !b.isActive });
      toast.success(b.isActive ? 'غیرفعال شد' : 'فعال شد');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await bankAccountsApi.remove(deleteTarget.id);
      toast.success('حذف شد');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در حذف');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Landmark size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">حساب‌های بانکی</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت حساب‌های بانکی شرکت — برای صدور چک و ثبت دریافت/پرداخت
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
            title="بارگذاری مجدد"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
          >
            <Plus size={16} />
            حساب جدید
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در کد، نام، بانک، شماره حساب یا شبا..."
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">همه</option>
          <option value="active">فقط فعال</option>
          <option value="inactive">فقط غیرفعال</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3 font-medium w-32">کد</th>
              <th className="text-right px-4 py-3 font-medium">نام</th>
              <th className="text-right px-4 py-3 font-medium">بانک / شعبه</th>
              <th className="text-right px-4 py-3 font-medium">شماره حساب</th>
              <th className="text-right px-4 py-3 font-medium">شبا</th>
              <th className="text-center px-4 py-3 font-medium w-24">وضعیت</th>
              <th className="text-center px-4 py-3 font-medium w-28">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>
            )}
            {!loading && filtered.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{b.code}</td>
                <td className="px-4 py-2 text-slate-800">{b.name}</td>
                <td className="px-4 py-2 text-slate-600 text-xs">
                  {b.bankName || '—'}
                  {b.branchName ? <span className="text-slate-400"> / {b.branchName}</span> : null}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{b.accountNumber || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {b.shabaNumber ? `IR${b.shabaNumber}` : '—'}
                </td>
                <td className="px-4 py-2 text-center">
                  {b.isActive ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">فعال</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">غیرفعال</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => toggleActive(b)}
                      className={`p-1.5 rounded hover:bg-slate-100 ${b.isActive ? 'text-amber-600' : 'text-emerald-600'}`}
                      title={b.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                    >
                      <Power size={14} />
                    </button>
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="ویرایش">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="حذف">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BAFormModal
          editing={editing}
          busy={busy}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">حذف حساب بانکی</h3>
            <p className="text-sm text-slate-600 mb-4">
              آیا از حذف <span className="font-mono">{deleteTarget.code}</span> «{deleteTarget.name}» مطمئن هستید؟
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >{busy ? '...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BAFormModal({
  editing, busy, onCancel, onSubmit,
}: {
  editing: BankAccount | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: BankAccountInput) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [bankName, setBankName] = useState(editing?.bankName ?? '');
  const [branchName, setBranchName] = useState(editing?.branchName ?? '');
  const [accountNumber, setAccountNumber] = useState(editing?.accountNumber ?? '');
  const [shabaNumber, setShabaNumber] = useState(editing?.shabaNumber ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('نام الزامی است'); return; }
    onSubmit({
      name: name.trim(),
      bankName: bankName.trim() || null,
      branchName: branchName.trim() || null,
      accountNumber: accountNumber.trim() || null,
      shabaNumber: shabaNumber.trim() || null,
      description: description.trim() || null,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            {editing ? 'ویرایش حساب بانکی' : 'حساب بانکی جدید'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نام حساب *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: حساب جاری بانک ملت — شعبه مرکزی"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">بانک</label>
              <input
                type="text"
                value={bankName ?? ''}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="مثلاً: ملت"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">شعبه</label>
              <input
                type="text"
                value={branchName ?? ''}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="مثلاً: مرکزی"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">شماره حساب</label>
              <input
                type="text"
                value={accountNumber ?? ''}
                onChange={(e) => setAccountNumber(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">شبا (بدون IR)</label>
              <input
                type="text"
                value={shabaNumber ?? ''}
                onChange={(e) => setShabaNumber(e.target.value)}
                dir="ltr"
                maxLength={24}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">فعال</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
          >{busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ایجاد')}</button>
        </div>
      </form>
    </div>
  );
}