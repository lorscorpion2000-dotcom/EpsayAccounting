import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { salesApi, SalesUnit, SalesCustomer } from '../services/sales.api';
import { formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';

export default function SalesContractFormPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<SalesUnit[]>([]);
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);

  const [form, setForm] = useState<any>({
    unitId: '', customerId: '',
    totalPrice: '', discountAmount: '', finalPrice: '', downPayment: '',
    contractDate: new Date().toISOString().slice(0, 10),
    deliveryDate: '', bodyHtml: '', notes: '',
    installments: [] as any[],
  });

  useEffect(() => {
    Promise.all([
      salesApi.units.list({ status: 'AVAILABLE' }),
      salesApi.customers.list(),
    ]).then(([u, c]) => { setUnits(u); setCustomers(c); });

    if (isEdit && id) {
      setLoading(true);
      salesApi.contracts.get(id).then((c: any) => {
        setForm({
          unitId: c.unitId, customerId: c.customerId,
          totalPrice: c.totalPrice, discountAmount: c.discountAmount || '',
          finalPrice: c.finalPrice, downPayment: c.downPayment || '',
          contractDate: c.contractDate.slice(0, 10),
          deliveryDate: c.deliveryDate?.slice(0, 10) || '',
          bodyHtml: c.bodyHtml || '', notes: c.notes || '',
          installments: [],
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // auto compute final price
  useEffect(() => {
    const t = Number(form.totalPrice) || 0;
    const d = Number(form.discountAmount) || 0;
    if (t > 0 && (!form.finalPrice || Number(form.finalPrice) === 0)) {
      set('finalPrice', String(t - d));
    }
  }, [form.totalPrice, form.discountAmount]);

  const addInstallment = () => {
    setForm((f: any) => ({
      ...f,
      installments: [
        ...f.installments,
        { sequence: f.installments.length + 1, dueDate: '', amount: '', notes: '' },
      ],
    }));
  };

  const removeInstallment = (i: number) => {
    setForm((f: any) => ({
      ...f,
      installments: f.installments.filter((_: any, idx: number) => idx !== i),
    }));
  };

  const updateInstallment = (i: number, k: string, v: any) => {
    setForm((f: any) => ({
      ...f,
      installments: f.installments.map((it: any, idx: number) => idx === i ? { ...it, [k]: v } : it),
    }));
  };

  const submit = async () => {
    if (!form.unitId) { toast.error('واحد را انتخاب کنید'); return; }
    if (!form.customerId) { toast.error('مشتری را انتخاب کنید'); return; }
    if (!form.totalPrice || !form.finalPrice) { toast.error('مبالغ الزامی است'); return; }
    setSaving(true);
    try {
      const payload: any = {
        unitId: form.unitId,
        customerId: form.customerId,
        totalPrice: Number(form.totalPrice),
        discountAmount: form.discountAmount ? Number(form.discountAmount) : undefined,
        finalPrice: Number(form.finalPrice),
        downPayment: form.downPayment ? Number(form.downPayment) : undefined,
        contractDate: form.contractDate,
        deliveryDate: form.deliveryDate || undefined,
        bodyHtml: form.bodyHtml || undefined,
        notes: form.notes || undefined,
        installments: form.installments
          .filter((i: any) => i.dueDate && i.amount)
          .map((i: any) => ({
            sequence: Number(i.sequence),
            dueDate: i.dueDate,
            amount: Number(i.amount),
            notes: i.notes || undefined,
          })),
      };

      if (isEdit && id) await salesApi.contracts.update(id, payload);
      else await salesApi.contracts.create(payload);
      toast.success('ذخیره شد');
      nav('/sales/contracts');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/sales/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'ویرایش قرارداد فروش' : 'قرارداد فروش جدید'}
        </h1>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">واحد *</label>
            <select value={form.unitId} onChange={(e) => {
              const u = units.find(x => x.id === e.target.value);
              setForm((f: any) => ({
                ...f,
                unitId: e.target.value,
                totalPrice: u?.listPrice ? String(u.listPrice) : f.totalPrice,
              }));
            }} className="input w-full">
              <option value="">انتخاب کنید...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.project?.name} - واحد {u.unitNumber}{u.block ? ' (بلوک ' + u.block + ')' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مشتری *</label>
            <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} className="input w-full">
              <option value="">انتخاب کنید...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName} {c.nationalId ? '(' + c.nationalId + ')' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ قرارداد *</label>
            <PersianDatePicker value={form.contractDate} onChange={(v: string | null) => set('contractDate', v || '')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ تحویل</label>
            <PersianDatePicker value={form.deliveryDate} onChange={(v: string | null) => set('deliveryDate', v || '')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ کل (ریال) *</label>
            <input type="number" value={form.totalPrice} onChange={(e) => set('totalPrice', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تخفیف</label>
            <input type="number" value={form.discountAmount} onChange={(e) => set('discountAmount', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ نهایی *</label>
            <input type="number" value={form.finalPrice} onChange={(e) => set('finalPrice', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">پیش‌پرداخت</label>
            <input type="number" value={form.downPayment} onChange={(e) => set('downPayment', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">اقساط</label>
            <button onClick={addInstallment} className="btn-secondary text-xs">
              <Plus className="w-3 h-3" /> افزودن قسط
            </button>
          </div>
          {form.installments.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4 border border-dashed rounded-lg">
              قسطی تعریف نشده
            </div>
          ) : (
            <div className="space-y-2">
              {form.installments.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 w-8 num text-center">{it.sequence}</span>
                  <PersianDatePicker value={it.dueDate} onChange={(v: string | null) => updateInstallment(i, 'dueDate', v || '')} />
                  <input type="number" value={it.amount}
                    onChange={(e) => updateInstallment(i, 'amount', e.target.value)}
                    placeholder="مبلغ" className="input num flex-1" dir="ltr" />
                  <button onClick={() => removeInstallment(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="text-xs text-slate-500 text-left num pt-2">
                جمع اقساط: {formatNumber(form.installments.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} ریال
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">متن قرارداد (HTML)</label>
          <textarea value={form.bodyHtml} onChange={(e) => set('bodyHtml', e.target.value)}
            rows={6} className="input w-full resize-none font-mono text-xs" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
            rows={2} className="input w-full resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={() => nav('/sales/contracts')} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
