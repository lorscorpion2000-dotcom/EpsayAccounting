import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, RefreshCw, Building2, XCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import {
  fixedAssetsApi,
  type FixedAsset,
  type FixedAssetInput,
  type FixedAssetStatus,
  type DepreciationMethod,
} from '../services/fixed-assets.api';
import { accountsLookupApi, type AccountOption } from '../services/accounts-lookup.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AdminDeleteButton from '@/components/AdminDeleteButton';
interface ProjectRef { id: string; code: string; name: string; }
interface CostCenterRef { id: string; code: string; name: string; }

const STATUS_LABEL: Record<FixedAssetStatus, string> = {
  ACTIVE: 'فعال',
  FULLY_DEPRECIATED: 'کاملاً مستهلک',
  DISPOSED: 'کنارگذاشته',
};
const STATUS_CLASS: Record<FixedAssetStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  FULLY_DEPRECIATED: 'bg-sky-50 text-sky-700',
  DISPOSED: 'bg-slate-100 text-slate-500',
};
const METHOD_LABEL: Record<DepreciationMethod, string> = {
  STRAIGHT_LINE: 'خط مستقیم',
  DECLINING_BALANCE: 'نزولی',
};

const fmt = (n: number | string | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

export default function FixedAssetsPage() {
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [viewing, setViewing] = useState<FixedAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedAsset | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<FixedAsset | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, accs, prjs, ccs] = await Promise.all([
        fixedAssetsApi.list(filterStatus ? { status: filterStatus } : undefined),
        accountsLookupApi.postable().catch(() => [] as AccountOption[]),
        api.get<ProjectRef[]>('/projects').then((r) => r.data).catch(() => [] as ProjectRef[]),
        api.get<CostCenterRef[]>('/cost-centers').then((r) => r.data).catch(() => [] as CostCenterRef[]),
      ]);
      setItems(list);
      setAccounts(accs);
      setProjects(prjs);
      setCostCenters(ccs);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, [filterStatus]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter((a) =>
      [a.code, a.name, a.assetAccount?.name, a.project?.name]
        .filter(Boolean).join(' ').toLowerCase().includes(s)
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const active = items.filter((a) => a.status === 'ACTIVE');
    return {
      count: items.length,
      activeCount: active.length,
      totalCost: items.reduce((s, a) => s + Number(a.acquisitionCost || 0), 0),
      totalBookValue: items.reduce((s, a) => s + Number(a.bookValue || 0), 0),
    };
  }, [items]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (a: FixedAsset) => { setEditing(a); setShowForm(true); };

  const handleSubmit = async (payload: FixedAssetInput) => {
    setBusy(true);
    try {
      if (editing) {
        await fixedAssetsApi.update(editing.id, payload);
        toast.success('دارایی به‌روزرسانی شد');
      } else {
        await fixedAssetsApi.create(payload);
        toast.success('دارایی ثبت شد');
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
      await fixedAssetsApi.remove(deleteTarget.id);
      toast.success('به سطل زباله منتقل شد — قابل بازیابی توسط مدیر');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در حذف');
    } finally {
      setBusy(false);
    }
  };

  const confirmDispose = async (date: string, proceeds: number) => {
    if (!disposeTarget) return;
    setBusy(true);
    try {
      await fixedAssetsApi.dispose(disposeTarget.id, {
        disposalDate: toISO(date),
        disposalProceeds: proceeds,
      });
      toast.success('دارایی کنار گذاشته شد');
      setDisposeTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">دارایی‌های ثابت</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت دارایی ثابت، استهلاک ماهانه و کنارگذاری
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
          >
            <Plus size={16} />
            دارایی جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Stat title="تعداد کل" value={String(stats.count)} sub="دارایی ثبت‌شده" tone="slate" />
        <Stat title="فعال" value={String(stats.activeCount)} sub="در حال استهلاک" tone="emerald" />
        <Stat title="بهای تملک (جمع)" value={fmt(stats.totalCost)} sub="ریال" tone="amber" />
        <Stat title="ارزش دفتری (جمع)" value={fmt(stats.totalBookValue)} sub="ریال" tone="sky" />
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کد، نام، حساب..."
          className="md:col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="FULLY_DEPRECIATED">کاملاً مستهلک</option>
          <option value="DISPOSED">کنارگذاشته</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-3 py-3 font-medium w-28">کد</th>
              <th className="text-right px-3 py-3 font-medium">نام</th>
              <th className="text-right px-3 py-3 font-medium w-40">حساب دارایی</th>
              <th className="text-center px-3 py-3 font-medium w-24">تاریخ تملک</th>
              <th className="text-left px-3 py-3 font-medium w-32">بهای تملک</th>
              <th className="text-left px-3 py-3 font-medium w-32">ارزش دفتری</th>
              <th className="text-center px-3 py-3 font-medium w-28">وضعیت</th>
              <th className="text-center px-3 py-3 font-medium w-36">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>
            )}
            {!loading && filtered.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{a.code}</td>
                <td className="px-3 py-2 text-slate-800 cursor-pointer" onClick={() => setViewing(a)}>
                  {a.name}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {a.assetAccount ? `${a.assetAccount.code} — ${a.assetAccount.name}` : '—'}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-600">
                  {fromISO(a.acquisitionDate)}
                </td>
                <td className="px-3 py-2 text-left font-mono text-xs text-slate-800">
                  {fmt(a.acquisitionCost)}
                </td>
                <td className="px-3 py-2 text-left font-mono text-xs text-slate-800">
                  {fmt(a.bookValue)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/fixed-assets"
                          id={a.id}
                          itemLabel={(a as any).code || (a as any).name || (a as any).title || (a as any).fullName || (a as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        {a.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => setDisposeTarget(a)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="کنارگذاری"
                        >
                          <XCircle size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="ویرایش"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                          title="حذف (به سطل زباله)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {a.status !== 'ACTIVE' && (
                      <button
                        onClick={() => setViewing(a)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                        title="مشاهده"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <FAFormModal
          editing={editing}
          accounts={accounts}
          projects={projects}
          costCenters={costCenters}
          busy={busy}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {viewing && (
        <ViewModal asset={viewing} onClose={() => setViewing(null)} />
      )}

      {disposeTarget && (
        <DisposeModal
          asset={disposeTarget}
          busy={busy}
          onCancel={() => setDisposeTarget(null)}
          onConfirm={confirmDispose}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="انتقال به سطل زباله"
          message={`دارایی «${deleteTarget.name}» (${deleteTarget.code}) به سطل زباله منتقل می‌شود. تا بازیابی توسط مدیر، در لیست نمایش داده نمی‌شود.`}
          danger
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function Stat({ title, value, sub, tone }: { title: string; value: string; sub: string; tone: 'slate'|'emerald'|'amber'|'sky' }) {
  const c = {
    slate:   'bg-slate-50 text-slate-700 border-slate-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    sky:     'bg-sky-50 text-sky-700 border-sky-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${c}`}>
      <div className="text-xs mb-1 opacity-80">{title}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}

function FAFormModal({
  editing, accounts, projects, costCenters, busy, onCancel, onSubmit,
}: {
  editing: FixedAsset | null;
  accounts: AccountOption[];
  projects: ProjectRef[];
  costCenters: CostCenterRef[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: FixedAssetInput) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [acquisitionDate, setAcquisitionDate] = useState(
    fromISO(editing?.acquisitionDate) || fromISO(new Date().toISOString())
  );
  const [acquisitionCost, setAcqCost] = useState(editing ? String(editing.acquisitionCost) : '');
  const [residualValue, setResidual] = useState(editing ? String(editing.residualValue) : '0');
  const [usefulLifeMonths, setLife] = useState(editing ? String(editing.usefulLifeMonths) : '60');
  const [depreciationMethod, setMethod] = useState<DepreciationMethod>(editing?.depreciationMethod ?? 'STRAIGHT_LINE');
  const [assetAccountId, setAssetAccount] = useState(editing?.assetAccountId ?? '');
  const [depreciationAccountId, setDeprAccount] = useState(editing?.depreciationAccountId ?? '');
  const [accumulatedDeprecAccountId, setAccum] = useState(editing?.accumulatedDeprecAccountId ?? '');
  const [counterAccountId, setCounter] = useState('');
  const [projectId, setProject] = useState(editing?.projectId ?? '');
  const [costCenterId, setCC] = useState(editing?.costCenterId ?? '');

  const monthly = useMemo(() => {
    const c = Number(acquisitionCost);
    const r = Number(residualValue) || 0;
    const l = Number(usefulLifeMonths);
    if (!c || !l || c <= r) return 0;
    return Math.round(((c - r) / l) * 100) / 100;
  }, [acquisitionCost, residualValue, usefulLifeMonths]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())            { toast.error('نام الزامی است'); return; }
    if (!acquisitionDate)        { toast.error('تاریخ تملک الزامی است'); return; }
    if (!(Number(acquisitionCost) > 0)) { toast.error('بهای تملک باید مثبت باشد'); return; }
    if (!(Number(usefulLifeMonths) > 0)) { toast.error('عمر مفید باید مثبت باشد'); return; }
    if (!assetAccountId)         { toast.error('حساب دارایی الزامی است'); return; }
    if (!depreciationAccountId)  { toast.error('حساب هزینه استهلاک الزامی است'); return; }
    if (!accumulatedDeprecAccountId) { toast.error('حساب استهلاک انباشته الزامی است'); return; }

    const payload: FixedAssetInput = {
      name: name.trim(),
      description: description.trim() || null,
      acquisitionDate: toISO(acquisitionDate),
      acquisitionCost: Number(acquisitionCost),
      residualValue: Number(residualValue) || 0,
      usefulLifeMonths: Number(usefulLifeMonths),
      depreciationMethod,
      assetAccountId,
      depreciationAccountId,
      accumulatedDeprecAccountId,
      counterAccountId: counterAccountId || null,
      projectId: projectId || null,
      costCenterId: costCenterId || null,
    };
    onSubmit(payload);
  };

  const accOptions = (predicate?: (a: AccountOption) => boolean) => {
    const list = predicate ? accounts.filter(predicate) : accounts;
    return list.map((a) => (
      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        className="bg-white rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            {editing ? `ویرایش دارایی ${editing.code}` : 'ثبت دارایی ثابت جدید'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">نام دارایی *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                placeholder="مثلاً: لپ‌تاپ Dell Latitude 5540"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ تملک *</label>
              <PersianDatePicker value={acquisitionDate} onChange={setAcquisitionDate} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">بهای تملک (ریال) *</label>
              <input
                type="text"
                inputMode="numeric"
                value={acquisitionCost}
                onChange={(e) => setAcqCost(e.target.value.replace(/[^\d]/g, ''))}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ارزش اسقاط (ریال)</label>
              <input
                type="text"
                inputMode="numeric"
                value={residualValue}
                onChange={(e) => setResidual(e.target.value.replace(/[^\d]/g, ''))}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">عمر مفید (ماه) *</label>
              <input
                type="text"
                inputMode="numeric"
                value={usefulLifeMonths}
                onChange={(e) => setLife(e.target.value.replace(/[^\d]/g, ''))}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">روش استهلاک</label>
              <select
                value={depreciationMethod}
                onChange={(e) => setMethod(e.target.value as DepreciationMethod)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="STRAIGHT_LINE">خط مستقیم</option>
                <option value="DECLINING_BALANCE">نزولی (آینده)</option>
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <div className="text-xs text-amber-700">استهلاک ماهانه (محاسبه‌شده)</div>
              <div className="text-base font-bold font-mono text-amber-900 mt-0.5">
                {fmt(monthly)} ریال
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-bold text-slate-700 mb-3">حساب‌های مرتبط</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">حساب دارایی *</label>
                <select
                  value={assetAccountId}
                  onChange={(e) => setAssetAccount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">— انتخاب کنید —</option>
                  {accOptions((a) => a.code.startsWith('1.2.1'))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">هزینه استهلاک *</label>
                <select
                  value={depreciationAccountId}
                  onChange={(e) => setDeprAccount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">— انتخاب کنید —</option>
                  {accOptions((a) => a.code.startsWith('7.'))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">استهلاک انباشته *</label>
                <select
                  value={accumulatedDeprecAccountId}
                  onChange={(e) => setAccum(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">— انتخاب کنید —</option>
                  {accOptions((a) => a.code.startsWith('1.2.2'))}
                </select>
              </div>
            </div>
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                حساب پرداخت (برای ثبت سند تملک — اختیاری)
              </label>
              <select
                value={counterAccountId}
                onChange={(e) => setCounter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">— بدون ثبت سند تملک —</option>
                {accOptions()}
              </select>
              <div className="text-xs text-slate-400 mt-1">
                اگر خالی باشد، فقط دارایی ثبت می‌شود و سند حسابداری تملک ثبت نخواهد شد.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">پروژه (اختیاری)</label>
              <select
                value={projectId ?? ''}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">مرکز هزینه (اختیاری)</label>
              <select
                value={costCenterId ?? ''}
                onChange={(e) => setCC(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">— عمومی —</option>
                {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
          >{busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ثبت دارایی')}</button>
        </div>
      </form>
    </div>
  );
}

function ViewModal({ asset, onClose }: { asset: FixedAsset; onClose: () => void }) {
  const [detail, setDetail] = useState<FixedAsset | null>(null);
  useEffect(() => {
    fixedAssetsApi.get(asset.id).then(setDetail).catch(() => {});
  }, [asset.id]);
  const a = detail ?? asset;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{a.name} <span className="text-xs font-mono text-slate-500">({a.code})</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <Row label="وضعیت">{STATUS_LABEL[a.status]}</Row>
          <Row label="روش استهلاک">{METHOD_LABEL[a.depreciationMethod]}</Row>
          <Row label="تاریخ تملک">{fromISO(a.acquisitionDate)}</Row>
          <Row label="بهای تملک">{fmt(a.acquisitionCost)} ریال</Row>
          <Row label="ارزش اسقاط">{fmt(a.residualValue)} ریال</Row>
          <Row label="عمر مفید">{a.usefulLifeMonths} ماه</Row>
          <Row label="استهلاک ماهانه">{fmt(a.monthlyDepreciation)} ریال</Row>
          <Row label="استهلاک انباشته">{fmt(a.accumulatedDepreciation)} ریال</Row>
          <Row label="ارزش دفتری">{fmt(a.bookValue)} ریال</Row>
          {a.assetAccount && <Row label="حساب دارایی">{a.assetAccount.code} — {a.assetAccount.name}</Row>}
          {a.depreciationAccount && <Row label="هزینه استهلاک">{a.depreciationAccount.code} — {a.depreciationAccount.name}</Row>}
          {a.accumulatedDeprecAccount && <Row label="استهلاک انباشته">{a.accumulatedDeprecAccount.code} — {a.accumulatedDeprecAccount.name}</Row>}
          {a.project && <Row label="پروژه">{a.project.code} — {a.project.name}</Row>}
          {a.costCenter && <Row label="مرکز هزینه">{a.costCenter.code} — {a.costCenter.name}</Row>}
        </div>
        {a.depreciationEntries && a.depreciationEntries.length > 0 && (
          <div className="px-6 pb-6">
            <div className="text-xs font-bold text-slate-700 mb-2 mt-2">سابقه استهلاک</div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right px-3 py-2">کد</th>
                    <th className="text-center px-3 py-2">دوره</th>
                    <th className="text-left px-3 py-2">مبلغ</th>
                    <th className="text-left px-3 py-2">ارزش دفتری بعد</th>
                  </tr>
                </thead>
                <tbody>
                  {a.depreciationEntries.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono">{d.code}</td>
                      <td className="px-3 py-1.5 text-center">{d.periodYear}/{String(d.periodMonth).padStart(2, '0')}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(d.amount)}</td>
                      <td className="px-3 py-1.5 text-left font-mono">{fmt(d.bookValueAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="col-span-2 text-slate-800">{children}</div>
    </div>
  );
}

function DisposeModal({
  asset, busy, onCancel, onConfirm,
}: {
  asset: FixedAsset;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (date: string, proceeds: number) => void;
}) {
  const [date, setDate] = useState(fromISO(new Date().toISOString()));
  const [proceeds, setProceeds] = useState('0');
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-2">کنارگذاری دارایی</h3>
        <div className="text-xs text-slate-600 mb-4">
          {asset.name} <span className="font-mono">({asset.code})</span>
          <div className="mt-1">ارزش دفتری فعلی: <span className="font-mono">{fmt(asset.bookValue)}</span> ریال</div>
        </div>
        <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ کنارگذاری</label>
        <PersianDatePicker value={date} onChange={setDate} />
        <label className="block text-xs font-medium text-slate-600 mb-1">وجه دریافتی (ریال)</label>
        <input
          type="text"
          inputMode="numeric"
          value={proceeds}
          onChange={(e) => setProceeds(e.target.value.replace(/[^\d]/g, ''))}
          dir="ltr"
          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            onClick={() => onConfirm(date, Number(proceeds))}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50"
          >{busy ? '...' : 'کنارگذاری'}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, danger, busy, onCancel, onConfirm,
}: { title: string; message: string; danger?: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >{busy ? '...' : 'تأیید'}</button>
        </div>
      </div>
    </div>
  );
}