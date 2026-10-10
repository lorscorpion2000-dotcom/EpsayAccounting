import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, DollarSign, Lock, Unlock } from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { WbsItem, ProjectBudget } from '@/types/project';
import { WBS_LEVEL_LABELS } from '@/types/project';
import { formatNumber } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

interface Props {
  isOpen: boolean;
  projectId: string;
  editingBudget?: ProjectBudget | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  wbsItemId?: string;
  amount: number;
  approvedAt?: string;
  isLocked?: boolean;
  description?: string;
}

interface FlatWbs {
  id: string;
  code: string;
  title: string;
  level: string;
  depth: number;
  indent: string;
}

function flattenWbs(items: WbsItem[], depth = 0): FlatWbs[] {
  const out: FlatWbs[] = [];
  items.forEach((it) => {
    out.push({
      id: it.id,
      code: it.code,
      title: it.title,
      level: it.level,
      depth,
      indent: '— '.repeat(depth),
    });
    if (it.children?.length) {
      out.push(...flattenWbs(it.children, depth + 1));
    }
  });
  return out;
}

export default function BudgetFormModal({
  isOpen, projectId, editingBudget, onClose, onSaved,
}: Props) {
  const isEdit = !!editingBudget;
  const [wbsList, setWbsList] = useState<FlatWbs[]>([]);
  const [loadingWbs, setLoadingWbs] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      isLocked: false,
      approvedAt: todayLocalISO(),
    },
  });

  // Load WBS tree when modal opens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoadingWbs(true);
    projectsApi.wbs.tree(projectId)
      .then((tree) => setWbsList(flattenWbs(tree)))
      .catch(() => toast.error('خطا در بارگذاری WBS'))
      .finally(() => setLoadingWbs(false));
  }, [isOpen, projectId]);

  // Reset form
  useEffect(() => {
    if (!isOpen) return;
    if (editingBudget) {
      reset({
        wbsItemId: editingBudget.wbsItemId || undefined,
        amount: Number(editingBudget.amount),
        approvedAt: editingBudget.approvedAt ? editingBudget.approvedAt.slice(0, 10) : undefined,
        isLocked: editingBudget.isLocked,
        description: editingBudget.description || undefined,
      });
    } else {
      reset({
        wbsItemId: undefined,
        amount: 0,
        approvedAt: todayLocalISO(),
        isLocked: false,
        description: undefined,
      });
    }
  }, [isOpen, editingBudget, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        projectId,
        wbsItemId: data.wbsItemId || undefined,
        amount: Number(data.amount),
        approvedAt: data.approvedAt || todayLocalISO(),
        isLocked: data.isLocked ?? false,
        description: data.description || undefined,
      };

      if (isEdit && editingBudget) {
        await projectsApi.budgets.update(editingBudget.id, payload);
        toast.success('بودجه ویرایش شد');
      } else {
        await projectsApi.budgets.create(payload);
        toast.success('ردیف بودجه ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره‌سازی');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? 'ویرایش ردیف بودجه' : 'ردیف بودجه جدید'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تخصیص سقف بودجه به ردیف‌های WBS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* WBS Item */}
          <div>
            <label className="label">ردیف WBS</label>
            <select {...register('wbsItemId')} className="input" disabled={loadingWbs}>
              <option value="">— بودجه کل پروژه —</option>
              {wbsList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.indent}{item.code} — {item.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              اگر خالی بگذارید، به‌عنوان «بودجه کل پروژه» ثبت می‌شود
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="label">مبلغ بودجه (ریال) *</label>
            <input
              type="number"
              step="1"
              {...register('amount', {
                required: 'مبلغ الزامی است',
                min: { value: 1, message: 'مبلغ باید بزرگ‌تر از صفر باشد' },
              })}
              className="input num text-lg"
              dir="ltr"
              placeholder="0"
              autoFocus
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Approval Date */}
          <div>
            <label className="label">تاریخ تصویب *</label>
            <Controller
              name="approvedAt"
              control={control}
              rules={{ required: 'تاریخ تصویب الزامی است' }}
              render={({ field }) => (
                <PersianDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  hasError={!!errors.approvedAt}
                  placeholder="انتخاب تاریخ تصویب"
                />
              )}
            />
            {errors.approvedAt && (
              <p className="text-xs text-red-500 mt-1">{errors.approvedAt.message}</p>
            )}
          </div>

          {/* Lock */}
          <div className="border border-slate-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('isLocked')}
                className="w-5 h-5 mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-slate-800">قفل کردن بودجه</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  پس از قفل، امکان تغییر مبلغ بودجه وجود ندارد (مگر با دسترسی مدیر ارشد)
                </p>
              </div>
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="label">توضیحات</label>
            <textarea
              rows={2}
              {...register('description')}
              className="input resize-none"
              placeholder="توضیحات اضافی..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره تغییرات' : 'ثبت بودجه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
