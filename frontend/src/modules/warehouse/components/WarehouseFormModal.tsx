import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, Warehouse as WarehouseIcon } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import { api } from '@/services/api';
import type { Warehouse, WarehouseType } from '@/types/warehouse';
import { WAREHOUSE_TYPE_LABELS } from '@/types/warehouse';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editingWarehouse?: Warehouse | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  type: WarehouseType;
  projectId?: string;
  location?: string;
  isActive: boolean;
  description?: string;
}

export default function WarehouseFormModal({ isOpen, editingWarehouse, onClose, onSaved }: Props) {
  const isEdit = !!editingWarehouse;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { type: 'MAIN', isActive: true },
  });

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (editingWarehouse) {
      reset({
        name: editingWarehouse.name,
        type: editingWarehouse.type,
        projectId: editingWarehouse.projectId || undefined,
        location: editingWarehouse.location || undefined,
        isActive: editingWarehouse.isActive,
        description: editingWarehouse.description || undefined,
      });
    } else {
      reset({ name: '', type: 'MAIN', projectId: undefined, location: '', isActive: true, description: '' });
    }
  }, [isOpen, editingWarehouse, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = { ...data, projectId: data.projectId || undefined };
      if (isEdit && editingWarehouse) {
        await warehouseApi.warehouses.update(editingWarehouse.id, payload);
        toast.success('انبار ویرایش شد');
      } else {
        await warehouseApi.warehouses.create(payload);
        toast.success('انبار ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <WarehouseIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش انبار' : 'انبار جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">نام انبار *</label>
            <input type="text" {...register('name', { required: 'نام الزامی است' })} className="input" autoFocus />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع انبار</label>
              <select {...register('type')} className="input">
                {Object.entries(WAREHOUSE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">پروژه مرتبط</label>
              <select {...register('projectId')} className="input">
                <option value="">— عمومی —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">محل انبار</label>
            <input type="text" {...register('location')} className="input" placeholder="مثال: کارگاه بیمارستان شفا" />
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea rows={2} {...register('description')} className="input resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm">انبار فعال است</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ایجاد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
