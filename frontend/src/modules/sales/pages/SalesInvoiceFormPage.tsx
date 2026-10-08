import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import {
  salesInvoicesApi, type CreateSIInput, type SIItemInput,
  type SalesCustomerRef, type ProjectRef,
} from '../services/sales-invoices.api';

const toISO = (d: string) => d ? new Date(d).toISOString() : '';
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function SalesInvoiceFormPage() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState<SalesCustomerRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [busy, setBusy] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(fromISO(new Date().toISOString()));
  const [dueDate, setDueDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taxPercent, setTaxPercent] = useState('10');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SIItemInput[]>([
    { rowNumber: 1, description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0, totalPrice: 0 },
  ]);

  useEffect(() => {
    Promise.all([
      salesInvoicesApi.customers().catch(() => []),
      api.get<ProjectRef[]>('/projects').then((r) => r.data).catch(() => []),
    ]).then(([cs, prs]) => { setCustomers(cs); setProjects(prs); });
  }, []);

  const totals = useMemo(() => {
    const sub = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
    const disc = Number(discountAmount) || 0;
    const base = Math.max(sub - disc, 0);
    const tax = Math.round(base * ((Number(taxPercent) || 0) / 100) * 100) / 100;
    return { sub, disc, tax, total: base + tax };
  }, [items, taxPercent, discountAmount]);

  const updateItem = (idx: number, patch: Partial<SIItemInput>) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      if (patch.quantity != null || patch.unitPrice != null) {
        merged.totalPrice = Number(merged.quantity ?? 0) * Number(merged.unitPrice ?? 0);
      }
      return merged;
    }));
  };
  const addItem = () => setItems((p) => [...p, { rowNumber: p.length + 1, description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0, totalPrice: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) { toast.error('شماره فاکتور الزامی است'); return; }
    if (!customerId) { toast.error('مشتری الزامی است'); return; }
    if (!items.length || items.some((it) => !it.description.trim())) {
      toast.error('همه ردیف‌ها شرح دارند؟'); return;
    }
    setBusy(true);
    try {
      const payload: CreateSIInput = {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: toISO(invoiceDate),
        dueDate: dueDate ? toISO(dueDate) : null,
        customerId,
        projectId: projectId || null,
        taxPercent: Number(taxPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
        notes: notes.trim() || null,
        items: items.map((it, i) => ({
          rowNumber: i + 1,
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit: it.unit ?? null,
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice) || Number(it.quantity) * Number(it.unitPrice),
        })),
      };
      const res = await salesInvoicesApi.create(payload);
      toast.success('فاکتور ثبت شد');
      nav('/sales/invoices/' + res.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در ذخیره');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/sales/invoices" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
          <ArrowRight size={16} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">فاکتور فروش جدید</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">اطلاعات فاکتور</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">شماره فاکتور *</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                maxLength={64} dir="ltr"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">تاریخ فاکتور *</label>
              <PersianDatePicker value={invoiceDate} onChange={setInvoiceDate} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">سررسید</label>
              <PersianDatePicker value={dueDate} onChange={setDueDate} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">مشتری *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="">— انتخاب کنید —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}{c.mobilePhone ? ` (${c.mobilePhone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">پروژه</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">مالیات (%)</label>
                <input type="text" inputMode="numeric" value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value.replace(/[^\d.]/g, ''))} dir="ltr"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">تخفیف</label>
                <input type="text" inputMode="numeric" value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value.replace(/[^\d]/g, ''))} dir="ltr"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">اقلام فاکتور</h3>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs">
              <Plus size={14} /> ردیف
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-center px-2 py-2 font-medium w-10">#</th>
                <th className="text-right px-3 py-2 font-medium">شرح *</th>
                <th className="text-right px-2 py-2 font-medium w-24">مقدار</th>
                <th className="text-right px-2 py-2 font-medium w-24">واحد</th>
                <th className="text-right px-2 py-2 font-medium w-32">قیمت واحد</th>
                <th className="text-right px-2 py-2 font-medium w-32">جمع</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="text-center text-xs text-slate-500 px-2 py-2">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input type="text" value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" inputMode="decimal" value={String(it.quantity)}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-sm font-mono text-left border border-slate-200 rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={it.unit ?? ''}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" inputMode="numeric" value={String(it.unitPrice)}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value.replace(/[^\d]/g, '')) })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-sm font-mono text-left border border-slate-200 rounded" />
                  </td>
                  <td className="px-2 py-2 text-left font-mono text-xs font-bold text-slate-800">
                    {new Intl.NumberFormat('fa-IR').format(Number(it.totalPrice ?? 0))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="p-1 rounded hover:bg-rose-50 text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Total label="جمع" value={totals.sub} tone="slate" />
            <Total label="تخفیف" value={totals.disc} tone="rose" />
            <Total label="مالیات" value={totals.tax} tone="amber" />
            <Total label="مبلغ نهایی" value={totals.total} tone="emerald" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/sales/invoices" className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">
            <X size={14} className="inline ml-1" /> انصراف
          </Link>
          <button type="submit" disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
            <Save size={16} /> {busy ? 'در حال ذخیره...' : 'ثبت فاکتور'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: number; tone: 'slate'|'rose'|'amber'|'emerald' }) {
  const c = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${c}`}>
      <div className="text-xs opacity-80 mb-1">{label}</div>
      <div className="text-base font-bold font-mono">{new Intl.NumberFormat('fa-IR').format(value)}</div>
    </div>
  );
}