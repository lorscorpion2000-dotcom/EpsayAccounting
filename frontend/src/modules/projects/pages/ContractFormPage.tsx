import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Loader2, Plus, Trash2, Calculator, DollarSign } from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project } from '@/types/project';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS,
} from '@/types/project';
import { formatNumber } from '@/utils/format';
import { getApiErrorMessage, applyApiErrorsToForm } from '@/utils/api-error';

const contractSchema = z
  .object({
    type: z.string().min(1, 'نوع قرارداد الزامی است'),
    status: z.string().min(1, 'وضعیت الزامی است'),
    baseAmount: z
      .number({ invalid_type_error: 'مبلغ نامعتبر است' })
      .positive('مبلغ باید بزرگ‌تر از صفر باشد'),
    coefficient: z
      .number({ invalid_type_error: 'ضریب نامعتبر است' })
      .positive('ضریب باید بزرگ‌تر از صفر باشد'),
    signDate: z.string().optional(),
    durationValue: z
      .number({ invalid_type_error: 'مدت نامعتبر است' })
      .nonnegative('مدت باید ≥ ۰ باشد')
      .optional(),
    durationUnit: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    paymentTerms: z.string().optional(),
    prepaymentPercent: z
      .number({ invalid_type_error: 'درصد پیش‌پرداخت نامعتبر است' })
      .min(0, 'درصد باید ≥ ۰ باشد')
      .max(100, 'درصد باید ≤ ۱۰۰ باشد')
      .optional(),
    prepaymentAmount: z
      .number({ invalid_type_error: 'مبلغ پیش‌پرداخت نامعتبر است' })
      .nonnegative('مبلغ باید ≥ ۰ باشد')
      .optional(),
    useManualPrepayment: z.boolean().optional(),
    prepaymentDepreciationPercent: z
      .number({ invalid_type_error: 'درصد استهلاک نامعتبر است' })
      .min(0)
      .max(100)
      .optional(),
    insurancePercent: z.number({ invalid_type_error: 'بیمه نامعتبر است' }).min(0).max(100),
    taxPercent: z.number({ invalid_type_error: 'مالیات نامعتبر است' }).min(0).max(100),
    retentionPercent: z.number({ invalid_type_error: 'حسن انجام نامعتبر است' }).min(0).max(100),
    otherDeductions: z.array(z.any()).optional(),
    description: z.string().optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'تاریخ پایان نمی‌تواند قبل از شروع باشد',
    path: ['endDate'],
  });

type FormData = z.infer<typeof contractSchema>;

export default function ContractFormPage() {
  const { projectId, contractId } = useParams<{ projectId: string; contractId: string }>();
  const navigate = useNavigate();
  const isEdit = !!contractId;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      type: 'LUMP_SUM',
      status: 'ACTIVE',
      baseAmount: 0,
      coefficient: 1.07,
      insurancePercent: 7,
      taxPercent: 3,
      retentionPercent: 5,
      otherDeductions: [],
      useManualPrepayment: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'otherDeductions',
  });

  // ============ Watch for live calculations ============
  const baseAmount = watch('baseAmount') || 0;
  const coefficient = watch('coefficient') || 1;
  const prepaymentPercent = watch('prepaymentPercent') || 0;
  const prepaymentAmount = watch('prepaymentAmount') || 0;
  const useManualPrepayment = watch('useManualPrepayment');
  const prepaymentDepreciationPercent = watch('prepaymentDepreciationPercent') || 0;
  const insurancePercent = watch('insurancePercent') || 0;
  const taxPercent = watch('taxPercent') || 0;
  const retentionPercent = watch('retentionPercent') || 0;
  const otherDeductions = watch('otherDeductions') || [];

  // ============ Computed ============
  const computed = useMemo(() => {
    const base = Number(baseAmount) || 0;
    const coef = Number(coefficient) || 1;
    const withCoef = base * coef;

    const prepayment = useManualPrepayment
      ? Number(prepaymentAmount) || 0
      : (base * (Number(prepaymentPercent) || 0)) / 100;

    const depreciation = (prepayment * (Number(prepaymentDepreciationPercent) || 0)) / 100;
    const insurance = (base * (Number(insurancePercent) || 0)) / 100;
    const tax = (base * (Number(taxPercent) || 0)) / 100;
    const retention = (base * (Number(retentionPercent) || 0)) / 100;
    const othersTotal = (otherDeductions || []).reduce(
      (sum, d) => sum + (base * (Number(d.percent) || 0)) / 100,
      0,
    );
    const totalDeductions = insurance + tax + retention + othersTotal;
    const netPayable = withCoef - totalDeductions - depreciation;

    return {
      withCoef,
      prepayment,
      depreciation,
      insurance,
      tax,
      retention,
      othersTotal,
      totalDeductions,
      netPayable,
    };
  }, [
    baseAmount, coefficient, prepaymentPercent, prepaymentAmount,
    useManualPrepayment, prepaymentDepreciationPercent,
    insurancePercent, taxPercent, retentionPercent, otherDeductions,
  ]);

  // ============ Load data ============
  useEffect(() => {
    if (!projectId) return;
    setLoadingData(true);

    const promises: Promise<any>[] = [
      projectsApi.get(projectId),
    ];
    if (isEdit && contractId) {
      promises.push(projectsApi.contracts.get(contractId));
    }

    Promise.all(promises)
      .then(([p, c]) => {
        setProject(p);
        if (c) {
          reset({
            type: c.type,
            status: c.status,
            baseAmount: Number(c.baseAmount),
            coefficient: Number(c.coefficient),
            signDate: c.signDate ? c.signDate.slice(0, 10) : undefined,
            durationValue: c.durationValue || undefined,
            durationUnit: c.durationUnit || undefined,
            startDate: c.startDate ? c.startDate.slice(0, 10) : undefined,
            endDate: c.endDate ? c.endDate.slice(0, 10) : undefined,
            paymentTerms: c.paymentTerms || undefined,
            prepaymentPercent: c.prepaymentPercent ? Number(c.prepaymentPercent) : undefined,
            prepaymentAmount: c.prepaymentAmount ? Number(c.prepaymentAmount) : undefined,
            prepaymentDepreciationPercent: c.prepaymentDepreciationPercent ? Number(c.prepaymentDepreciationPercent) : undefined,
            insurancePercent: Number(c.insurancePercent),
            taxPercent: Number(c.taxPercent),
            retentionPercent: Number(c.retentionPercent),
            otherDeductions: c.otherDeductions || [],
            description: c.description || undefined,
          });
        }
      })
      .catch(() => toast.error('خطا در بارگذاری اطلاعات'))
      .finally(() => setLoadingData(false));
  }, [projectId, contractId, isEdit, reset]);

  // ============ Submit ============
  const onSubmit = async (data: FormData) => {
    if (!projectId) return;
    setLoading(true);

    try {
      const payload: any = {
        projectId,
        type: data.type,
        status: data.status,
        baseAmount: Number(data.baseAmount),
        coefficient: Number(data.coefficient) || 1.07,
        signDate: data.signDate || undefined,
        durationValue: data.durationValue ? Number(data.durationValue) : undefined,
        durationUnit: data.durationUnit || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        paymentTerms: data.paymentTerms || undefined,
        prepaymentPercent: data.prepaymentPercent ? Number(data.prepaymentPercent) : undefined,
        prepaymentAmount: data.useManualPrepayment ? Number(data.prepaymentAmount) : computed.prepayment,
        prepaymentDepreciationPercent: data.prepaymentDepreciationPercent ? Number(data.prepaymentDepreciationPercent) : undefined,
        insurancePercent: Number(data.insurancePercent) || 0,
        taxPercent: Number(data.taxPercent) || 0,
        retentionPercent: Number(data.retentionPercent) || 0,
        otherDeductions: (data.otherDeductions || []).filter((d) => d.name && d.percent),
        description: data.description || undefined,
      };

      if (isEdit && contractId) {
        await projectsApi.contracts.update(contractId, payload);
        toast.success('قرارداد با موفقیت ویرایش شد');
      } else {
        await projectsApi.contracts.create(payload);
        toast.success('قرارداد با موفقیت ثبت شد');
      }
      navigate('/projects/' + projectId + '/contracts');
    } catch (e: any) {
      const failed = applyApiErrorsToForm(e, setError);
      if (failed.length === 0) toast.error(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="card p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'ویرایش قرارداد' : 'قرارداد جدید'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            پروژه: <span className="font-medium text-slate-700">{project?.name}</span>
            {project?.code && (
              <span className="num text-xs ms-2" dir="ltr">({project.code})</span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/' + projectId + '/contracts')}
          className="btn-ghost"
        >
          <X className="w-4 h-4" />
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: مشخصات اصلی */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            مشخصات قرارداد
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">نوع قرارداد</label>
              <select {...register('type')} className="input">
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">وضعیت</label>
              <select {...register('status')} className="input">
                {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">کارفرما</label>
              <input
                type="text"
                value={project?.client?.name || '—'}
                className="input bg-slate-50"
                disabled
                dir="rtl"
              />
            </div>
          </div>
        </div>

        {/* Section 2: مبلغ و ضریب */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            مبلغ قرارداد
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">مبلغ پایه قرارداد (ریال) *</label>
              <input
                type="number"
                step="1"
                {...register('baseAmount', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num text-lg"
                dir="ltr"
                placeholder="0"
              />
              {errors.baseAmount && (
                <p className="text-xs text-red-500 mt-1">{errors.baseAmount.message}</p>
              )}
              {baseAmount > 0 && (
                <p className="text-xs text-slate-500 mt-1 num">
                  {formatNumber(baseAmount)} ریال
                </p>
              )}
            </div>

            <div>
              <label className="label">ضریب پیمان</label>
              <input
                type="number"
                step="0.0001"
                {...register('coefficient', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num text-lg"
                dir="ltr"
                placeholder="1.07"
              />
              <p className="text-xs text-slate-500 mt-1">
                پیش‌فرض: ۱٫۰۷ (۷٪ بالاسری)
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: زمان‌بندی */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            زمان‌بندی
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">تاریخ انعقاد قرارداد</label>
              <Controller
                name="signDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="انتخاب تاریخ"
                  />
                )}
              />
            </div>

            <div>
              <label className="label">تاریخ شروع اجرا</label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="انتخاب تاریخ"
                  />
                )}
              />
            </div>

            <div>
              <label className="label">تاریخ پایان</label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="انتخاب تاریخ"
                  />
                )}
              />
            </div>

            <div>
              <label className="label">مدت قرارداد</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  {...register('durationValue', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                  className="input num flex-1"
                  dir="ltr"
                  placeholder="تعداد"
                />
                <select {...register('durationUnit')} className="input w-32">
                  <option value="">— واحد —</option>
                  <option value="روز">روز</option>
                  <option value="ماه">ماه</option>
                  <option value="سال">سال</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">شرایط پرداخت</label>
              <input
                type="text"
                {...register('paymentTerms')}
                className="input"
                placeholder="مثال: صورت‌وضعیت ماهانه بر اساس کارکرد واقعی"
              />
            </div>
          </div>
        </div>

        {/* Section 4: کسورات قانونی */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            کسورات قانونی
            <span className="text-xs font-normal text-slate-500">
              (قابل تنظیم برای هر قرارداد)
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">بیمه سهم کارفرما (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('insurancePercent', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">مالیات تکلیفی (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('taxPercent', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">حسن انجام کار (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('retentionPercent', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num"
                dir="ltr"
              />
            </div>
          </div>

          {/* سایر کسورات */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">سایر کسورات</label>
              <button
                type="button"
                onClick={() => append({ name: '', percent: 0 })}
                className="btn-ghost text-sm"
              >
                <Plus className="w-4 h-4" />
                افزودن ردیف
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg">
                هنوز ردیفی اضافه نشده است
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <input
                      type="text"
                      {...register(`otherDeductions.${idx}.name`)}
                      className="input flex-1"
                      placeholder="عنوان (مثال: عوارض شهرداری)"
                    />
                    <input
                      type="number"
                      step="0.01"
                      {...register(`otherDeductions.${idx}.percent`, { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                      className="input w-32 num"
                      dir="ltr"
                      placeholder="%"
                    />
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: پیش‌پرداخت */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            پیش‌پرداخت و استهلاک
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">درصد پیش‌پرداخت (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('prepaymentPercent', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num"
                dir="ltr"
                placeholder="0"
                disabled={useManualPrepayment}
              />
            </div>

            <div>
              <label className="label">درصد استهلاک پیش‌پرداخت (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('prepaymentDepreciationPercent', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                className="input num"
                dir="ltr"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                پیش‌فرض: ۲۰٪ از مبلغ پیش‌پرداخت
              </p>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('useManualPrepayment')}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">
                  ورود دستی مبلغ پیش‌پرداخت
                </span>
              </label>
            </div>

            {useManualPrepayment && (
              <div className="md:col-span-3">
                <label className="label">مبلغ پیش‌پرداخت (ریال)</label>
                <input
                  type="number"
                  step="1"
                  {...register('prepaymentAmount', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)) })}
                  className="input num"
                  dir="ltr"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 6: خلاصه مالی */}
        <div className="card p-6 bg-gradient-to-bl from-brand-50 via-white to-white border-brand-200">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-600" />
            خلاصه مالی
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FinRow
              label="مبلغ پایه"
              value={baseAmount}
              {...({ icon: <DollarSign className="w-4 h-4" /> } as any)}
            />
            <FinRow
              label={`با ضریب ${coefficient}`}
              value={computed.withCoef}
              highlight
            />
            <FinRow
              label="مبلغ پیش‌پرداخت"
              value={computed.prepayment}
            />
            <FinRow
              label="استهلاک پیش‌پرداخت"
              value={computed.depreciation}
              danger
            />
            <FinRow
              label={`بیمه (${insurancePercent}٪)`}
              value={computed.insurance}
              danger
            />
            <FinRow
              label={`مالیات (${taxPercent}٪)`}
              value={computed.tax}
              danger
            />
            <FinRow
              label={`حسن انجام (${retentionPercent}٪)`}
              value={computed.retention}
              danger
            />
            {computed.othersTotal > 0 && (
              <FinRow
                label="سایر کسورات"
                value={computed.othersTotal}
                danger
              />
            )}
            <div className="md:col-span-3 pt-4 mt-2 border-t-2 border-brand-200">
              <div className="flex items-center justify-between bg-white rounded-xl p-5 shadow-sm border-2 border-brand-500">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">مبلغ خالص قابل پرداخت</div>
                    <div className="text-xs text-slate-400">
                      (با کسر تمام کسورات قانونی)
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-brand-700 num">
                    {formatNumber(computed.netPayable)}
                  </div>
                  <div className="text-xs text-slate-500 text-left">ریال</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: توضیحات */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded"></span>
            توضیحات
          </h2>
          <textarea
            rows={4}
            {...register('description')}
            className="input resize-none"
            placeholder="توضیحات اضافی در مورد این قرارداد..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/projects/' + projectId + '/contracts')}
              className="btn-secondary"
            >
              انصراف
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره تغییرات' : 'ثبت قرارداد'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FinRow({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg p-3 border ${highlight ? 'border-brand-300' : 'border-slate-100'}`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-sm font-bold num ${danger ? 'text-red-600' : highlight ? 'text-brand-700' : 'text-slate-800'}`}>
        {danger && '-'}{formatNumber(Math.abs(value))}
      </div>
    </div>
  );
}
