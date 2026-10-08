import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, ScrollText, CheckCircle2, Undo2, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import {
  chequesApi,
  type Cheque,
  type ChequeInput,
  type ChequeDirection,
  type ChequeStatus,
  type ChequeListQuery,
} from '../services/cheques.api';
import { bankAccountsApi, type BankAccount } from '../services/bank-accounts.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

interface PartnerRef { id: string; code: string; name: string; type?: string; }
interface ProjectRef { id: string; code: string; name: string; }

type ActionKind = 'pass' | 'return' | 'cancel';

const STATUS_LABEL: Record<ChequeStatus, string> = {
  PENDING:   'در جریان',
  PASSED:    'پاس شده',
  RETURNED:  'برگشتی',
  CANCELLED: 'ابطال شده',
};

const STATUS_CLASS: Record<ChequeStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  PASSED:    'bg-emerald-50 text-emerald-700',
  RETURNED:  'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const DIR_LABEL: Record<ChequeDirection, string> = {
  ISSUED:   'صادره',
  RECEIVED: 'دریافتی',
};

const DIR_CLASS: Record<ChequeDirection, string> = {
  ISSUED:   'bg-orange-50 text-orange-700',
  RECEIVED: 'bg-sky-50 text-sky-700',
};

function toISO(d: string): string {
  return d ? new Date(d).toISOString() : '';
}

function fromISO(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ChequesPage() {
  const [items, setItems] = useState<Cheque[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [partners, setPartners] = useState<PartnerRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [filter, setFilter] = useState<ChequeListQuery>({});
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cheque | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cheque | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ cheque: Cheque; kind: ActionKind } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, bs, ps, prjs] = await Promise.all([
        chequesApi.list(filter),
        bankAccountsApi.list().catch(() => [] as BankAccount[]),
        api.get<PartnerRef[]>('/partners', { params: { isActive: true } }).then((r) => r.data).catch(() => [] as PartnerRef[]),
        api.get<ProjectRef[]>('/projects').then((r) => r.data).catch(() => [] as ProjectRef[]),
      ]);
      setItems(list);
      setBanks(bs);
      setPartners(ps);
      setProjects(prjs);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter((c) => {
      const blob = [c.code, c.serial, c.partner?.name, c.bankAccount?.name]
        .filter(Boolean).join(' ').toLowerCase();
      return blob.includes(s);
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const pendingIssued   = items.filter((c) => c.direction === 'ISSUED'   && c.status === 'PENDING');
    const pendingReceived = items.filter((c) => c.direction === 'RECEIVED' && c.status === 'PENDING');
    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    const dueSoon = items.filter((c) => c.status === 'PENDING' && new Date(c.dueDate) <= soon);
    const sum = (arr: Cheque[]) => arr.reduce((a, c) => a + Number(c.amount || 0), 0);
    return {
      issuedCount: pendingIssued.length,   issuedSum: sum(pendingIssued),
      receivedCount: pendingReceived.length, receivedSum: sum(pendingReceived),
      dueSoonCount: dueSoon.length,
    };
  }, [items]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c: Cheque) => { setEditing(c); setShowForm(true); };

  const handleSubmit = async (payload: ChequeInput) => {
    setBusy(true);
    try {
      if (editing) {
        await chequesApi.update(editing.id, payload);
        toast.success('چک به‌روزرسانی شد');
      } else {
        await chequesApi.create(payload);
        toast.success('چک ثبت شد');
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

  const runAction = async (kind: ActionKind, note?: string) => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      const id = actionTarget.cheque.id;
      if (kind === 'pass')   await chequesApi.pass(id, note);
      if (kind === 'return') await chequesApi.return_(id, note);
      if (kind === 'cancel') await chequesApi.cancel(id, note);
      toast.success('انجام شد');
      setActionTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (force = false) => {
    if (!deleteTarget) return;
    setBusy(true);
    setForceError(null);
    try {
      await chequesApi.remove(deleteTarget.id, force);
      toast.success(force ? 'به‌طور کامل حذف شد' : 'حذف شد');
      setDeleteTarget(null);
      setForceConfirm(false);
      await load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'CHEQUE_HAS_REFS') {
        setForceError(err.message);
      } else {
        toast.error(err?.message ?? 'خطا در حذف');
      }
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <ScrollText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">چک‌ها</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت چک‌های صادره و دریافتی، وضعیت وصول و برگشت
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
          >
            <Plus size={16} />
            چک جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <StatCard title="چک‌های صادره در جریان" value={`${stats.issuedCount} فقره`} sub={`${fmt(stats.issuedSum)} ریال`} tone="orange" />
        <StatCard title="چک‌های دریافتی در جریان" value={`${stats.receivedCount} فقره`} sub={`${fmt(stats.receivedSum)} ریال`} tone="sky" />
        <StatCard title="سررسید تا ۷ روز آینده" value={`${stats.dueSoonCount} فقره`} sub="نیازمند پیگیری" tone="rose" />
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در کد، سریال، طرف حساب..."
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={filter.direction ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, direction: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه (صادره/دریافتی)</option>
          <option value="ISSUED">صادره</option>
          <option value="RECEIVED">دریافتی</option>
        </select>
        <select
          value={filter.status ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING">در جریان</option>
          <option value="PASSED">پاس شده</option>
          <option value="RETURNED">برگشتی</option>
          <option value="CANCELLED">ابطال شده</option>
        </select>
        <select
          value={filter.bankAccountId ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, bankAccountId: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه حساب‌ها</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={filter.partnerId ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, partnerId: e.target.value || undefined }))}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
        >
          <option value="">همه طرف‌حساب‌ها</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-3 py-3 font-medium w-28">کد</th>
              <th className="text-center px-3 py-3 font-medium w-20">نوع</th>
              <th className="text-right px-3 py-3 font-medium w-32">سریال</th>
              <th className="text-right px-3 py-3 font-medium">طرف حساب</th>
              <th className="text-right px-3 py-3 font-medium w-40">حساب بانکی</th>
              <th className="text-left px-3 py-3 font-medium w-32">مبلغ</th>
              <th className="text-center px-3 py-3 font-medium w-24">سررسید</th>
              <th className="text-center px-3 py-3 font-medium w-24">وضعیت</th>
              <th className="text-center px-3 py-3 font-medium w-40">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>
            )}
            {!loading && filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.code}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${DIR_CLASS[c.direction]}`}>
                    {DIR_LABEL[c.direction]}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{c.serial}</td>
                <td className="px-3 py-2 text-slate-800 text-xs">
                  {c.partner ? <>{c.partner.code} — {c.partner.name}</> : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600 text-xs">{c.bankAccount?.name ?? '—'}</td>
                <td className="px-3 py-2 text-left font-mono text-xs text-slate-800">{fmt(Number(c.amount))}</td>
                <td className="px-3 py-2 text-center text-xs text-slate-600">
                  {fromISO(c.dueDate)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    {c.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => setActionTarget({ cheque: c, kind: 'pass' })}
                          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"
                          title={c.direction === 'ISSUED' ? 'پاس شدن' : 'وصول'}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={() => setActionTarget({ cheque: c, kind: 'return' })}
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                          title="برگشتی"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          onClick={() => setActionTarget({ cheque: c, kind: 'cancel' })}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="ابطال"
                        >
                          <XCircle size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="ویرایش"
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                    {c.status === 'PENDING' && (
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                        title="حذف"
                      >
                        <Trash2 size={14} />
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
        <ChequeFormModal
          editing={editing}
          banks={banks}
          partners={partners}
          projects={projects}
          busy={busy}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {actionTarget && (
        <ActionModal
          cheque={actionTarget.cheque}
          kind={actionTarget.kind}
          busy={busy}
          onCancel={() => setActionTarget(null)}
          onConfirm={(note) => runAction(actionTarget.kind, note)}
        />
      )}

      {deleteTarget && !forceConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">حذف چک</h3>
            <p className="text-sm text-slate-600 mb-4">
              آیا از حذف <span className="font-mono">{deleteTarget.code}</span> مطمئن هستید؟
              <span className="block text-xs text-slate-500 mt-1">اگر چک در جریان (PENDING) نباشد، نیاز به دسترسی مدیر دارد.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
              <button
                onClick={() => confirmDelete(false)}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >{busy ? '...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}

      {forceError && deleteTarget && (
        <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="font-bold text-red-800 mb-2">حذف کامل چک (مدیر سیستم)</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line mb-4">{forceError}</p>
            <p className="text-xs text-slate-500 mb-4">با حذف کامل، تمام اسناد تعهدی/تسویه مرتبط نیز پاک می‌شود.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setForceConfirm(false); setForceError(null); setDeleteTarget(null); }} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
              <button onClick={() => confirmDelete(true)} disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-red-700 hover:bg-red-800 text-white disabled:opacity-50">{busy ? '...' : 'حذف کامل (خطرناک)'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, sub, tone }: { title: string; value: string; sub: string; tone: 'orange' | 'sky' | 'rose' }) {
  const toneCls = {
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    sky:    'bg-sky-50 text-sky-700 border-sky-100',
    rose:   'bg-rose-50 text-rose-700 border-rose-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-4 ${toneCls}`}>
      <div className="text-xs mb-1 opacity-80">{title}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}

function ChequeFormModal({
  editing, banks, partners, projects, busy, onCancel, onSubmit,
}: {
  editing: Cheque | null;
  banks: BankAccount[];
  partners: PartnerRef[];
  projects: ProjectRef[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: ChequeInput) => void;
}) {
  const [direction, setDirection] = useState<ChequeDirection>(editing?.direction ?? 'ISSUED');
  const [serial, setSerial] = useState(editing?.serial ?? '');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [issueDate, setIssueDate] = useState(fromISO(editing?.issueDate) || fromISO(new Date().toISOString()));
  const [dueDate, setDueDate] = useState(fromISO(editing?.dueDate));
  const [bankAccountId, setBankAccountId] = useState(editing?.bankAccountId ?? '');
  const [partnerId, setPartnerId] = useState(editing?.partnerId ?? '');
  const [projectId, setProjectId] = useState(editing?.projectId ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');

  const filteredPartners = useMemo(() => {
    if (direction === 'ISSUED') {
      const preferred = partners.filter((p) => ['CONTRACTOR', 'SUPPLIER', 'CONSULTANT'].includes(p.type ?? ''));
      return preferred.length ? preferred : partners;
    }
    const preferred = partners.filter((p) => ['CLIENT', 'CUSTOMER', 'PARTNER'].includes(p.type ?? ''));
    return preferred.length ? preferred : partners;
  }, [partners, direction]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) { toast.error('سریال چک الزامی است'); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('مبلغ باید عددی و بزرگ‌تر از صفر باشد'); return; }
    if (!issueDate) { toast.error('تاریخ صدور الزامی است'); return; }
    if (!dueDate)   { toast.error('تاریخ سررسید الزامی است'); return; }
    if (!partnerId) { toast.error('طرف حساب الزامی است'); return; }
    if (direction === 'ISSUED' && !bankAccountId) { toast.error('برای چک صادره، حساب بانکی الزامی است'); return; }

    const payload: any = {
      serial: serial.trim(),
      amount: amt,
      issueDate: toISO(issueDate),
      dueDate: toISO(dueDate),
      bankAccountId: bankAccountId || null,
      partnerId,
      projectId: projectId || null,
      description: description.trim() || null,
    };
    if (!editing) payload.direction = direction;
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            {editing ? `ویرایش چک ${editing.code}` : 'ثبت چک جدید'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">نوع چک *</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as ChequeDirection)}
                disabled={!!editing}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
              >
                <option value="ISSUED">صادره (پرداختی)</option>
                <option value="RECEIVED">دریافتی</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">سریال چک *</label>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                maxLength={64}
                dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">مبلغ (ریال) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              dir="ltr"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {amount && (
              <div className="text-xs text-slate-500 mt-1">
                {new Intl.NumberFormat('fa-IR').format(Number(amount))} ریال
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ صدور *</label>
              <PersianDatePicker value={issueDate} onChange={setIssueDate} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ سررسید *</label>
              <PersianDatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">طرف حساب *</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">— انتخاب کنید —</option>
              {filteredPartners.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}{p.type ? ` (${p.type})` : ''}</option>
              ))}
            </select>
            <div className="text-xs text-slate-400 mt-1">
              برای چک صادره معمولاً پیمانکار/تأمین‌کننده و برای دریافتی معمولاً مشتری.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              حساب بانکی {direction === 'ISSUED' ? '*' : '(اختیاری)'}
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">— انتخاب کنید —</option>
              {banks.filter((b) => b.isActive).map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">پروژه (اختیاری)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">— عمومی —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
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
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
          >{busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ثبت چک')}</button>
        </div>
      </form>
    </div>
  );
}

function ActionModal({
  cheque, kind, busy, onCancel, onConfirm,
}: {
  cheque: Cheque;
  kind: ActionKind;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState('');
  const meta: Record<ActionKind, { title: string; verb: string; tone: string }> = {
    pass:   { title: 'وصول / پاس شدن چک', verb: 'تأیید و ثبت', tone: 'bg-emerald-600 hover:bg-emerald-700' },
    return: { title: 'برگشت چک',           verb: 'ثبت برگشت',   tone: 'bg-rose-600 hover:bg-rose-700' },
    cancel: { title: 'ابطال چک',           verb: 'ابطال',       tone: 'bg-slate-600 hover:bg-slate-700' },
  };
  const m = meta[kind];
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-1">{m.title}</h3>
        <div className="text-sm text-slate-600 mb-4">
          چک <span className="font-mono">{cheque.code}</span> — سریال <span className="font-mono">{cheque.serial}</span>
          <div className="text-xs mt-1 text-slate-500">
            مبلغ: {new Intl.NumberFormat('fa-IR').format(Number(cheque.amount))} ریال
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-600 mb-1">توضیح (اختیاری)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="مثلاً شماره سند بانکی، علت برگشت..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            onClick={() => onConfirm(note.trim() || undefined)}
            disabled={busy}
            className={`px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50 ${m.tone}`}
          >{busy ? '...' : m.verb}</button>
        </div>
      </div>
    </div>
  );
}