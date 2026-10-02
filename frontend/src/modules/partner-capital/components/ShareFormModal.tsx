import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, PieChart } from 'lucide-react';
import { partnerCapitalApi } from '../services/partner-capital.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { PartnerShare } from '../services/partner-capital.api';
import type { Partner, Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: PartnerShare | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  projectId: string;
  partnerId: string;
  sharePercent: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
}

export default function ShareFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { effectiveFrom: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      partnersApi.list({ type: 'PARTNER' }).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([p, pr]) => { setPartners(p); setProjects(pr); });

    if (editing) {
      reset({
        projectId: editing.projectId,
        partnerId: editing.partnerId,
        sharePercent: Number(editing.sharePercent),
        effectiveFrom: editing.effectiveFrom?.slice(0, 10),
        effectiveTo: editing.effectiveTo?.slice(0, 10),
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '',
        partnerId: '',
        sharePercent: 0,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: undefined,
        notes: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        sharePercent: Number(data.sharePercent),
        effectiveTo: data.effectiveTo || undefined,
      };
      if (isEdit && editing) {
        await partnerCapitalApi.shares.update(editing.id, payload);
        toast.success('سهم ویرایش شد');
      } else {
        await partnerCapitalApi.shares.create(payload);
        toast.success('سهم ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-md">
              <PieChart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش سهم' : 'ثبت سهم جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">پروژه *</label>
            <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">شریک *</label>
            <select {...register('partnerId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">درصد سهم (٪) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('sharePercent', { valueAsNumber: true, required: true, min: 0, max: 100 })}
              className="input num text-lg"
              dir="ltr"
              placeholder="0"
            />
            <p className="text-xs text-slate-500 mt-1">
              مجموع سهم‌ها در هر تاریخ نباید از ۱۰۰٪ بیشتر شود
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اعتبار از تاریخ *</label>
              <Controller
                name="effectiveFrom"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div>
              <label className="label">اعتبار تا تاریخ</label>
              <Controller
                name="effectiveTo"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />
                )}
              />
            </div>
          </div>

          <div>
            <label className="label">یادداشت</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت سهم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
