import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, Layers } from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import type { WbsItem, WbsLevel, WbsUnit } from '@/types/project';
import { WBS_LEVEL_LABELS, WBS_UNIT_LABELS } from '@/types/project';
import { formatNumber } from '@/utils/format';

interface Props {
  isOpen: boolean;
  projectId: string;
  parentItem?: WbsItem | null;
  editingItem?: WbsItem | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  title: string;
  level: WbsLevel;
  unit?: WbsUnit;
  quantity?: number;
  unitPrice?: number;
  weight?: number;
  sortOrder?: number;
  description?: string;
}

const LEVEL_ORDER: WbsLevel[] = ['PHASE', 'WORK_PACKAGE', 'ACTIVITY', 'SUB_ACTIVITY'];

/**
 * تعیین سطح پیش‌فرض بر اساس والد
 */
function getChildLevel(parent: WbsItem | null | undefined): WbsLevel {
  if (!parent) return 'PHASE';
  const idx = LEVEL_ORDER.indexOf(parent.level);
  return LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
}

export default function WbsNodeModal({
  isOpen, projectId, parentItem, editingItem, onClose, onSaved,
}: Props) {
  const isEdit = !!editingItem;

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      level: getChildLevel(parentItem),
      sortOrder: 0,
    },
  });

  const quantity = watch('quantity') || 0;
  const unitPrice = watch('unitPrice') || 0;
  const total = Number(quantity) * Number(unitPrice);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      reset({
        title: editingItem.title,
        level: editingItem.level,
        unit: editingItem.unit || undefined,
        quantity: editingItem.quantity ? Number(editingItem.quantity) : undefined,
        unitPrice: editingItem.unitPrice ? Number(editingItem.unitPrice) : undefined,
        weight: editingItem.weight ? Number(editingItem.weight) : undefined,
        sortOrder: editingItem.sortOrder || 0,
        description: editingItem.description || undefined,
      });
    } else {
      reset({
        title: '',
        level: getChildLevel(parentItem),
        unit: undefined,
        quantity: undefined,
        unitPrice: undefined,
        weight: undefined,
        sortOrder: 0,
        description: undefined,
      });
    }
  }, [isOpen, editingItem, parentItem, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = {
        projectId,
        parentId: parentItem?.id,
        title: data.title,
        level: data.level,
        unit: data.unit || undefined,
        quantity: data.quantity ? Number(data.quantity) : undefined,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
        description: data.description || undefined,
      };

      if (isEdit && editingItem) {
        await projectsApi.wbs.update(editingItem.id, payload);
        toast.success('گره WBS ویرایش شد');
      } else {
        await projectsApi.wbs.create(payload);
        toast.success('گره WBS ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره‌سازی');
    }
  };

  const headerText = isEdit
    ? 'ویرایش گره WBS'
    : parentItem
      ? `افزودن زیرمجموعه به «${parentItem.title}»`
      : 'افزودن گره اصلی';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{headerText}</h2>
              {parentItem && !isEdit && (
                <p className="text-xs text-slate-500 mt-0.5 num" dir="ltr">
                  والد: {parentItem.code}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="label">عنوان *</label>
            <input
              type="text"
              {...register('title', { required: 'عنوان الزامی است' })}
              className="input"
              placeholder="مثال: فاز تخریب، بسته کاری فونداسیون، حفاری"
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Level */}
          <div>
            <label className="label">سطح *</label>
            <select {...register('level', { required: true })} className="input">
              {LEVEL_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>{WBS_LEVEL_LABELS[lvl]}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              سطح به‌طور خودکار بر اساس والد پیشنهاد شده است
            </p>
          </div>

          {/* Unit / Quantity / UnitPrice */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">واحد</label>
              <select {...register('unit')} className="input">
                <option value="">— انتخاب کنید —</option>
                {Object.entries(WBS_UNIT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مقدار</label>
              <input
                type="number"
                step="0.01"
                {...register('quantity')}
                className="input num"
                dir="ltr"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">بهای واحد (ریال)</label>
              <input
                type="number"
                step="1"
                {...register('unitPrice')}
                className="input num"
                dir="ltr"
                placeholder="0"
              />
            </div>
          </div>

          {/* Total preview */}
          {total > 0 && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-brand-800 font-medium">مبلغ کل محاسبه‌شده:</span>
              <span className="text-lg font-bold text-brand-700 num">
                {formatNumber(total)} <span className="text-xs font-normal">ریال</span>
              </span>
            </div>
          )}

          {/* Weight / SortOrder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">وزن (درصد)</label>
              <input
                type="number"
                step="0.01"
                {...register('weight')}
                className="input num"
                dir="ltr"
                placeholder="مثال: 15"
              />
              <p className="text-xs text-slate-500 mt-1">
                وزن در محاسبه پیشرفت پروژه استفاده می‌شود
              </p>
            </div>
            <div>
              <label className="label">ترتیب نمایش</label>
              <input
                type="number"
                step="1"
                {...register('sortOrder')}
                className="input num"
                dir="ltr"
                placeholder="0"
              />
            </div>
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
              {isEdit ? 'ذخیره تغییرات' : 'افزودن گره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
