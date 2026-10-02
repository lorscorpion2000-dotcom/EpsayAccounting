import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { timelineApi, PhaseChecklist, ChecklistType, ChecklistItem } from '../services/timeline.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { api } from '@/services/api';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: PhaseChecklist | null;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<ChecklistType, string> = {
  REBAR_BEFORE_CONCRETE: 'آرماتوربندی قبل از بتن‌ریزی',
  FORMWORK: 'قالب‌بندی',
  ELECTRICAL: 'تاسیسات برقی',
  PLUMBING: 'لوله‌کشی آب و فاضلاب',
  WATERPROOFING: 'ایزولاسیون و عایق‌کاری',
  OTHER: 'سایر',
};

interface FormData {
  projectId: string;
  wbsItemId?: string;
  type: ChecklistType;
  title: string;
  checklistDate?: string;
  items: ChecklistItem[];
  inspectorName?: string;
  supervisorName?: string;
  notes?: string;
}

export default function ChecklistFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);

  const { register, handleSubmit, reset, control, watch } = useForm<FormData>({
    defaultValues: {
      type: 'REBAR_BEFORE_CONCRETE',
      checklistDate: new Date().toISOString().slice(0, 10),
      items: [{ title: '', isChecked: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const projectId = watch('projectId');

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editing) {
      reset({
        projectId: editing.projectId,
        wbsItemId: editing.wbsItemId || undefined,
        type: editing.type,
        title: editing.title,
        checklistDate: editing.checklistDate?.slice(0, 10),
        items: editing.items.length > 0 ? editing.items : [{ title: '', isChecked: false }],
        inspectorName: editing.inspectorName || undefined,
        supervisorName: editing.supervisorName || undefined,
        notes: editing.notes || undefined,
      });
    } else {
      reset({
        projectId: '',
        type: 'REBAR_BEFORE_CONCRETE',
        title: '',
        checklistDate: new Date().toISOString().slice(0, 10),
        items: [{ title: '', isChecked: false }],
      });
    }
  }, [isOpen, editing, reset]);

  useEffect(() => {
    if (!projectId) { setWbsItems([]); return; }
    api.get('/wbs', { params: { projectId } }).then((r) => {
      const flat: any[] = [];
      const walk = (arr: any[], d = 0) => {
        arr.forEach((x) => {
          flat.push({ ...x, indent: '— '.repeat(d) });
          if (x.children?.length) walk(x.children, d + 1);
        });
      };
      walk(r.data || []);
      setWbsItems(flat);
    }).catch(() => setWbsItems([]));
  }, [projectId]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    if (!data.items || data.items.length === 0) {
      toast.error('حداقل یک آیتم اضافه کنید');
      return;
    }
    try {
      const payload = {
        ...data,
        wbsItemId: data.wbsItemId || undefined,
        checklistDate: data.checklistDate || new Date().toISOString().slice(0, 10),
        inspectorName: data.inspectorName || undefined,
        supervisorName: data.supervisorName || undefined,
        notes: data.notes || undefined,
      };
      if (isEdit && editing) {
        await timelineApi.checklists.update(editing.id, payload);
        toast.success('چک‌لیست ویرایش شد');
      } else {
        await timelineApi.checklists.create(payload);
        toast.success('چک‌لیست ثبت شد');
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
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش چک‌لیست' : 'چک‌لیست جدید'}
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
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.indent}{it.code} — {it.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع چک‌لیست *</label>
              <select {...register('type')} className="input">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاریخ بازدید *</label>
              <Controller name="checklistDate" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
          </div>

          <div>
            <label className="label">عنوان چک‌لیست *</label>
            <input type="text" {...register('title', { required: true })} className="input" placeholder="مثال: تاییدیه آرماتوربندی ستون‌های طبقه ۳" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نام بازرس</label>
              <input type="text" {...register('inspectorName')} className="input" />
            </div>
            <div>
              <label className="label">نام ناظر</label>
              <input type="text" {...register('supervisorName')} className="input" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">آیتم‌های چک‌لیست *</label>
              <button type="button" onClick={() => append({ title: '', isChecked: false })}
                className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن آیتم
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" {...register(`items.${idx}.isChecked`)} className="w-5 h-5 mt-0.5 rounded text-emerald-600" />
                  <input type="text" {...register(`items.${idx}.title`, { required: true })}
                    className="input flex-1 text-sm" placeholder="شرح آیتم..." />
                  <input type="text" {...register(`items.${idx}.notes`)}
                    className="input w-40 text-sm" placeholder="یادداشت" />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)}
                      className="p-2 rounded hover:bg-red-50 text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
