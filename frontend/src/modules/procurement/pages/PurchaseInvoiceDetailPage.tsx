import { PR_UNIT_LABELS, PRItemUnit } from '@/types/procurement';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RefreshCw, Wallet, FileText, Banknote, CreditCard, Building2, Receipt, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import {
  purchaseInvoicesApi, supplierPaymentsApi,
  type PurchaseInvoice, type PIStatus, type PayMethod, type BankRef,
} from '../services/purchase-invoices.api';
import SignatureBlock from '@/components/SignatureBlock';

const fmt = (n: number | string | undefined) =>
  new Intl.NumberFormat('fa-IR').format(Number(n ?? 0));

const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const toISO = (d: string) => d ? new Date(d).toISOString() : '';

const STATUS_LABEL: Record<PIStatus, string> = {
  DRAFT: 'پیش‌نویس',
  APPROVED: 'تأییدشده',
  PARTIALLY_PAID: 'پرداخت جزئی',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغو شده',
};
const STATUS_CLASS: Record<PIStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  APPROVED: 'bg-sky-50 text-sky-700',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

export default function PurchaseInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inv, setInv] = useState<PurchaseInvoice | null>(null);
  const [banks, setBanks] = useState<BankRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [invRes, banksRes] = await Promise.all([
        purchaseInvoicesApi.get(id),
        api.get<BankRef[]>('/bank-accounts').then((r) => r.data).catch(() => []),
      ]);
      setInv(invRes);
      setBanks(banksRes);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load();   }, [id]);

  const approve = async () => {
    if (!id) return;
    if (!confirm('سند حسابداری فاکتور ثبت شود؟')) return;
    setBusy(true);
    try {
      await purchaseInvoicesApi.approve(id);
      toast.success('سند حسابداری ثبت شد');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally { setBusy(false); }
  };

  const pay = async (payload: { amount: number; method: PayMethod; bankAccountId?: string; reference?: string }) => {
    if (!id) return;
    setBusy(true);
    try {
      await supplierPaymentsApi.pay({
        invoiceId: id,
        method: payload.method,
        bankAccountId: payload.bankAccountId ?? null,
        amount: payload.amount,
        paymentDate: toISO(new Date().toISOString()),
        reference: payload.reference ?? null,
      });
      toast.success('پرداخت ثبت شد');
      setShowPay(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا');
    } finally { setBusy(false); }
  };

  if (!id) return <div className="p-6">شناسه نامعتبر</div>;
  if (loading && !inv) return <div className="p-6 text-center text-slate-400">در حال بارگذاری...</div>;
  if (!inv) return <div className="p-6 text-center text-slate-400">فاکتور پیدا نشد</div>;

  const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
  const canApprove = inv.status === 'DRAFT';
  const canPay = (inv.status === 'APPROVED' || inv.status === 'PARTIALLY_PAID') && remaining > 0;

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/procurement/invoices" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ArrowRight size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{inv.code}</h1>
              <div className="text-xs text-slate-500 mt-0.5">
                شماره: <span className="font-mono">{inv.invoiceNumber}</span>
                <span className="mx-2">•</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_CLASS[inv.status]}`}>
                  {STATUS_LABEL[inv.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {inv.status === 'DRAFT' && (
            <button onClick={() => navigate('/procurement/invoices/' + inv.id + '/edit')} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50">
              <Edit size={16} /> ویرایش
            </button>
          )}
          <AdminDeleteButton endpoint="/purchase-invoices" id={inv.id} itemLabel={(inv as any).code} onSuccess={() => navigate('/procurement/invoices')} />
          {canApprove && (
            <button onClick={approve} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
              <CheckCircle2 size={16} /> تأیید و ثبت سند
            </button>
          )}
          {canPay && (
            <button onClick={() => setShowPay(true)} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50">
              <Wallet size={16} /> ثبت پرداخت
            </button>
          )}
        </div>
      </div>

      {/* Header info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <Card label="تأمین‌کننده" value={inv.supplier ? `${inv.supplier.code} — ${inv.supplier.name}` : '—'} icon={<Building2 size={14} />} />
        <Card label="پروژه" value={inv.project ? `${inv.project.code} — ${inv.project.name}` : '— عمومی —'} icon={<Receipt size={14} />} />
        <Card label="تاریخ فاکتور" value={fromISO(inv.invoiceDate)} />
        <Card label="سررسید" value={inv.dueDate ? fromISO(inv.dueDate) : '—'} />
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Total label="جمع" value={inv.subtotal} tone="slate" />
        <Total label="تخفیف" value={inv.discountAmount} tone="rose" />
        <Total label="مالیات" value={inv.taxAmount} tone="amber" />
        <Total label="مبلغ کل" value={inv.totalAmount} tone="emerald" />
        <Total label="مانده" value={remaining} tone={remaining > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* Items */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-sm text-slate-700">
          اقلام فاکتور ({inv.items?.length ?? 0})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-center px-2 py-2 font-medium w-10">#</th>
              <th className="text-right px-3 py-2 font-medium">شرح</th>
              <th className="text-right px-2 py-2 font-medium w-24">مقدار</th>
              <th className="text-right px-2 py-2 font-medium w-20">واحد</th>
              <th className="text-right px-2 py-2 font-medium w-32">قیمت واحد</th>
              <th className="text-right px-2 py-2 font-medium w-32">جمع</th>
              <th className="text-right px-3 py-2 font-medium w-40">حساب</th>
            </tr>
          </thead>
          <tbody>
            {(inv.items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-slate-100">
                <td className="text-center text-xs text-slate-500 px-2 py-2">{it.rowNumber}</td>
                <td className="px-3 py-2 text-slate-800">{it.description}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{Number(it.quantity)}</td>
                <td className="px-2 py-2 text-right text-xs text-slate-600" dir="ltr">{PR_UNIT_LABELS[it.unit as PRItemUnit] || it.unit}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{fmt(it.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-mono text-xs font-bold">{fmt(it.totalPrice)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {it.account ? `${it.account.code} — ${it.account.name}` : <span className="text-slate-400">از mapping</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payments */}
      {inv.payments && inv.payments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-100 font-bold text-sm text-slate-700">
            پرداخت‌ها ({inv.payments.length})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-3 py-2 font-medium w-28">کد</th>
                <th className="text-center px-3 py-2 font-medium w-24">تاریخ</th>
                <th className="text-right px-3 py-2 font-medium w-32">روش</th>
                <th className="text-right px-3 py-2 font-medium">حساب بانکی/مرجع</th>
                <th className="text-left px-3 py-2 font-medium w-32">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.code}</td>
                  <td className="px-3 py-2 text-center text-xs text-slate-600">{fromISO(p.paymentDate)}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.method === 'BANK_TRANSFER' && <span className="inline-flex items-center gap-1"><CreditCard size={12} /> بانکی</span>}
                    {p.method === 'CASH' && <span className="inline-flex items-center gap-1"><Banknote size={12} /> نقدی</span>}
                    {p.method !== 'BANK_TRANSFER' && p.method !== 'CASH' && p.method}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {p.bankAccount?.name ?? p.reference ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-left font-mono text-xs font-bold text-emerald-700">{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Journal Entry */}
      {inv.journalEntry && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">سند حسابداری</div>
              <Link to={`/accounting/journals/${inv.journalEntry.id}`}
                className="font-mono font-bold text-cyan-700 hover:underline">
                {inv.journalEntry.code}
              </Link>
            </div>
            <div className="text-xs text-slate-500">
              <span className={`inline-block px-2 py-0.5 rounded-full ${inv.journalEntry.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {inv.journalEntry.status === 'POSTED' ? 'ثبت‌شده' : inv.journalEntry.status}
              </span>
            </div>
          </div>
        </div>
      )}

      <SignatureBlock slots={[
        { title: 'تهیه‌کننده', type: 'current-user', caption: 'نام و امضا' },
        { title: 'تأمین‌کننده', type: 'empty', caption: 'نام و امضا' },
        { title: 'مهر شرکت', type: 'company-stamp', caption: 'مهر و امضا' },
      ]} />

      {showPay && (
        <PayModal
          invoice={inv}
          banks={banks}
          remaining={remaining}
          busy={busy}
          onCancel={() => setShowPay(false)}
          onSubmit={pay}
        />
      )}
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">{icon}{label}</div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function Total({ label, value, tone }: {
  label: string; value: number | string; tone: 'slate'|'rose'|'amber'|'emerald';
}) {
  const c = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c}`}>
      <div className="text-xs opacity-80 mb-1">{label}</div>
      <div className="text-base font-bold font-mono">{fmt(value)}</div>
    </div>
  );
}

function PayModal({
  invoice, banks, remaining, busy, onCancel, onSubmit,
}: {
  invoice: PurchaseInvoice;
  banks: BankRef[];
  remaining: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (p: { amount: number; method: PayMethod; bankAccountId?: string; reference?: string }) => void;
}) {
  const [amount, setAmount] = useState(String(Math.round(remaining)));
  const [method, setMethod] = useState<PayMethod>(banks.length ? 'BANK_TRANSFER' : 'CASH');
  const [bankAccountId, setBankAccountId] = useState(banks[0]?.id ?? '');
  const [reference, setReference] = useState('');

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('مبلغ نامعتبر'); return; }
    if (amt > remaining + 0.01) { toast.error('مبلغ بیش از مانده'); return; }
    if (method === 'BANK_TRANSFER' && !bankAccountId) { toast.error('حساب بانکی الزامی'); return; }
    onSubmit({ amount: amt, method, bankAccountId: method === 'BANK_TRANSFER' ? bankAccountId : undefined, reference });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-1">ثبت پرداخت به تأمین‌کننده</h3>
        <div className="text-xs text-slate-500 mb-4">
          فاکتور {invoice.code} — مانده: <span className="font-mono font-bold">{fmt(remaining)}</span> ریال
        </div>

        <label className="block text-xs font-medium text-slate-600 mb-1">مبلغ پرداخت (ریال)</label>
        <input type="text" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} dir="ltr"
          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg mb-3" />

        <label className="block text-xs font-medium text-slate-600 mb-1">روش پرداخت</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3">
          <option value="BANK_TRANSFER">انتقال بانکی</option>
          <option value="CASH">نقدی</option>
        </select>

        {method === 'BANK_TRANSFER' && (
          <>
            <label className="block text-xs font-medium text-slate-600 mb-1">حساب بانکی</label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3">
              <option value="">— انتخاب —</option>
              {banks.filter((b) => b.isActive).map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </>
        )}

        <label className="block text-xs font-medium text-slate-600 mb-1">مرجع (اختیاری)</label>
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
          maxLength={128}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4" />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50">
            {busy ? '...' : 'ثبت پرداخت'}
          </button>
        </div>
      </div>
    </div>
  );
}