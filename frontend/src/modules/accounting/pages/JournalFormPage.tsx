import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Plus, Trash2, CheckCircle2,
  AlertCircle, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AccountSelect from '../components/AccountSelect';
import type { Account, FiscalYear } from '@/types/accounting';
import { formatNumber } from '@/utils/format';

interface LineForm {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
}

interface FormData {
  entryDate?: string;
  fiscalYearId: string;
  description: string;
  reference?: string;
  lines: LineForm[];
}

export default function JournalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      entryDate: new Date().toISOString().slice(0, 10),
      fiscalYearId: '',
      description: '',
      reference: '',
      lines: [
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines = useWatch({ control, name: 'lines' });

  // محاسبه مجموع
  const totals = (watchedLines || []).reduce(
    (sum: any, l: any) => ({
      debit: sum.debit + (Number(l?.debit) || 0),
      credit: sum.credit + (Number(l?.credit) || 0),
    }),
    { debit: 0, credit: 0 },
  );
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01 && totals.debit > 0;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [accs, fys] = await Promise.all([
          accountingApi.accounts.postable(),
          accountingApi.fiscalYears.list(),
        ]);
        setAccounts(Array.isArray(accs) ? accs : []);

        const current = (fys || []).find((f: any) => f.isCurrent) || fys?.[0];
        setFiscalYears(Array.isArray(fys) ? fys : []);

        if (isEdit && id) {
          const entry = await accountingApi.journals.get(id);
          reset({
            entryDate: entry.entryDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            fiscalYearId: entry.fiscalYearId,
            description: entry.description || '',
            reference: (entry as any).reference || '',
            lines: (entry.lines || []).map((l: any) => ({
              accountId: l.accountId,
              description: l.description || '',
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
            })),
          });
        } else if (current) {
          reset((prev) => ({
            ...prev,
            fiscalYearId: current.id,
          }));
        }
      } catch (e: any) {
        toast.error('خطا در بارگذاری اطلاعات');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, reset]);

  const onSubmit = async (data: FormData) => {
    if (!data.fiscalYearId) { toast.error('سال مالی الزامی است'); return; }
    if (!data.entryDate) { toast.error('تاریخ سند الزامی است'); return; }

    const validLines = (data.lines || []).filter(
      (l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0),
    );
    if (validLines.length < 2) {
      toast.error('حداقل دو سطر معتبر (حساب + مبلغ) نیاز است');
      return;
    }

    const totalDebit = validLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('سند تراز نیست. مجموع بدهکار و بستانکار باید برابر باشد.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        entryDate: data.entryDate,
        fiscalYearId: data.fiscalYearId,
        description: data.description,
        reference: data.reference || undefined,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      };

      if (isEdit && id) {
        await accountingApi.journals.update(id, payload);
        toast.success('سند ویرایش شد');
      } else {
        await accountingApi.journals.create(payload);
        toast.success('سند ثبت شد');
      }
      navigate('/accounting/journals');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در ذخیره‌سازی');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/journals')} className="btn-secondary">
            <X className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-600" />
              {isEdit ? 'ویرایش سند حسابداری' : 'سند حسابداری جدید'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ورود دوبل با کنترل خودکار تراز بودن
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* اطلاعات سند */}
        <div className="card p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ سند *</label>
              <Controller
                name="entryDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value || ''} onChange={(v: string | null) => field.onChange(v || '')} />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">سال مالی *</label>
              <select {...register('fiscalYearId')} className="input w-full" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {fiscalYears.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">شرح سند *</label>
              <input
                {...register('description', { required: true })}
                className="input w-full"
                placeholder="شرح کلی سند..."
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">مرجع</label>
              <input {...register('reference')} className="input w-full" placeholder="اختیاری" />
            </div>
          </div>
        </div>

        {/* سطرهای سند */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-slate-800">سطرهای سند</span>
            </div>
            <button
              type="button"
              onClick={() => append({ accountId: '', debit: 0, credit: 0, description: '' })}
              className="btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> افزودن سطر
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 w-12">#</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 min-w-[280px]">حساب *</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">شرح</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">بدهکار</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-32">بستانکار</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-600 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, idx) => (
                  <tr key={field.id} className="hover:bg-slate-50/30">
                    <td className="px-3 py-2 text-center text-slate-400 num">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Controller
                        name={`lines.${idx}.accountId`}
                        control={control}
                        render={({ field: f }) => (
                          <AccountSelect
                            accounts={accounts}
                            value={f.value || ''}
                            onChange={f.onChange}
                            placeholder="جستجوی حساب..."
                          />
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`lines.${idx}.description`)}
                        className="input w-full text-xs"
                        placeholder="شرح..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lines.${idx}.debit`, { valueAsNumber: true })}
                        className="input w-full text-xs num text-left"
                        dir="ltr"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`lines.${idx}.credit`, { valueAsNumber: true })}
                        className="input w-full text-xs num text-left"
                        dir="ltr"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {fields.length > 2 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف سطر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-right font-bold text-slate-700">
                    جمع کل
                  </td>
                  <td className="px-3 py-3 text-left num font-bold" dir="ltr">
                    {formatNumber(totals.debit)}
                  </td>
                  <td className="px-3 py-3 text-left num font-bold" dir="ltr">
                    {formatNumber(totals.credit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* نمایش تراز */}
          <div className={clsx(
            'p-3 flex items-center gap-2 text-sm border-t',
            isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
          )}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold">سند تراز است</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  اختلاف: <span className="num font-bold" dir="ltr">{formatNumber(Math.abs(totals.debit - totals.credit))}</span> ریال
                  {totals.debit > totals.credit ? ' (بدهکار بیشتر)' : ' (بستانکار بیشتر)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* دکمه‌ها */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/accounting/journals')}
            className="btn-secondary"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={saving || !isBalanced}
            className="btn-primary"
            title={!isBalanced ? 'سند باید تراز باشد' : ''}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره تغییرات' : 'ثبت سند'}
          </button>
        </div>
      </form>
    </div>
  );
}
