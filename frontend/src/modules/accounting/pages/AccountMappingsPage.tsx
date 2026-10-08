import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  mappingsApi,
  type AccountMapping,
  type AccountMappingInput,
  type PostableAccount,
} from '../services/mappings.api';

// ────────────────────────────────────────────────────────────
export default function AccountMappingsPage() {
  const [items, setItems] = useState<AccountMapping[]>([]);
  const [accounts, setAccounts] = useState<PostableAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AccountMapping | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AccountMapping | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        mappingsApi.list(),
        mappingsApi.postableAccounts().catch(() => [] as PostableAccount[]),
      ]);
      setItems(m);
      setAccounts(a);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری نگاشت‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter(
      (m) =>
        m.code.toLowerCase().includes(s) ||
        m.title.toLowerCase().includes(s) ||
        (m.debitAccount?.code ?? '').toLowerCase().includes(s) ||
        (m.creditAccount?.code ?? '').toLowerCase().includes(s),
    );
  }, [items, search]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (m: AccountMapping) => { setEditing(m); setShowForm(true); };

  const handleSubmit = async (payload: AccountMappingInput) => {
    setBusy(true);
    try {
      if (editing) {
        await mappingsApi.update(editing.id, payload);
        toast.success('نگاشت به‌روزرسانی شد');
      } else {
        await mappingsApi.create(payload);
        toast.success('نگاشت ایجاد شد');
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await mappingsApi.remove(deleteTarget.id);
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Link2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">نگاشت حساب‌های خودکار</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              قواعد ثبت سند خودکار برای رویدادهای سیستم
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Plus size={16} />
            نگاشت جدید
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کد، عنوان، حساب..."
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3 font-medium">کد</th>
              <th className="text-right px-4 py-3 font-medium">عنوان</th>
              <th className="text-right px-4 py-3 font-medium">حساب بدهکار</th>
              <th className="text-right px-4 py-3 font-medium">حساب بستانکار</th>
              <th className="text-center px-4 py-3 font-medium">وضعیت</th>
              <th className="text-center px-4 py-3 font-medium w-24">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>
            )}
            {!loading && filtered.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.code}</td>
                <td className="px-4 py-3 text-slate-800">{m.title}</td>
                <td className="px-4 py-3 text-slate-700">
                  {m.debitAccount ? (
                    <span><span className="font-mono text-xs text-slate-500">{m.debitAccount.code}</span> — {m.debitAccount.name}</span>
                  ) : <span className="text-rose-500 text-xs">تعریف نشده</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {m.creditAccount ? (
                    <span><span className="font-mono text-xs text-slate-500">{m.creditAccount.code}</span> — {m.creditAccount.name}</span>
                  ) : <span className="text-rose-500 text-xs">تعریف نشده</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {m.isActive ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">فعال</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">غیرفعال</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                      title="ویرایش"
                    ><Pencil size={14} /></button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                      title="حذف"
                    ><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MappingFormModal
          editing={editing}
          accounts={accounts}
          busy={busy}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">حذف نگاشت</h3>
            <p className="text-sm text-slate-600 mb-4">
              آیا از حذف <span className="font-mono">{deleteTarget.code}</span> مطمئن هستید؟
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

// ────────────────────────────────────────────────────────────
function MappingFormModal({
  editing, accounts, busy, onCancel, onSubmit,
}: {
  editing: AccountMapping | null;
  accounts: PostableAccount[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: AccountMappingInput) => void;
}) {
  const [code, setCode] = useState(editing?.code ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [debitAccountId, setDebitAccountId] = useState(editing?.debitAccountId ?? '');
  const [creditAccountId, setCreditAccountId] = useState(editing?.creditAccountId ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      toast.error('کد و عنوان الزامی است');
      return;
    }
    onSubmit({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || null,
      debitAccountId: debitAccountId || null,
      creditAccountId: creditAccountId || null,
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
            {editing ? 'ویرایش نگاشت' : 'نگاشت جدید'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">کد نگاشت *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!!editing}
              placeholder="مثلاً: SALE_CONTRACT_CASH"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            />
            {editing && <p className="text-[11px] text-slate-400 mt-1">کد پس از ایجاد قابل تغییر نیست</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">عنوان *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان توصیفی"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">حساب بدهکار</label>
            <select
              value={debitAccountId ?? ''}
              onChange={(e) => setDebitAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— انتخاب کنید —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">حساب بستانکار</label>
            <select
              value={creditAccountId ?? ''}
              onChange={(e) => setCreditAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— انتخاب کنید —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
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
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >{busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ایجاد')}</button>
        </div>
      </form>
    </div>
  );
}