import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, Package } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import type { Item, ItemType, ItemUnit, ItemCategory } from '@/types/warehouse';
import { ITEM_TYPE_LABELS } from '@/types/warehouse';
import UnitSelect from '@/components/UnitSelect';

interface Props {
  isOpen: boolean;
  editing?: Item | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  type: ItemType;
  unit: ItemUnit;
  categoryId?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  description?: string;
  isActive: boolean;
}

export default function ItemFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [categories, setCategories] = useState<ItemCategory[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'MATERIAL', unit: 'NUMBER', isActive: true },
  });

  useEffect(() => {
    if (!isOpen) return;
    warehouseApi.categories.list().then(setCategories);

    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        unit: editing.unit,
        categoryId: editing.categoryId || undefined,
        minStock: editing.minStock ? Number(editing.minStock) : undefined,
        maxStock: editing.maxStock ? Number(editing.maxStock) : undefined,
        reorderPoint: editing.reorderPoint ? Number(editing.reorderPoint) : undefined,
        description: editing.description || undefined,
        isActive: editing.isActive,
      });
    } else {
      reset({ name: '', type: 'MATERIAL', unit: 'NUMBER', categoryId: undefined, isActive: true });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload: any = { ...data, categoryId: data.categoryId || undefined };
      if (isEdit && editing) {
        await warehouseApi.items.update(editing.id, payload);
        toast.success('کالا ویرایش شد');
      } else {
        await warehouseApi.items.create(payload);
        toast.success('کالا ایجاد شد');
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
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش کالا' : 'کالای جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">نام کالا *</label>
            <input type="text" {...register('name', { required: 'نام الزامی است' })} className="input" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">نوع *</label>
              <select {...register('type')} className="input">
                {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">واحد *</label>
              <UnitSelect registerProps={register('unit')} className="input" />
            </div>
            <div>
              <label className="label">دسته</label>
              <select {...register('categoryId')} className="input">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">حد بحرانی</label>
              <input type="number" step="0.01" {...register('minStock', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">حد تجدید سفارش</label>
              <input type="number" step="0.01" {...register('reorderPoint', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">حداکثر موجودی</label>
              <input type="number" step="0.01" {...register('maxStock', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('description')} className="input resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm">کالا فعال است</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره' : 'ایجاد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
