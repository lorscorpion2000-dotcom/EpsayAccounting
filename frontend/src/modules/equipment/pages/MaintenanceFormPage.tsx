import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Wrench } from 'lucide-react';
import { equipmentApi } from '../services/equipment.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type {
  Equipment, CreateMaintenancePayload, MaintenanceType,
} from '@/types/equipment';
import { MAINTENANCE_TYPE_LABELS } from '@/types/equipment';
import type { Project } from '@/types/project';

export default function MaintenanceFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const equipmentIdFromQuery = searchParams.get('equipmentId') || '';

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateMaintenancePayload>({
    defaultValues: {
      equipmentId: equipmentIdFromQuery,
      type: 'PREVENTIVE',
      maintenanceDate: todayISO(),
      cost: 0,
    },
  });

  useEffect(() => {
    Promise.all([
      equipmentApi.equipment.list().catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([eq, prj]) => {
      setEquipments(eq);
      setProjects(prj);
    }).finally(() => setLoadingData(false));
  }, []);

  const onSubmit = async (data: CreateMaintenancePayload) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      if (Number.isNaN(payload.cost)) delete payload.cost;
      if (Number.isNaN(payload.nextServiceHours)) delete payload.nextServiceHours;

      await equipmentApi.maintenances.create(payload);
      toast.success('ثبت شد');
      navigate('/equipment/maintenances');
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-brand-600" />
          ثبت تعمیر / نگهداری
        </h1>
        <button onClick={() => navigate('/equipment/maintenances')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">ماشین *</label>
              <select {...register('equipmentId', { required: 'ماشین الزامی است' })} className="input">
                <option value="">— انتخاب کنید —</option>
                {equipments.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                ))}
              </select>
              {errors.equipmentId && <span className="text-xs text-red-600">{errors.equipmentId.message}</span>}
            </div>
            <div>
              <label className="label">نوع *</label>
              <select {...register('type', { required: true })} className="input">
                {Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ *</label>
              <Controller
                name="maintenanceDate"
                control={control}
                rules={{ required: true }}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">پروژه (اختیاری)</label>
              <select {...register('projectId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">شرح *</label>
              <input
                type="text"
                {...register('description', { required: 'شرح الزامی است' })}
                className="input"
                placeholder="سرویس دوره‌ای ۲۵۰ ساعت، تعویض روغن..."
              />
              {errors.description && <span className="text-xs text-red-600">{errors.description.message}</span>}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">هزینه</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">هزینه کل (ریال) *</label>
              <input
                type="number"
                {...register('cost', { valueAsNumber: true, required: 'هزینه الزامی است' })}
                className="input num"
                dir="ltr"
              />
              {errors.cost && <span className="text-xs text-red-600">{errors.cost.message}</span>}
            </div>
            <div>
              <label className="label">تأمین‌کننده / تعمیرگاه</label>
              <input type="text" {...register('vendor')} className="input" />
            </div>
            <div>
              <label className="label">شماره فاکتور</label>
              <input type="text" {...register('invoiceNumber')} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">سرویس بعدی (اختیاری)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ سرویس بعدی</label>
              <Controller
                name="nextServiceDate"
                control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">ساعت سرویس بعدی</label>
              <input type="number" step="0.1" {...register('nextServiceHours', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <label className="label">یادداشت</label>
          <textarea rows={3} {...register('notes')} className="input resize-none" />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/equipment/maintenances')} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ثبت
          </button>
        </div>
      </form>
    </div>
  );
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}