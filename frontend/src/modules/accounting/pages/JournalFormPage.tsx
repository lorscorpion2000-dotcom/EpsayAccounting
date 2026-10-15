import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, X, Loader2, Plus, Trash2, CheckCircle2, AlertCircle,
  FileText, Printer, ClipboardPaste, Copy, ArrowUp, ArrowDown,
  Keyboard,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import AccountSelect from '../components/AccountSelect';
import MoneyInput from '../components/MoneyInput';
import TemplatePicker from '../components/TemplatePicker';
import PasteDialog from '../components/PasteDialog';
import type { Account, FiscalYear } from '@/types/accounting';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';
import { getApiErrorMessage, applyApiErrorsToForm } from '@/utils/api-error';

const lineSchema = z.object({
  accountId: z.string(),
  description: z.string().optional(),
  debit: z.number({ invalid_type_error: 'مبلغ بدهکار نامعتبر است' }).nonnegative(),
  credit: z.number({ invalid_type_error: 'مبلغ بستانکار نامعتبر است' }).nonnegative(),
});

const journalSchema = z.object({
  entryDate: z.string().optional(),
  fiscalYearId: z.string().min(1, 'سال مالی الزامی است'),
  description: z.string().trim().min(1, 'شرح سند الزامی است'),
  reference: z.string().optional(),
  lines: z.array(lineSchema),
});

type LineForm = z.infer<typeof lineSchema>;
type FormData = z.infer<typeof journalSchema>;

const emptyLine = (): LineForm => ({ accountId: '', debit: 0, credit: 0, description: '' });

const PRINT_CSS = `
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: white !important; }
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
  .print-header { text-align: center; margin-bottom: 8mm; border-bottom: 2px solid #000; padding-bottom: 4mm; }
  .print-company { font-size: 16pt; font-weight: bold; }
  .print-title { font-size: 14pt; margin-top: 2mm; }
  .print-meta { display: flex; justify-content: space-between; margin-bottom: 6mm; font-size: 10pt; }
  .print-table { width: 100%; border-collapse: collapse; font-size: 10pt; table-layout: fixed; }
  .print-table th, .print-table td { border: 1px solid #333; padding: 2mm; word-wrap: break-word; }
  .print-table th { background: #f0f0f0; font-weight: bold; }
  .print-table th.align-right  { text-align: right; }
  .print-table th.align-center { text-align: center; }
  .print-table th.align-left   { text-align: left; }
  .print-table tfoot td { font-weight: bold; background: #f8f8f8; }
  .print-table td { text-align: right; }
  .print-num { text-align: left; font-family: monospace; }
  .print-center { text-align: center; }
  .print-right { text-align: right; }
  .print-desc { margin-top: 6mm; font-size: 10pt; border: 1px solid #999; padding: 3mm; }
  .print-signatures { margin-top: 12mm; display: flex; justify-content: space-around; font-size: 10pt; }
}
`;

export default function JournalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { register, control, handleSubmit, reset, setValue, setError, getValues } = useForm<FormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      entryDate: todayLocalISO(),
      fiscalYearId: '',
      description: '',
      reference: '',
      lines: [emptyLine(), emptyLine()],
    },
  });

  const { fields, append, remove, insert, move } = useFieldArray({ control, name: 'lines' });
  const watchedLines = useWatch({ control, name: 'lines' });
  const watchedDate = useWatch({ control, name: 'entryDate' });
  const watchedDesc = useWatch({ control, name: 'description' });
  const watchedRef = useWatch({ control, name: 'reference' });
  const watchedFyId = useWatch({ control, name: 'fiscalYearId' });

  const totals = useMemo(
    () => (watchedLines || []).reduce(
      (sum: any, l: any) => ({
        debit: sum.debit + (Number(l?.debit) || 0),
        credit: sum.credit + (Number(l?.credit) || 0),
      }),
      { debit: 0, credit: 0 },
    ),
    [watchedLines],
  );

  const diff = Math.abs(totals.debit - totals.credit);
  const isBalanced = diff < 0.01 && totals.debit > 0;

  const suspectRow = useMemo(() => {
    if (isBalanced || diff === 0 || !watchedLines) return null;
    for (let i = 0; i < watchedLines.length; i++) {
      const l = watchedLines[i] as any;
      const d = Number(l?.debit) || 0;
      const c = Number(l?.credit) || 0;
      if (Math.abs(d - diff) < 0.01 || Math.abs(c - diff) < 0.01) return i;
    }
    return null;
  }, [watchedLines, diff, isBalanced]);

  const currentFy = fiscalYears.find((f) => f.id === watchedFyId);
  const currentFyName = currentFy?.name || '—';

  useEffect(() => {
    const existing = document.getElementById('journal-print-styles');
    if (existing) existing.remove();
    const el = document.createElement('style');
    el.id = 'journal-print-styles';
    el.textContent = PRINT_CSS;
    document.head.appendChild(el);
    return () => {
      const e = document.getElementById('journal-print-styles');
      if (e) e.remove();
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [accs, fys] = await Promise.all([
          accountingApi.accounts.postable(),
          accountingApi.fiscalYears.list(),
        ]);
        setAccounts(Array.isArray(accs) ? accs : []);
        setFiscalYears(Array.isArray(fys) ? fys : []);
        const current = (fys || []).find((f: any) => f.isCurrent) || fys?.[0];
        if (isEdit && id) {
          const entry = await accountingApi.journals.get(id);
          reset({
            entryDate: entry.entryDate?.slice(0, 10) || '',
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
          setValue('fiscalYearId', current.id);
        }
      } catch (e: any) {
        toast.error('خطا در بارگذاری اطلاعات');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, reset, setValue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('journal-submit')?.click();
        return;
      }
      if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        append(emptyLine());
        return;
      }
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        window.print();
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && isTyping) {
        (target as HTMLInputElement).blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [append]);

  const duplicateRow = (idx: number) => {
    const vals = getValues('lines');
    insert(idx + 1, { ...vals[idx] });
  };

  const applyTemplate = (lines: Array<{ accountId: string; description?: string; debit: number; credit: number }>) => {
    reset((prev: any) => ({
      ...prev,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        description: l.description || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    }));
  };

  const importFromPaste = (rows: Array<{ accountCode: string; description: string; debit: number; credit: number }>) => {
    const mapped: LineForm[] = [];
    const notFound: string[] = [];
    for (const r of rows) {
      const acc = accounts.find((a) => a.code === r.accountCode);
      if (!acc) { notFound.push(r.accountCode); continue; }
      mapped.push({ accountId: acc.id, description: r.description, debit: r.debit, credit: r.credit });
    }
    if (mapped.length === 0) { toast.error('هیچ حسابی پیدا نشد'); return; }
    if (notFound.length) toast.warning('این کدها پیدا نشدند: ' + notFound.join('، '));
    const valid = mapped.filter((l) => l.debit > 0 || l.credit > 0);
    if (valid.length === 0) { toast.error('هیچ مبلغی وارد نشده'); return; }
    reset((prev: any) => ({ ...prev, lines: mapped }));
    toast.success(valid.length + ' ردیف اضافه شد');
  };

  const onSubmit = async (data: FormData) => {
    if (!data.fiscalYearId) { toast.error('سال مالی الزامی است'); return; }
    if (!data.entryDate) { toast.error('تاریخ سند الزامی است'); return; }
    if (!data.description?.trim()) { toast.error('شرح سند الزامی است'); return; }
    const validLines = (data.lines || []).filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) { toast.error('حداقل دو سطر معتبر نیاز است'); return; }
    const totalDebit = validLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { toast.error('سند تراز نیست'); return; }
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
      const failed = applyApiErrorsToForm(e, setError);
      if (failed.length === 0) toast.error(getApiErrorMessage(e));
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
    <div className="space-y-4 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/journals')} className="btn-secondary">
            <X className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-600" />
              {isEdit ? 'ویرایش سند حسابداری' : 'سند حسابداری جدید'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ثبت دوبل با کنترل خودکار تراز —
              <span className="text-brand-600 cursor-pointer mr-1" onClick={() => setShortcutsOpen(true)}>کلیدهای میان‌بر</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TemplatePicker accounts={accounts} currentLines={(watchedLines as any) || []} onApply={applyTemplate} />
          <button type="button" onClick={() => setPasteOpen(true)} className="btn-secondary text-sm" title="ورود گروهی از Excel">
            <ClipboardPaste className="w-4 h-4" />
            Paste
          </button>
          <button type="button" onClick={() => window.print()} className="btn-secondary text-sm" title="چاپ / PDF (Ctrl+P)">
            <Printer className="w-4 h-4" />
            چاپ
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ سند *</label>
              <Controller name="entryDate" control={control} render={({ field }) => (
                <PersianDatePicker value={field.value || ''} onChange={(v: string | null) => field.onChange(v || '')} />
              )} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">سال مالی *</label>
              <select {...register('fiscalYearId')} className="input w-full" disabled={isEdit}>
                <option value="">— انتخاب —</option>
                {fiscalYears.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name} {f.isCurrent ? '(جاری)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">شرح سند *</label>
              <input {...register('description')} className="input w-full" placeholder="شرح کلی سند..." />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">مرجع (اختیاری)</label>
              <input {...register('reference')} className="input w-full" placeholder="شماره فاکتور، چک، قرارداد..." />
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-sm">سطرهای سند</span>
              <span className="text-xs text-slate-400">({fields.length} سطر)</span>
            </div>
            <button type="button" onClick={() => append(emptyLine())} className="btn-secondary text-xs" title="Ctrl+I">
              <Plus className="w-3.5 h-3.5" />
              افزودن سطر
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 min-w-[260px]">حساب *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 min-w-[160px]">شرح</th>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-40">بدهکار</th>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-40">بستانکار</th>
                  <th className="text-center px-2 py-2 w-28 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, idx) => {
                  const isSuspect = suspectRow === idx;
                  return (
                    <tr key={field.id} className={clsx('hover:bg-slate-50/30 group', isSuspect && 'bg-amber-50/50')}>
                      <td className="px-2 py-1.5 text-center text-slate-400 text-xs num">
                        {idx + 1}
                        {isSuspect && <span className="block text-[9px] text-amber-600">مشکوک</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller name={`lines.${idx}.accountId` as any} control={control} render={({ field: f }) => (
                          <AccountSelect accounts={accounts} value={f.value || ''} onChange={f.onChange} placeholder="جستجوی کد یا نام..." />
                        )} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input {...register(`lines.${idx}.description` as any)} className="input w-full text-xs" placeholder="شرح ردیف" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller name={`lines.${idx}.debit` as any} control={control} render={({ field: f }) => (
                          <MoneyInput value={Number(f.value) || 0} onChange={f.onChange} />
                        )} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller name={`lines.${idx}.credit` as any} control={control} render={({ field: f }) => (
                          <MoneyInput value={Number(f.value) || 0} onChange={f.onChange} />
                        )} />
                      </td>
                      <td className="px-2 py-1.5 no-print">
                        <div className="flex items-center justify-center gap-0.5 opacity-30 group-hover:opacity-100 transition">
                          <button type="button" onClick={() => duplicateRow(idx)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="کپی">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {idx > 0 && (
                            <button type="button" onClick={() => move(idx, idx - 1)} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="بالا">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < fields.length - 1 && (
                            <button type="button" onClick={() => move(idx, idx + 1)} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="پایین">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {fields.length > 2 && (
                            <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-bold text-slate-700">جمع کل</td>
                  <td className="px-3 py-2 text-center num font-bold" dir="ltr">{formatNumber(totals.debit)}</td>
                  <td className="px-3 py-2 text-center num font-bold" dir="ltr">{formatNumber(totals.credit)}</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className={clsx(
            'p-4 flex items-center gap-3 text-sm border-t-2',
            isBalanced ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300',
          )}>
            {isBalanced ? (
              <>
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <span className="font-bold text-base">سند تراز است — آماده ثبت</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-base">
                    اختلاف: <span className="num" dir="ltr">{formatNumber(diff)}</span> ریال
                    {' '}({totals.debit > totals.credit ? 'بدهکار بیشتر' : 'بستانکار بیشتر'})
                  </div>
                  {suspectRow !== null && (
                    <div className="text-xs mt-1">💡 احتمالاً ردیف {suspectRow + 1} مشکل دارد</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 no-print">
          <button type="button" onClick={() => setShortcutsOpen(true)} className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" />
            کلیدهای میان‌بر (F1)
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/accounting/journals')} className="btn-secondary">انصراف</button>
            <button id="journal-submit" type="submit" disabled={saving || !isBalanced} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره تغییرات' : 'ذخیره پیش‌نویس'}
            </button>
          </div>
        </div>
      </form>

      <div className="print-only">
        <div className="print-header">
          <div className="print-company">شرکت ساختمانی اپسای</div>
          <div className="print-title">{isEdit ? 'سند حسابداری (ویرایش)' : 'سند حسابداری'}</div>
        </div>
        <div className="print-meta">
          <span><b>شماره:</b> {isEdit ? (id || '').slice(0, 8) : '(جدید)'}</span>
          <span><b>تاریخ:</b> {watchedDate ? formatJalaliDate(watchedDate) : '—'}</span>
          <span><b>سال مالی:</b> {currentFyName}</span>
        </div>
        <table className="print-table">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="align-center">#</th>
              <th className="align-left">کد حساب</th>
              <th className="align-right">نام حساب</th>
              <th className="align-right">شرح</th>
              <th className="align-left">بدهکار</th>
              <th className="align-left">بستانکار</th>
            </tr>
          </thead>
          <tbody>
            {(watchedLines || []).map((l: any, i: number) => {
              if (!l?.accountId || (!l.debit && !l.credit)) return null;
              const acc = accounts.find((a) => a.id === l.accountId);
              return (
                <tr key={i}>
                  <td className="print-center">{i + 1}</td>
                  <td className="print-num" dir="ltr">{acc?.code || ''}</td>
                  <td>{acc?.name || ''}</td>
                  <td>{l.description || ''}</td>
                  <td className="print-num" dir="ltr">{l.debit ? formatNumber(l.debit) : ''}</td>
                  <td className="print-num" dir="ltr">{l.credit ? formatNumber(l.credit) : ''}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="print-right"><b>جمع کل</b></td>
              <td className="print-num" dir="ltr"><b>{formatNumber(totals.debit)}</b></td>
              <td className="print-num" dir="ltr"><b>{formatNumber(totals.credit)}</b></td>
            </tr>
          </tfoot>
        </table>
        <div className="print-desc">
          <b>شرح:</b> {watchedDesc || '—'}
          {watchedRef ? <span className="mr-4"> <b>مرجع:</b> {watchedRef}</span> : null}
        </div>
        <div className="print-signatures">
          <div>تهیه‌کننده: ____________</div>
          <div>تأییدکننده: ____________</div>
          <div>مدیر مالی: ____________</div>
        </div>
      </div>

      <PasteDialog open={pasteOpen} accounts={accounts} onClose={() => setPasteOpen(false)} onImport={importFromPaste} />

      {shortcutsOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm no-print" onClick={() => setShortcutsOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">کلیدهای میان‌بر</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Ctrl + I', 'افزودن سطر جدید'],
                ['Ctrl + Enter', 'ذخیره سند'],
                ['Ctrl + P', 'چاپ / PDF'],
                ['F1', 'باز/بستن این پنجره'],
                ['Tab', 'فیلد بعدی'],
                ['Escape', 'لغو فوکوس'],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between border-b last:border-0 pb-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono" dir="ltr">{k}</kbd>
                  <span className="text-slate-600">{d}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShortcutsOpen(false)} className="btn-primary w-full mt-4">بستن</button>
          </div>
        </div>
      )}
    </div>
  );
}