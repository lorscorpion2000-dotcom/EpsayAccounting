import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Lock } from 'lucide-react';
import { timelineApi, Guarantee, GuaranteeType } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: Guarantee | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<GuaranteeType, string> = {
  BANK_GUARANTEE: 'ضمانت‌نامه بانکی',
  CHECK: 'چک تضمین',
  DEPOSIT: 'وجه الضمان نقدی',
  OTHER: 'سایر',
};

interface FormData {
  projectId?: string;
  type: GuaranteeType;
  title: string;
  issuer?: string;
  beneficiary?: string;
  amount: number;
  issueDate?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function GuaranteeFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'BANK_GUARANTEE', amount: 0 },
  });

  useEffect(() => {
    if (!isOpen) return;
    setPendingFiles([]);
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId || undefined,
        type: editing.type,
        title: editing.title,
        issuer: editing.issuer || undefined,
        beneficiary: editing.beneficiary || undefined,
        amount: Number(editing.amount),
        issueDate: editing.issueDate?.slice(0, 10),
        expiryDate: editing.expiryDate?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ type: 'BANK_GUARANTEE', title: '', amount: 0, projectId: undefined });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        projectId: data.projectId || undefined,
        issuer: data.issuer || undefined,
        beneficiary: data.beneficiary || undefined,
        issueDate: data.issueDate || undefined,
        expiryDate: data.expiryDate || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.guarantees.update(editing.id, payload);
        toast.success('تضمین ویرایش شد');
      } else {
        const saved = await timelineApi.guarantees.create(payload);
      if (pendingFiles.length > 0 && saved?.id) {
        try {
          await attachmentsApi.createMany('GUARANTEE', saved.id, pendingFiles);
        } catch (e) { console.error('خطا در ذخیره پیوستها', e); }
      }
        toast.success('تضمین ثبت شد');
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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش تضمین' : 'تضمین جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع تضمین *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">پروژه (اختیاری)</label>
              <select {...register('projectId')} className="input">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان *</label>
            <input type="text" {...register('title', { required: 'عنوان الزامی است' })} className="input" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">صادرکننده</label>
              <input type="text" {...register('issuer')} className="input" placeholder="بانک ملت، ..." />
            </div>
            <div>
              <label className="label">ذی‌نفع</label>
              <input type="text" {...register('beneficiary')} className="input" placeholder="شهرداری، کارفرما، ..." />
            </div>
          </div>

          <div>
            <label className="label">مبلغ (ریال) *</label>
            <input type="number" step="1000" {...register('amount', { valueAsNumber: true, required: true })} className="input num text-lg" dir="ltr" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ صدور</label>
              <Controller name="issueDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
            <div>
              <label className="label">تاریخ انقضا</label>
              <Controller name="expiryDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <AttachmentsManager
              entityType="GUARANTEE"
              entityId={editing?.id || null}
              label="پیوستها و مدارک"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('notes')} className="input resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
