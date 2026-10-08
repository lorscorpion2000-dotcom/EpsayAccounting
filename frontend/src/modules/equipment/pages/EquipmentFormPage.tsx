import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Truck } from 'lucide-react';
import { equipmentApi } from '../services/equipment.api';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import type { CreateEquipmentPayload } from '@/types/equipment';
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_OWNERSHIP_LABELS,
} from '@/types/equipment';

interface PartnerMini {
  id: string;
  name: string;
}

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<PartnerMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateEquipmentPayload>({
    defaultValues: {
      name: '',
      ownership: 'OWNED',
      status: 'ACTIVE',
      isActive: true,
    },
  });

  const ownership = watch('ownership');

  useEffect(() => {
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
    ]).then(([prj, prt]) => {
      setProjects(prj);
      setPartners(prt);
    });

    if (isEdit && id) {
      equipmentApi.equipment.get(id).then((eq) => {
        reset({
          name: eq.name,
          ownership: eq.ownership,
          category: eq.category || undefined,
          brand: eq.brand || undefined,
          model: eq.model || undefined,
          year: eq.year || undefined,
          plateNumber: eq.plateNumber || undefined,
          serialNumber: eq.serialNumber || undefined,
          hourlyRate: eq.hourlyRate ? Number(eq.hourlyRate) : undefined,
          dailyRate: eq.dailyRate ? Number(eq.dailyRate) : undefined,
          monthlyRate: eq.monthlyRate ? Number(eq.monthlyRate) : undefined,
          fuelType: eq.fuelType || undefined,
          fuelNormPerHour: eq.fuelNormPerHour ? Number(eq.fuelNormPerHour) : undefined,
          ownerId: eq.ownerId || undefined,
          currentProjectId: eq.currentProjectId || undefined,
          status: eq.status,
          isActive: eq.isActive,
          description: eq.description || undefined,
        });
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    } else {
      setLoadingData(false);
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: CreateEquipmentPayload) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      ['year', 'hourlyRate', 'dailyRate', 'monthlyRate', 'fuelNormPerHour'].forEach((k) => {
        if (payload[k] === null || payload[k] === undefined || Number.isNaN(payload[k])) {
          delete payload[k];
        }
      });

      if (isEdit && id) {
        await equipmentApi.equipment.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        await equipmentApi.equipment.create(payload);
        toast.success('ثبت شد');
      }
      navigate('/equipment');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش ماشین' : 'ماشین جدید'}
        </h1>
        <button onClick={() => navigate('/equipment')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">نام ماشین *</label>
              <input
                type="text"
                {...register('name', { required: 'نام الزامی است' })}
                className="input"
                placeholder="لودر 470، بیل مکانیکی..."
              />
              {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
            </div>
            <div>
              <label className="label">مالکیت</label>
              <select {...register('ownership')} className="input">
                {Object.entries(EQUIPMENT_OWNERSHIP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">دسته‌بندی</label>
              <input type="text" {...register('category')} className="input" placeholder="راه‌سازی، ساختمانی..." />
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(EQUIPMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {ownership === 'RENTED' && (
              <div className="md:col-span-2">
                <label className="label">مالک (پیمانکار/شخص)</label>
                <select {...register('ownerId')} className="input">
                  <option value="">— انتخاب کنید —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="label">پروژه فعلی</label>
              <select {...register('currentProjectId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">مشخصات فنی</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">برند</label>
              <input type="text" {...register('brand')} className="input" placeholder="کوماتسو..." />
            </div>
            <div>
              <label className="label">مدل</label>
              <input type="text" {...register('model')} className="input" placeholder="WA470" />
            </div>
            <div>
              <label className="label">سال ساخت</label>
              <input type="number" {...register('year', { valueAsNumber: true })} className="input num" dir="ltr" placeholder="1403" />
            </div>
            <div>
              <label className="label">شماره پلاک</label>
              <input type="text" {...register('plateNumber')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">شماره سریال</label>
              <input type="text" {...register('serialNumber')} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">نرخ و سوخت</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">نرخ ساعتی (ریال)</label>
              <input type="number" {...register('hourlyRate', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">نرخ روزانه (ریال)</label>
              <input type="number" {...register('dailyRate', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">نرخ ماهانه (ریال)</label>
              <input type="number" {...register('monthlyRate', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">نوع سوخت</label>
              <input type="text" {...register('fuelType')} className="input" placeholder="گازوئیل، بنزین..." />
            </div>
            <div>
              <label className="label">مصرف استاندارد (لیتر/ساعت)</label>
              <input type="number" step="0.1" {...register('fuelNormPerHour', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <label className="label">توضیحات</label>
          <textarea rows={3} {...register('description')} className="input resize-none" />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/equipment')} className="btn-secondary">انصراف</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره تغییرات' : 'ثبت ماشین'}
          </button>
        </div>
      </form>
    </div>
  );
}