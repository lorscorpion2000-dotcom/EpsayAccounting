import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Save, User } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { api } from '@/services/api';
import type { Employee } from '@/types/payroll';
import { EMPLOYEE_TYPE_LABELS, MARITAL_STATUS_LABELS } from '@/types/payroll';
import type { Partner } from '@/types/project';
import { formatNumber } from '@/utils/format';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { getApiErrorMessage, applyApiErrorsToForm } from '@/utils/api-error';

interface Props {
  isOpen: boolean;
  editing?: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

const employeeSchema = z.object({
  partnerId: z.string().min(1, 'شخص الزامی است'),
  employeeType: z.string().min(1),
  position: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  baseSalary: z.number({ invalid_type_error: 'حقوق پایه نامعتبر است' }).nonnegative('حقوق پایه باید ≥ ۰ باشد'),
  housingAllow: z.number({ invalid_type_error: 'حق مسکن نامعتبر است' }).nonnegative('حق مسکن باید ≥ ۰ باشد'),
  foodAllow: z.number({ invalid_type_error: 'حق خواربار نامعتبر است' }).nonnegative('حق خواربار باید ≥ ۰ باشد'),
  childAllow: z.number({ invalid_type_error: 'حق اولاد نامعتبر است' }).nonnegative('حق اولاد باید ≥ ۰ باشد'),
  otherAllow: z.number({ invalid_type_error: 'سایر مزایا نامعتبر است' }).nonnegative('سایر مزایا باید ≥ ۰ باشد'),
  dailyWage: z.number({ invalid_type_error: 'دستمزد روزانه نامعتبر است' }).nonnegative('دستمزد روزانه باید ≥ ۰ باشد').optional(),
  hourlyWage: z.number({ invalid_type_error: 'دستمزد ساعتی نامعتبر است' }).nonnegative('دستمزد ساعتی باید ≥ ۰ باشد').optional(),
  bankAccount: z.string().optional(),
  bankIban: z.string().optional(),
  bankName: z.string().optional(),
  insuranceNumber: z.string().optional(),
  hasInsurance: z.boolean(),
  maritalStatus: z.string().min(1),
  childrenCount: z.number({ invalid_type_error: 'تعداد فرزند نامعتبر است' }).int('تعداد فرزند باید عدد صحیح باشد').nonnegative('تعداد فرزند باید ≥ ۰ باشد'),
  nationalId: z.string().optional(),
  fatherName: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  education: z.string().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
  projectId: z.string().optional(),
});

type FormData = z.infer<typeof employeeSchema>;

export default function EmployeeFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = !!editing;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, watch, control, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeType: 'FULL_TIME',
      maritalStatus: 'SINGLE',
      baseSalary: 0,
      housingAllow: 0,
      foodAllow: 0,
      childAllow: 0,
      otherAllow: 0,
      childrenCount: 0,
      hasInsurance: false,
      isActive: true,
    },
  });

  const baseSalary = watch('baseSalary') || 0;
  const housingAllow = watch('housingAllow') || 0;
  const foodAllow = watch('foodAllow') || 0;
  const childAllow = watch('childAllow') || 0;
  const otherAllow = watch('otherAllow') || 0;
  const employeeType = watch('employeeType');

  const totalMonthly = Number(baseSalary) + Number(housingAllow) + Number(foodAllow) + Number(childAllow) + Number(otherAllow);

  useEffect(() => {
    if (!isOpen) return;
    partnersApi.list().then(setPartners).catch(() => []);
    api.get('/projects').then((r) => setProjects(r.data || [])).catch(() => []);

    if (editing) {
      reset({
        partnerId: editing.partnerId,
        employeeType: editing.employeeType,
        position: editing.position || undefined,
        department: editing.department || undefined,
        hireDate: editing.hireDate ? editing.hireDate.slice(0, 10) : undefined,
        baseSalary: Number(editing.baseSalary),
        housingAllow: Number(editing.housingAllow),
        foodAllow: Number(editing.foodAllow),
        childAllow: Number(editing.childAllow),
        otherAllow: Number(editing.otherAllow),
        dailyWage: editing.dailyWage ? Number(editing.dailyWage) : undefined,
        hourlyWage: editing.hourlyWage ? Number(editing.hourlyWage) : undefined,
        bankAccount: editing.bankAccount || undefined,
        bankIban: editing.bankIban || undefined,
        bankName: editing.bankName || undefined,
        insuranceNumber: editing.insuranceNumber || undefined,
        hasInsurance: editing.hasInsurance,
        maritalStatus: editing.maritalStatus,
        childrenCount: editing.childrenCount,
        nationalId: editing.nationalId || undefined,
        fatherName: (editing as any).partner?.fatherName || undefined,
        postalCode: (editing as any).partner?.postalCode || undefined,
        phone: (editing as any).partner?.phone || undefined,
        address: (editing as any).partner?.address || undefined,
        birthDate: editing.birthDate ? editing.birthDate.slice(0, 10) : undefined,
        birthPlace: editing.birthPlace || undefined,
        education: editing.education || undefined,
        isActive: editing.isActive,
        notes: editing.notes || undefined,
        projectId: (editing as any).projectId || '',
      });
    } else {
      reset({
        partnerId: '',
        employeeType: 'FULL_TIME',
        maritalStatus: 'SINGLE',
        baseSalary: 0, housingAllow: 0, foodAllow: 0, childAllow: 0, otherAllow: 0,
        childrenCount: 0, hasInsurance: false, isActive: true,
        projectId: '',
      });
    }
  }, [isOpen, editing, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        position: data.position || undefined,
        department: data.department || undefined,
        hireDate: data.hireDate || undefined,
        bankAccount: data.bankAccount || undefined,
        bankIban: data.bankIban || undefined,
        bankName: data.bankName || undefined,
        insuranceNumber: data.insuranceNumber || undefined,
        nationalId: data.nationalId || undefined,
        fatherName: data.fatherName || undefined,
        postalCode: data.postalCode || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        birthDate: data.birthDate || undefined,
        birthPlace: data.birthPlace || undefined,
        education: data.education || undefined,
        notes: data.notes || undefined,
        projectId: data.projectId || undefined,
      };
      if (isEdit && editing) {
        await payrollApi.employees.update(editing.id, payload);
        toast.success('پرسنل ویرایش شد');
      } else {
        await payrollApi.employees.create(payload);
        toast.success('پرسنل ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const failed = applyApiErrorsToForm(e, setError);
      if (failed.length === 0) toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'ویرایش پرسنل' : 'پرسنل جدید'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto">
          {/* اطلاعات اصلی */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">اطلاعات اصلی</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="label">شخص (از دایرکتوری) *</label>
                <select {...register('partnerId')} className="input" disabled={isEdit}>
                  <option value="">— انتخاب کنید —</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
                {errors.partnerId && <p className="text-xs text-red-500 mt-1">{errors.partnerId.message}</p>}
              </div>
              <div>
                <label className="label">نوع همکاری *</label>
                <select {...register('employeeType')} className="input">
                  {Object.entries(EMPLOYEE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">سمت</label>
                <input type="text" {...register('position')} className="input" />
              </div>
              <div>
                <label className="label">واحد</label>
                <input type="text" {...register('department')} className="input" />
              </div>
              <div>
                <label className="label">پروژه / ستاد محل خدمت</label>
                <select {...register('projectId')} className="input">
                  <option value="">— بدون پروژه (ستاد) —</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} {p.code ? '(' + p.code + ')' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">تاریخ استخدام</label>
                <Controller
                  name="hireDate"
                  control={control}
                  render={({ field }) => (
                    <PersianDatePicker
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="انتخاب تاریخ استخدام"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* حقوق و مزایا */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">حقوق و مزایا</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">حقوق پایه (ریال)</label>
                <input type="number" step="100000" {...register('baseSalary', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">حق مسکن</label>
                <input type="number" step="100000" {...register('housingAllow', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">حق خواربار</label>
                <input type="number" step="100000" {...register('foodAllow', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">حق اولاد</label>
                <input type="number" step="100000" {...register('childAllow', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">سایر مزایا</label>
                <input type="number" step="100000" {...register('otherAllow', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">تعداد فرزند</label>
                <input type="number" {...register('childrenCount', { setValueAs: (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; } })} className="input num" dir="ltr" />
              </div>
              {employeeType === 'DAILY_WAGE' && (
                <div>
                  <label className="label">دستمزد روزانه</label>
                  <input type="number" step="100000" {...register('dailyWage', { setValueAs: (v) => (v === '' || v === null || v === undefined) ? undefined : Number(v) })} className="input num" dir="ltr" />
                </div>
              )}
              {employeeType === 'HOURLY' && (
                <div>
                  <label className="label">دستمزد ساعتی</label>
                  <input type="number" step="10000" {...register('hourlyWage', { setValueAs: (v) => (v === '' || v === null || v === undefined) ? undefined : Number(v) })} className="input num" dir="ltr" />
                </div>
              )}
            </div>

            {totalMonthly > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-between">
                <span className="text-sm text-brand-800 font-medium">مجموع دریافتی ماهانه:</span>
                <span className="text-lg font-bold text-brand-700 num">{formatNumber(totalMonthly)} <span className="text-xs font-normal">ریال</span></span>
              </div>
            )}
          </div>

          {/* اطلاعات بانکی و بیمه */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">اطلاعات بانکی و بیمه</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">شماره شبا</label>
                <input type="text" {...register('bankIban')} className="input num" dir="ltr" placeholder="IR..." />
              </div>
              <div>
                <label className="label">شماره حساب</label>
                <input type="text" {...register('bankAccount')} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">نام بانک</label>
                <input type="text" {...register('bankName')} className="input" />
              </div>
              <div>
                <label className="label">شماره بیمه</label>
                <input type="text" {...register('insuranceNumber')} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">وضعیت تأهل</label>
                <select {...register('maritalStatus')} className="input">
                  {Object.entries(MARITAL_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('hasInsurance')} className="w-4 h-4 rounded text-brand-600" />
                  <span className="text-sm">بیمه تأمین اجتماعی دارد</span>
                </label>
              </div>
            </div>
          </div>

          {/* اطلاعات تکمیلی */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">اطلاعات تکمیلی</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">کد ملی</label>
                <input type="text" {...register('nationalId')} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">نام پدر</label>
                <input type="text" {...register('fatherName')} className="input" />
              </div>
              <div>
                <label className="label">تلفن همراه</label>
                <input type="text" {...register('phone')} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">تاریخ تولد</label>
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field }) => (
                    <PersianDatePicker
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="انتخاب تاریخ"
                    />
                  )}
                />
              </div>
              <div>
                <label className="label">محل تولد</label>
                <input type="text" {...register('birthPlace')} className="input" />
              </div>
              <div>
                <label className="label">کد پستی</label>
                <input type="text" {...register('postalCode')} className="input num" dir="ltr" />
              </div>
              <div className="md:col-span-2">
                <label className="label">آدرس</label>
                <input type="text" {...register('address')} className="input" />
              </div>
              <div>
                <label className="label">مدرک تحصیلی</label>
                <input type="text" {...register('education')} className="input" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded text-brand-600" />
                  <span className="text-sm">پرسنل فعال است</span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">توضیحات</label>
              <textarea rows={2} {...register('notes')} className="input resize-none" />
            </div>
          </div>

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
