import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { contractsApi, LegalContractParty, LegalContractPartyKind } from '../services/contracts.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  editing: LegalContractParty | null;
  onClose: () => void;
  onSaved: () => void;
}

const KIND_LABELS: Record<LegalContractPartyKind, string> = {
  INDIVIDUAL: 'شخص حقیقی',
  COMPANY: 'شخص حقوقی',
};

export default function PartyFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    kind: 'INDIVIDUAL', fullName: '', fatherName: '', nationalId: '',
    economicCode: '', registrationNumber: '', birthDate: '',
    mobilePhone: '', landlinePhone: '', email: '',
    maritalStatus: '', childrenCount: '', education: '', job: '',
    insuranceNumber: '', address: '', postalCode: '',
    bankName: '', bankAccount: '', bankSheba: '', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        kind: editing.kind, fullName: editing.fullName,
        fatherName: editing.fatherName || '',
        nationalId: editing.nationalId || '',
        economicCode: editing.economicCode || '',
        registrationNumber: editing.registrationNumber || '',
        birthDate: editing.birthDate?.slice(0, 10) || '',
        mobilePhone: editing.mobilePhone || '',
        landlinePhone: editing.landlinePhone || '',
        email: editing.email || '',
        maritalStatus: editing.maritalStatus || '',
        childrenCount: editing.childrenCount || '',
        education: editing.education || '',
        job: editing.job || '',
        insuranceNumber: editing.insuranceNumber || '',
        address: editing.address || '',
        postalCode: editing.postalCode || '',
        bankName: editing.bankName || '',
        bankAccount: editing.bankAccount || '',
        bankSheba: editing.bankSheba || '',
        notes: editing.notes || '',
      });
    } else {
      setForm({
        kind: 'INDIVIDUAL', fullName: '', fatherName: '', nationalId: '',
        economicCode: '', registrationNumber: '', birthDate: '',
        mobilePhone: '', landlinePhone: '', email: '',
        maritalStatus: '', childrenCount: '', education: '', job: '',
        insuranceNumber: '', address: '', postalCode: '',
        bankName: '', bankAccount: '', bankSheba: '', notes: '',
      });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { toast.error('نام الزامی است'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (payload.childrenCount === '') delete payload.childrenCount;
      else payload.childrenCount = Number(payload.childrenCount);
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (editing) await contractsApi.updateParty(editing.id, payload);
      else await contractsApi.createParty(payload);
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش طرف قرارداد' : 'طرف قرارداد جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع *</label>
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className="input w-full">
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام پدر</label>
              <input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد ملی</label>
              <input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد اقتصادی</label>
              <input value={form.economicCode} onChange={(e) => set('economicCode', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره ثبت شرکت</label>
              <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ تولد</label>
              <PersianDatePicker value={form.birthDate} onChange={(v: string | null) => set('birthDate', v || '')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">همراه</label>
              <input value={form.mobilePhone} onChange={(e) => set('mobilePhone', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تلفن ثابت</label>
              <input value={form.landlinePhone} onChange={(e) => set('landlinePhone', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ایمیل</label>
              <input value={form.email} onChange={(e) => set('email', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تعداد فرزند</label>
              <input type="number" value={form.childrenCount} onChange={(e) => set('childrenCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تحصیلات</label>
              <input value={form.education} onChange={(e) => set('education', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شغل</label>
              <input value={form.job} onChange={(e) => set('job', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره بیمه</label>
              <input value={form.insuranceNumber} onChange={(e) => set('insuranceNumber', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد پستی</label>
              <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بانک</label>
              <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره حساب</label>
              <input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">شبا</label>
              <input value={form.bankSheba} onChange={(e) => set('bankSheba', e.target.value)} className="input w-full num" dir="ltr" maxLength={26} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
