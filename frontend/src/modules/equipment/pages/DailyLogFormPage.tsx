import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Clock } from 'lucide-react';
import { equipmentApi } from '../services/equipment.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Equipment, CreateDailyLogPayload } from '@/types/equipment';
import type { Project } from '@/types/project';

export default function DailyLogFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const equipmentIdFromQuery = searchParams.get('equipmentId') || '';

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CreateDailyLogPayload>({
    defaultValues: {
      equipmentId: equipmentIdFromQuery,
      logDate: todayISO(),
      workHours: 0,
      idleHours: 0,
      stopHours: 0,
      breakdownHours: 0,
      fuelLiters: 0,
      fuelCost: 0,
    },
  });

  const projectId = watch('projectId');

  useEffect(() => {
    Promise.all([
      equipmentApi.equipment.list().catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
    ]).then(([eq, prj, prt]) => {
      setEquipments(eq);
      setProjects(prj);
      setPartners(prt);
    }).finally(() => setLoadingData(false));
  }, []);

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

  const onSubmit = async (data: CreateDailyLogPayload) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      ['startMeter', 'endMeter', 'workHours', 'idleHours', 'stopHours', 'breakdownHours', 'fuelLiters', 'fuelCost'].forEach((k) => {
        if (payload[k] === null || payload[k] === undefined || Number.isNaN(payload[k])) {
          delete payload[k];
        }
      });

      await equipmentApi.logs.create(payload);
      toast.success('کارکرد ثبت شد');
      navigate('/equipment/logs');
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
          <Clock className="w-6 h-6 text-brand-600" />
          ثبت کارکرد روزانه
        </h1>
        <button onClick={() => navigate('/equipment/logs')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* اطلاعات اصلی */}
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
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: 'پروژه الزامی است' })} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.projectId && <span className="text-xs text-red-600">{errors.projectId.message}</span>}
            </div>
            <div>
              <label className="label">تاریخ *</label>
              <Controller
                name="logDate"
                control={control}
                rules={{ required: true }}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label className="label">شیفت</label>
              <select {...register('shift')} className="input">
                <option value="">— بدون شیفت —</option>
                <option value="صبح">صبح</option>
                <option value="عصر">عصر</option>
                <option value="شب">شب</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">ردیف WBS (اختیاری)</label>
              <select {...register('wbsItemId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((w) => (
                  <option key={w.id} value={w.id}>{w.indent}{w.code} — {w.title}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">اپراتور</label>
              <select {...register('operatorId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* کارکرد */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">کارکرد و ساعت‌ها</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">کنتور شروع</label>
              <input type="number" step="0.1" {...register('startMeter', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">کنتور پایان</label>
              <input type="number" step="0.1" {...register('endMeter', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ساعت کارکرد مفید</label>
              <input type="number" step="0.5" {...register('workHours', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ساعت درجا</label>
              <input type="number" step="0.5" {...register('idleHours', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ساعت توقف</label>
              <input type="number" step="0.5" {...register('stopHours', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ساعت خرابی</label>
              <input type="number" step="0.5" {...register('breakdownHours', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="label">علت توقف / خرابی</label>
              <input type="text" {...register('stopReason')} className="input" />
            </div>
          </div>
        </div>

        {/* سوخت */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">سوخت</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">مقدار سوخت (لیتر)</label>
              <input type="number" step="0.1" {...register('fuelLiters', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">هزینه سوخت (ریال)</label>
              <input type="number" {...register('fuelCost', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        {/* محل و یادداشت */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">محل و یادداشت</h2>
          <div>
            <label className="label">محل کار</label>
            <input type="text" {...register('workLocation')} className="input" placeholder="مثال: طبقه ۵ بلوک A" />
          </div>
          <div>
            <label className="label">یادداشت</label>
            <textarea rows={3} {...register('notes')} className="input resize-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/equipment/logs')} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ثبت کارکرد
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