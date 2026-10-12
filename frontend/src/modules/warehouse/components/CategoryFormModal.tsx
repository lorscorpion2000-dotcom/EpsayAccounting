import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, FolderTree } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import type { ItemCategory, ItemType } from '@/types/warehouse';
import { ITEM_TYPE_LABELS } from '@/types/warehouse';

interface Props {
  isOpen: boolean;
  editing?: ItemCategory | null;
  categories: ItemCategory[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  type: ItemType;
  parentId?: string;
  description?: string;
}

export default function CategoryFormModal({ isOpen, editing, categories, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'MATERIAL' },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        parentId: editing.parentId || undefined,
        description: editing.description || undefined,
      });
    } else {
      reset({ name: '', type: 'MATERIAL', parentId: undefined, description: '' });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, parentId: data.parentId || undefined };
      if (isEdit && editing) {
        await warehouseApi.categories.update(editing.id, payload);
        toast.success('دسته ویرایش شد');
      } else {
        await warehouseApi.categories.create(payload);
        toast.success('دسته ایجاد شد');
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
              <FolderTree className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش دسته' : 'دسته جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">نام دسته *</label>
            <input type="text" {...register('name', { required: 'نام الزامی است' })} className="input" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع</label>
              <select {...register('type')} className="input">
                {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">دسته والد</label>
              <select {...register('parentId')} className="input">
                <option value="">— بدون والد —</option>
                {categories.filter((c) => !editing || c.id !== editing.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('description')} className="input resize-none" />
          </div>

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
