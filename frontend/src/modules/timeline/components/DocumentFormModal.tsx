import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, FileImage } from 'lucide-react';
import { timelineApi, TechnicalDocument, DocumentType, DocumentPhase } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: TechnicalDocument | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  ARCHITECTURE: 'معماری',
  STRUCTURE: 'سازه',
  MEP: 'تاسیسات مکانیکی و برقی',
  SITE_PLAN: 'پلان سایت',
  OTHER: 'سایر',
};

const PHASE_LABELS: Record<DocumentPhase, string> = {
  PHASE_1: 'فاز ۱ - نقشه‌های اولیه',
  PHASE_2: 'فاز ۲ - نقشه‌های اجرایی',
  OTHER: 'سایر',
};

interface FormData {
  projectId: string;
  type: DocumentType;
  phase: DocumentPhase;
  title: string;
  version: string;
  isApproved?: boolean;
  approvedAt?: string;
  attachmentUrl?: string;
  notes?: string;
}

export default function DocumentFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);

  const { register, handleSubmit, watch, setValue, reset, control} = useForm<FormData>({
    defaultValues: { type: 'ARCHITECTURE', phase: 'PHASE_1', version: '1.0', isApproved: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    setPendingFiles([]);
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        type: editing.type,
        phase: editing.phase,
        title: editing.title,
        version: editing.version,
        isApproved: editing.isApproved,
        approvedAt: editing.approvedAt?.slice(0, 10),
        attachmentUrl: editing.attachmentUrl || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({ projectId: '', type: 'ARCHITECTURE', phase: 'PHASE_1', title: '', version: '1.0', isApproved: false });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        approvedAt: data.approvedAt || undefined,
        attachmentUrl: data.attachmentUrl || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.documents.update(editing.id, payload);
        toast.success('سند ویرایش شد');
      } else {
        const saved = await timelineApi.documents.create(payload);
      if (pendingFiles.length > 0 && saved?.id) {
        try {
          await attachmentsApi.createMany('DOCUMENT', saved.id, pendingFiles);
        } catch (e) { console.error('خطا در ذخیره پیوستها', e); }
      }
        toast.success('سند ثبت شد');
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-md">
              <FileImage className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش سند فنی' : 'سند فنی جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">پروژه *</label>
            <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع سند *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">فاز *</label>
              <select {...register('phase')} className="input">
                {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">عنوان سند *</label>
            <input type="text" {...register('title', { required: true })} className="input" placeholder="مثال: پلان طبقه همکف" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نسخه *</label>
              <input type="text" {...register('version', { required: true })} className="input num" dir="ltr" placeholder="1.0، 2.1، ..." />
            </div>
            <div>
              <label className="label">تاریخ تایید</label>
              <Controller name="approvedAt" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isApproved')} className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm">سند تاییدشده است</span>
          </label>

          <AttachmentsManager
              entityType="DOCUMENT"
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
