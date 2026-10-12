import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Loader2, Plus } from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import { getApiErrorMessage, applyApiErrorsToForm } from '@/utils/api-error';
import { partnersApi } from '@/modules/partners/services/partners.api';
import QuickPartnerModal from '@/modules/partners/components/QuickPartnerModal';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Partner } from '@/types/project';
import {
  PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS, PROJECT_USAGE_LABELS,
} from '@/types/project';

const projectSchema = z
  .object({
    name: z.string().trim().min(2, 'نام پروژه حداقل ۲ کاراکتر است'),
    type: z.string().min(1, 'نوع پروژه الزامی است'),
    status: z.string().min(1, 'وضعیت الزامی است'),
    usage: z.string().optional(),
    clientId: z.string().optional(),
    consultantId: z.string().optional(),
    purchasingOfficerId: z.string().optional(),
    addressProvince: z.string().optional(),
    addressCity: z.string().optional(),
    addressFull: z.string().optional(),
    totalArea: z
      .number({ invalid_type_error: 'متراژ نامعتبر است' })
      .nonnegative('متراژ باید ≥ ۰ باشد')
      .optional(),
    floorsCount: z
      .number({ invalid_type_error: 'تعداد طبقات نامعتبر است' })
      .int('تعداد طبقات باید عدد صحیح باشد')
      .nonnegative('تعداد طبقات باید ≥ ۰ باشد')
      .optional(),
    startDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => !d.startDate || !d.plannedEndDate || d.plannedEndDate >= d.startDate, {
    message: 'تاریخ پایان نمی‌تواند قبل از شروع باشد',
    path: ['plannedEndDate'],
  });

type FormData = z.infer<typeof projectSchema>;

export default function ProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [clients, setClients] = useState<Partner[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, setError, watch: _watch } = useForm<FormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: 'MAIN_CONTRACTOR',
      status: 'PLANNING',
    },
  });

  const loadPartners = () => {
    Promise.all([
      partnersApi.list({ type: 'CLIENT' }).catch(() => []),
      partnersApi.list({ type: 'CONSULTANT' }).catch(() => []),
      api.get('/users').then((r: any) => r.data).catch(() => []),
    ]).then(([c, co, u]) => {
      setClients(Array.isArray(c) ? c : []);
      setConsultants(Array.isArray(co) ? co : []);
      setOfficers(Array.isArray(u) ? u : []);
    });
  };

  useEffect(() => {
    loadPartners();

    if (isEdit && id) {
      projectsApi.get(id).then((p) => {
        reset({
          name: p.name,
          type: p.type,
          status: p.status,
          usage: p.usage || undefined,
          clientId: p.client?.id,
          consultantId: p.consultant?.id,
          purchasingOfficerId: (p as any).purchasingOfficerId || undefined,
          addressProvince: p.addressProvince || undefined,
          addressCity: p.addressCity || undefined,
          addressFull: p.addressFull || undefined,
          totalArea: p.totalArea ? Number(p.totalArea) : undefined,
          floorsCount: p.floorsCount || undefined,
          startDate: p.startDate ? p.startDate.slice(0, 10) : undefined,
          plannedEndDate: p.plannedEndDate ? p.plannedEndDate.slice(0, 10) : undefined,
          description: p.description || undefined,
        });
      }).catch(() => toast.error('خطا در بارگذاری'));
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload: any = {
        ...data,
        clientId: data.clientId || undefined,
        consultantId: data.consultantId || undefined,
      };
      if (isEdit && id) {
        await projectsApi.update(id, payload);
        toast.success('پروژه با موفقیت ویرایش شد');
      } else {
        await projectsApi.create(payload);
        toast.success('پروژه با موفقیت ایجاد شد');
      }
      navigate('/projects');
    } catch (e: any) {
      const failed = applyApiErrorsToForm(e, setError);
      if (failed.length === 0) toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'ویرایش پروژه' : 'پروژه جدید'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">اطلاعات شناسنامه پروژه را وارد کنید</p>
        </div>
        <button onClick={() => navigate('/projects')} className="btn-ghost">
          <X className="w-4 h-4" />
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            اطلاعات اصلی
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">نام پروژه *</label>
              <input
                type="text"
                {...register('name')}
                className="input"
                placeholder="مثال: بیمارستان شفا"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">نوع پروژه</label>
              <select {...register('type')} className="input">
                {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">کاربری پروژه</label>
              <select {...register('usage')} className="input">
                <option value="">— انتخاب کنید —</option>
                {Object.entries(PROJECT_USAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">متراژ کل (مترمربع)</label>
              <input type="number" step="0.01" {...register('totalArea', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })} className="input num" />
            </div>
            <div>
              <label className="label">تعداد طبقات</label>
              <input type="number" {...register('floorsCount', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })} className="input num" />
            </div>
          </div>
        </div>

        {/* طرفین */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            طرفین قرارداد
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">کارفرما</label>
              <div className="flex gap-2">
                <select {...register('clientId')} className="input flex-1">
                  <option value="">— انتخاب کنید —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="btn-secondary shrink-0 px-3"
                  title="افزودن کارفرمای جدید"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">مشاور / ناظر</label>
              <div className="flex gap-2">
                <select {...register('consultantId')} className="input flex-1">
                  <option value="">— انتخاب کنید —</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowConsultantModal(true)}
                  className="btn-secondary shrink-0 px-3"
                  title="افزودن مشاور جدید"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">کارپرداز پروژه</label>
              <select {...register('purchasingOfficerId')} className="input w-full">
                <option value="">— انتخاب کنید —</option>
                {officers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}{u.username ? ' (' + u.username + ')' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                کارپرداز مسئول دریافت و مدیریت دستورات خرید این پروژه است
              </p>
            </div>
          </div>
        </div>

        {/* آدرس */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            آدرس
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">استان</label>
              <input type="text" {...register('addressProvince')} className="input" />
            </div>
            <div>
              <label className="label">شهر</label>
              <input type="text" {...register('addressCity')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">آدرس کامل</label>
              <input type="text" {...register('addressFull')} className="input" />
            </div>
          </div>
        </div>

        {/* زمان‌بندی */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            زمان‌بندی
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">تاریخ شروع</label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="انتخاب تاریخ شروع"
                  />
                )}
              />
            </div>
            <div>
              <label className="label">تاریخ پایان پیش‌بینی</label>
              <Controller
                name="plannedEndDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="انتخاب تاریخ پایان"
                  />
                )}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <textarea rows={3} {...register('description')} className="input resize-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/projects')} className="btn-secondary">
            انصراف
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره تغییرات' : 'ایجاد پروژه'}
          </button>
        </div>
      </form>

      {/* Modals */}
      <QuickPartnerModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        defaultType="CLIENT"
        onCreated={(partner) => {
          setClients((prev) => [partner, ...prev]);
          setValue('clientId', partner.id);
        }}
      />
      <QuickPartnerModal
        isOpen={showConsultantModal}
        onClose={() => setShowConsultantModal(false)}
        defaultType="CONSULTANT"
        onCreated={(partner) => {
          setConsultants((prev) => [partner, ...prev]);
          setValue('consultantId', partner.id);
        }}
      />
    </div>
  );
}
