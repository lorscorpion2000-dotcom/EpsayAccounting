import { useEffect, useMemo, useState } from 'react';
import UnitSelect from '@/components/UnitSelect';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { Save, X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import {
  purchaseInvoicesApi, type CreatePIInput, type PIItemInput,
  type ProjectRef, type PartnerRef,
} from '../services/purchase-invoices.api';

const toISO = (d: string) => d ? new Date(d).toISOString() : '';
const fromISO = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

interface POOption { id: string; code: string; supplierId?: string; totalAmount?: any; supplier?: any; items?: any[]; }

export default function PurchaseInvoiceFormPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const params = useParams<{ id: string }>();
  const poId = sp.get('po');
  const editId = params.id || sp.get('edit');
  const isEdit = !!editId;

  const [suppliers, setSuppliers] = useState<PartnerRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [busy, setBusy] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(fromISO(new Date().toISOString()));
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taxPercent, setTaxPercent] = useState('10');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PIItemInput[]>([
    { rowNumber: 1, description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0, totalPrice: 0, discountPercent: 0, discountAmount: 0, additionAmount: 0, deductionAmount: 0, taxPercent: 0, taxAmount: 0, shippingCost: 0, loadingCost: 0, isCapital: false, usefulLifeMonths: 120 },
  ]);
  const [poInfo, setPoInfo] = useState<POOption | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<PartnerRef[]>('/partners').then((r) => r.data).catch(() => []),
      api.get<ProjectRef[]>('/projects').then((r) => r.data).catch(() => []),
    ]).then(([ss, prs]) => {
      setSuppliers(ss.filter((s) => ['CONTRACTOR', 'SUPPLIER', 'CONSULTANT'].includes(s.type ?? '')));
      setProjects(prs);
    });
  }, []);

  // حالت ویرایش — لود فاکتور
  useEffect(() => {
    if (!editId) return;
    purchaseInvoicesApi.get(editId).then((inv: any) => {
      setInvoiceNumber(inv.invoiceNumber || '');
      setInvoiceDate(fromISO(inv.invoiceDate));
      setDueDate(inv.dueDate ? fromISO(inv.dueDate) : '');
      setSupplierId(inv.supplierId || '');
      setProjectId(inv.projectId || '');
      setTaxPercent(String(inv.taxPercent || 0));
      setDiscountAmount(String(inv.discountAmount || 0));
      setNotes(inv.notes || '');
      if (Array.isArray(inv.items) && inv.items.length) {
        setItems(inv.items.map((it: any, idx: number) => ({
          rowNumber: it.rowNumber ?? idx + 1,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit ?? 'NUMBER',
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
          discountPercent: Number(it.discountPercent) || 0,
          discountAmount: Number(it.discountAmount) || 0,
          additionAmount: Number(it.additionAmount) || 0,
          deductionAmount: Number(it.deductionAmount) || 0,
          taxPercent: Number(it.taxPercent) || 0,
          taxAmount: Number(it.taxAmount) || 0,
          shippingCost: Number(it.shippingCost) || 0,
          loadingCost: Number(it.loadingCost) || 0,
          isCapital: !!it.isCapital,
          usefulLifeMonths: it.usefulLifeMonths || 120,
        } as any)));
      }
    }).catch(() => toast.error('خطا در بارگذاری فاکتور'));
    /* eslint-disable-next-line */
  }, [editId]);
  useEffect(() => {
    if (!poId) return;
    api.get<any>('/purchase-orders/' + poId).then((r) => {
      const po = r.data;
      setPoInfo(po);
      if (po.supplierId) setSupplierId(po.supplierId);
      if (po.projectId)  setProjectId(po.projectId);
      if (po.taxPercent != null) setTaxPercent(String(po.taxPercent));
      if (Array.isArray(po.items)) {
        setItems(po.items.map((it: any) => ({
          rowNumber: it.rowNumber,
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit ?? 'NUMBER',
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
        })));
      }
    }).catch(() => toast.error('خطا در بارگذاری PO'));
    /* eslint-disable-next-line */
  }, [poId]);

  const totals = useMemo(() => {
    let sub = 0, totalDiscount = 0, totalAddition = 0, totalDeduction = 0;
    let totalTax = 0, totalShipping = 0, totalLoading = 0, grand = 0;
    for (const it of items) {
      const base = Number(it.totalPrice) || 0;
      const dp = Number((it as any).discountPercent) || 0;
      const da = Number((it as any).discountAmount) || (dp > 0 ? (base * dp) / 100 : 0);
      const afterDisc = base - da;
      const tp = Number((it as any).taxPercent) || 0;
      const ta = tp > 0 ? (afterDisc * tp) / 100 : 0;
      const add = Number((it as any).additionAmount) || 0;
      const ded = Number((it as any).deductionAmount) || 0;
      const ship = Number((it as any).shippingCost) || 0;
      const load = 0;
      const lineTotal = afterDisc + add - ded + ta + ship + load;

      sub += base; totalDiscount += da; totalAddition += add; totalDeduction += ded;
      totalTax += ta; totalShipping += ship; totalLoading += load; grand += lineTotal;
    }
    const globalDisc = Number(discountAmount) || 0;
    if (globalDisc > 0) { totalDiscount += globalDisc; grand -= globalDisc; }
    return {
      sub, totalDiscount, totalAddition, totalDeduction, totalTax, totalShipping, totalLoading,
      grand: Math.round(grand * 100) / 100,
      disc: totalDiscount, tax: totalTax, total: grand,
    };
  }, [items, taxPercent, discountAmount]);

  const updateItem = (idx: number, patch: Partial<PIItemInput>) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      if (patch.quantity != null || patch.unitPrice != null) {
        merged.totalPrice = Number(merged.quantity ?? 0) * Number(merged.unitPrice ?? 0);
      }
      return merged;
    }));
  };
  const addItem = () => setItems((p) => [...p, { rowNumber: p.length + 1, description: '', quantity: 1, unit: 'NUMBER', unitPrice: 0, totalPrice: 0, discountPercent: 0, discountAmount: 0, additionAmount: 0, deductionAmount: 0, taxPercent: 0, taxAmount: 0, shippingCost: 0, loadingCost: 0, isCapital: false, usefulLifeMonths: 120 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) { toast.error('شماره فاکتور الزامی است'); return; }
    if (!supplierId) { toast.error('تأمین‌کننده الزامی است'); return; }
    if (!items.length || items.some((it) => !it.description.trim())) {
      toast.error('همه ردیف‌ها باید شرح داشته باشند');
      return;
    }
    setBusy(true);
    try {
      let res;
      if (isEdit && editId) {
        // ویرایش فاکتور موجود
        const payload: any = {
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: toISO(invoiceDate),
          dueDate: dueDate ? toISO(dueDate) : null,
          supplierId,
          projectId: projectId || null,
          taxPercent: Number(taxPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          items: items.map((it, i) => ({
            rowNumber: i + 1,
            description: it.description.trim(),
            quantity: Number(it.quantity),
            unit: it.unit,
            unitPrice: Number(it.unitPrice),
            totalPrice: Number(it.totalPrice) || Number(it.quantity) * Number(it.unitPrice),
            discountPercent: Number((it as any).discountPercent) || 0,
            discountAmount: Number((it as any).discountAmount) || 0,
            additionAmount: Number((it as any).additionAmount) || 0,
            deductionAmount: Number((it as any).deductionAmount) || 0,
            taxPercent: Number((it as any).taxPercent) || 0,
            taxAmount: 0,
            shippingCost: Number((it as any).shippingCost) || 0,
            loadingCost: 0,
            isCapital: !!it.isCapital,
            usefulLifeMonths: it.isCapital ? (Number(it.usefulLifeMonths) || 120) : null,
          })),
        };
        res = await purchaseInvoicesApi.update(editId, payload);
      } else if (poId) {
        res = await purchaseInvoicesApi.createFromPO(poId, {
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: toISO(invoiceDate),
          dueDate: dueDate ? toISO(dueDate) : undefined,
        });
      } else {
        const payload: CreatePIInput = {
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: toISO(invoiceDate),
          dueDate: dueDate ? toISO(dueDate) : null,
          supplierId,
          projectId: projectId || null,
          taxPercent: Number(taxPercent) || 0,
          discountAmount: Number(discountAmount) || 0,
          notes: notes.trim() || null,
          items: items.map((it, i) => ({
            rowNumber: i + 1,
            description: it.description.trim(),
            quantity: Number(it.quantity),
            unit: it.unit,
            unitPrice: Number(it.unitPrice),
            totalPrice: Number(it.totalPrice) || Number(it.quantity) * Number(it.unitPrice),
            discountPercent: Number((it as any).discountPercent) || 0,
            discountAmount: Number((it as any).discountAmount) || 0,
            additionAmount: Number((it as any).additionAmount) || 0,
            deductionAmount: Number((it as any).deductionAmount) || 0,
            taxPercent: Number((it as any).taxPercent) || 0,
            taxAmount: 0,
            shippingCost: Number((it as any).shippingCost) || 0,
            loadingCost: 0,
            isCapital: !!it.isCapital,
            usefulLifeMonths: it.isCapital ? (Number(it.usefulLifeMonths) || 120) : null,
          })),
        };
        res = await purchaseInvoicesApi.create(payload);
      }
      toast.success(isEdit ? 'فاکتور ویرایش شد' : 'فاکتور ثبت شد');
      nav('/procurement/invoices/' + res.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در ذخیره');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/procurement/invoices" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ArrowRight size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEdit ? 'ویرایش فاکتور خرید' : poId ? 'ساخت فاکتور از سفارش خرید' : 'فاکتور خرید جدید'}
            </h1>
            {poInfo && <p className="text-xs text-slate-500 mt-0.5">PO: {poInfo.code}</p>}
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Header */}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">تأمین‌کننده *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={!!poId || isEdit}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50">
                <option value="">— انتخاب کنید —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">پروژه</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!!poId || isEdit}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">نرخ مالیات (%)</label>
                <input type="text" inputMode="numeric" value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value.replace(/[^\d.]/g, ''))} dir="ltr"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">تخفیف (ریال)</label>
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

        {/* Items */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">اقلام فاکتور</h3>
            {!poId && (
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs">
                <Plus size={14} /> ردیف
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-center px-2 py-2 font-medium w-10">#</th>
                <th className="text-right px-3 py-2 font-medium min-w-[180px]">شرح *</th>
                <th className="text-right px-2 py-2 font-medium w-20">مقدار</th>
                <th className="text-right px-2 py-2 font-medium w-24">واحد</th>
                <th className="text-right px-2 py-2 font-medium w-24">قیمت واحد</th>
                <th className="text-left px-2 py-2 font-medium w-24">مبلغ پایه</th>
                <th className="text-center px-2 py-2 font-medium w-16">تخفیف %</th>
                <th className="text-left px-2 py-2 font-medium w-20">تخفیف</th>
                <th className="text-left px-2 py-2 font-medium w-20">اضافات</th>
                <th className="text-left px-2 py-2 font-medium w-20">کسورات</th>
                <th className="text-center px-2 py-2 font-medium w-16">مالیات %</th>
                <th className="text-left px-2 py-2 font-medium w-20">حمل و بارگیری</th>
                <th className="text-left px-2 py-2 font-medium w-24 bg-emerald-50">جمع ردیف</th>
                <th className="text-center px-2 py-2 font-medium w-14">دارایی</th>
                <th className="text-center px-2 py-2 font-medium w-20">عمر (ماه)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i) => {
                const base = Number(it.totalPrice ?? 0) || Number(it.quantity) * Number(it.unitPrice);
                const dp = Number(it.discountPercent) || 0;
                const da = Number(it.discountAmount) || (dp > 0 ? (base * dp) / 100 : 0);
                const afterDisc = base - da;
                const tp = Number(it.taxPercent) || 0;
                const ta = Number(it.taxAmount) || (tp > 0 ? (afterDisc * tp) / 100 : 0);
                const add = Number(it.additionAmount) || 0;
                const ded = Number(it.deductionAmount) || 0;
                const ship = Number(it.shippingCost) || 0;
                const load = Number(it.loadingCost) || 0;
                const lineTotal = afterDisc + add - ded + ta + ship + load;
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="text-center text-xs text-slate-500 px-2 py-2">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input type="text" value={it.description}
                        onChange={(e) => updateItem(i, { description: e.target.value })}
                        disabled={!!poId || isEdit}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="decimal" value={String(it.quantity)}
                        onChange={(e) => updateItem(i, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) })}
                        disabled={!!poId || isEdit} dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono text-left border border-slate-200 rounded disabled:bg-slate-50" />
                    </td>
                    <td className="px-2 py-2">
                      <UnitSelect value={it.unit ?? 'NUMBER'} onChange={(v) => updateItem(i, { unit: v })} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="numeric" value={String(it.unitPrice)}
                        onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value.replace(/[^\d]/g, '')) })}
                        disabled={!!poId || isEdit} dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono text-left border border-slate-200 rounded disabled:bg-slate-50" />
                    </td>
                    <td className="px-2 py-2 text-left">
                      <span className="num text-xs font-bold text-slate-700" dir="ltr">{new Intl.NumberFormat('fa-IR').format(base)}</span>
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="decimal" value={String(it.discountPercent ?? 0)}
                        onChange={(e) => updateItem(i, { discountPercent: Number(e.target.value.replace(/[^\d.]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="numeric" value={String(it.discountAmount ?? 0)}
                        onChange={(e) => updateItem(i, { discountAmount: Number(e.target.value.replace(/[^\d]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="numeric" value={String(it.additionAmount ?? 0)}
                        onChange={(e) => updateItem(i, { additionAmount: Number(e.target.value.replace(/[^\d]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="numeric" value={String(it.deductionAmount ?? 0)}
                        onChange={(e) => updateItem(i, { deductionAmount: Number(e.target.value.replace(/[^\d]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="decimal" value={String(it.taxPercent ?? 0)}
                        onChange={(e) => updateItem(i, { taxPercent: Number(e.target.value.replace(/[^\d.]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" inputMode="numeric" value={String(it.shippingCost ?? 0)}
                        onChange={(e) => updateItem(i, { shippingCost: Number(e.target.value.replace(/[^\d]/g, '')) } as any)}
                        dir="ltr"
                        className="w-full px-1 py-1.5 text-xs font-mono text-left border border-slate-200 rounded" />
                    </td>
                    <td className="px-2 py-2 text-left bg-emerald-50/50">
                      <span className="num text-sm font-bold text-emerald-700" dir="ltr">{new Intl.NumberFormat('fa-IR').format(lineTotal)}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="checkbox" checked={!!it.isCapital}
                        onChange={(e) => updateItem(i, { isCapital: e.target.checked } as any)}
                        className="w-4 h-4 accent-cyan-600" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {it.isCapital ? (
                        <input type="text" inputMode="numeric" value={String(it.usefulLifeMonths ?? 120)}
                          onChange={(e) => updateItem(i, { usefulLifeMonths: Number(e.target.value.replace(/[^\d]/g, '')) || 120 } as any)}
                          dir="ltr"
                          className="w-16 px-1 py-1.5 text-xs font-mono text-center border border-slate-200 rounded" />
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!poId && items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          className="p-1 rounded hover:bg-rose-50 text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Total label="جمع پایه" value={totals.sub} tone="slate" />
            <Total label="جمع تخفیف" value={totals.totalDiscount} tone="rose" />
            <Total label="جمع اضافات" value={totals.totalAddition} tone="emerald" />
            <Total label="جمع کسورات" value={totals.totalDeduction} tone="rose" />
            <Total label="جمع مالیات" value={totals.totalTax} tone="amber" />
            <Total label="حمل و بارگیری" value={totals.totalShipping} tone="slate" />
            <Total label="مبلغ قابل پرداخت" value={totals.grand} tone="emerald" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link to="/procurement/invoices"
            className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">
            <X size={14} className="inline ml-1" /> انصراف
          </Link>
          <button type="submit" disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium disabled:opacity-50">
            <Save size={16} /> {busy ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ثبت فاکتور'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Total({ label, value, tone }: {
  label: string; value: number; tone: 'slate'|'rose'|'amber'|'emerald';
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
      <div className="text-base font-bold font-mono">
        {new Intl.NumberFormat('fa-IR').format(value)}
      </div>
    </div>
  );
}