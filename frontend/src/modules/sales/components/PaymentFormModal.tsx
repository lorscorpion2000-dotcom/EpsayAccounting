import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { salesApi } from '../services/sales.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  contractId: string;
  remaining: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentFormModal({ isOpen, contractId, remaining, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    amount: '', paidAt: new Date().toISOString().slice(0, 10),
    paymentMethod: '', referenceNumber: '', bankName: '', notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        amount: String(remaining),
        paidAt: new Date().toISOString().slice(0, 10),
        paymentMethod: '', referenceNumber: '', bankName: '', notes: '',
      });
    }
  }, [isOpen, remaining]);

  if (!isOpen) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('مبلغ الزامی است'); return; }
    setSaving(true);
    try {
      await salesApi.payments.create({
        contractId,
        amount: String(form.amount),
        paidAt: form.paidAt,
        paymentMethod: form.paymentMethod || undefined,
        referenceNumber: form.referenceNumber || undefined,
        bankName: form.bankName || undefined,
        notes: form.notes || undefined,
      });
      toast.success('پرداخت ثبت شد');
      onSaved(); onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">ثبت پرداخت</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg text-sm">
            <span className="text-amber-700">باقیمانده: </span>
            <span className="num font-bold text-amber-700" dir="ltr">{remaining.toLocaleString('en-US')}</span>
            <span className="text-amber-700"> ریال</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ پرداخت *</label>
            <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="input w-full num" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پرداخت *</label>
            <PersianDatePicker value={form.paidAt} onChange={(v: string | null) => set('paidAt', v || '')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">روش پرداخت</label>
              <input value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}
                placeholder="نقد / چک / کارت به کارت" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره پیگیری</label>
              <input value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">بانک</label>
            <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}
