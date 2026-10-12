import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, FileCheck2 } from 'lucide-react';
import { timelineApi, Permit, PermitType, PermitStatus } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: Permit | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<PermitType, string> = {
  DEMOLITION: 'پروانه تخریب',
  CONSTRUCTION: 'پروانه ساخت',
  NO_VIOLATION: 'گواهی عدم خلاف',
  COMPLETION: 'پایان کار',
  OTHER: 'سایر',
};

const STATUS_LABELS: Record<PermitStatus, string> = {
  PENDING: 'در انتظار صدور',
  ISSUED: 'صادرشده',
  EXPIRED: 'منقضی',
  CANCELLED: 'لغو‌شده',
};

interface FormData {
  projectId: string;
  type: PermitType;
  title: string;
  number?: string;
  authority?: string;
  status?: PermitStatus;
  issueDate?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function PermitFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);

  const { register, handleSubmit, reset, control, watch: _watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'CONSTRUCTION', status: 'PENDING' },
  });

  useEffect(() => {
    if (!isOpen) return;
    setPendingFiles([]);
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        type: editing.type,
        title: editing.title,
        number: editing.number || undefined,
        authority: editing.authority || undefined,
        status: editing.status,
        issueDate: editing.issueDate?.slice(0, 10),
        expiryDate: editing.expiryDate?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '', type: 'CONSTRUCTION', title: '',
        status: 'PENDING', number: '', authority: '',
        issueDate: undefined, expiryDate: undefined,
        attachmentUrl: '', notes: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        number: data.number || undefined,
        authority: data.authority || undefined,
        issueDate: data.issueDate || undefined,
        expiryDate: data.expiryDate || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.permits.update(editing.id, payload);
        toast.success('مجوز ویرایش شد');
      } else {
        const saved = await timelineApi.permits.create(payload);
      if (pendingFiles.length > 0 && saved?.id) {
        try {
          await attachmentsApi.createMany('PERMIT', saved.id, pendingFiles);
        } catch (e) { console.error('خطا در ذخیره پیوستها', e); }
      }
        toast.success('مجوز ثبت شد');
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش مجوز' : 'مجوز جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">نوع مجوز *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان *</label>
            <input type="text" {...register('title', { required: 'عنوان الزامی است' })} className="input" placeholder="مثال: پروانه ساخت طبقه سوم" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">شماره مجوز</label>
              <input type="text" {...register('number')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">مرجع صادرکننده</label>
              <input type="text" {...register('authority')} className="input" placeholder="شهرداری، نظام مهندسی..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
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

          <div>
            <AttachmentsManager
              entityType="PERMIT"
              entityId={editing?.id || null}
              label="پیوست‌ها و مدارک"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />
          </div>

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
