import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Plus, Trash2, FileText, Calculator, RefreshCw,
} from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { contractsApi, LegalContract } from '@/modules/contracts/services/contracts.api';
import { api } from '@/services/api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project, Partner } from '@/types/project';
import { formatNumber } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

interface ItemForm {
  wbsItemId?: string;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface FormData {
  contractorId: string;
  contractId?: string;
  projectId: string;
  statementNumber: number;
  periodStart?: string;
  periodEnd?: string;
  prepaymentPercent: number;
  prepaymentDepreciation: number;
  insurancePercent: number;
  taxPercent: number;
  retentionPercent: number;
  otherDeduction: number;
  description?: string;
  items: ItemForm[];
}

const CONTRACTOR_KINDS = ['CONTRACTOR_AGREEMENT', 'SUBCONTRACTOR'];

export default function StatementFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const [contractors, setContractors] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [contracts, setContracts] = useState<LegalContract[]>([]);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, formState: { errors: _errors } } = useForm<FormData>({
    defaultValues: {
      statementNumber: 1,
      periodStart: todayLocalISO(),
      periodEnd: todayLocalISO(),
      prepaymentPercent: 0,
      prepaymentDepreciation: 0,
      insurancePercent: 7,
      taxPercent: 3,
      retentionPercent: 5,
      otherDeduction: 0,
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });
  const items = watch('items') || [];
  const projectId = watch('projectId');
  const contractorId = watch('contractorId');
  const contractId = watch('contractId');
  const insurancePercent = watch('insurancePercent') || 0;
  const taxPercent = watch('taxPercent') || 0;
  const retentionPercent = watch('retentionPercent') || 0;
  const otherDeduction = watch('otherDeduction') || 0;
  const prepaymentDepreciation = watch('prepaymentDepreciation') || 0;

  const totals = useMemo(() => {
    const totalAmount = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
    const insuranceAmount = (totalAmount * Number(insurancePercent)) / 100;
    const taxAmount = (totalAmount * Number(taxPercent)) / 100;
    const retentionAmount = (totalAmount * Number(retentionPercent)) / 100;
    const totalDeduction = insuranceAmount + taxAmount + retentionAmount + Number(prepaymentDepreciation) + Number(otherDeduction);
    const netPayable = totalAmount - totalDeduction;
    return { totalAmount, insuranceAmount, taxAmount, retentionAmount, totalDeduction, netPayable };
  }, [items, insurancePercent, taxPercent, retentionPercent, prepaymentDepreciation, otherDeduction]);

  // بارگذاری اولیه
  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      partnersApi.list({ type: 'CONTRACTOR' }).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(async ([cont, prj]) => {
      setContractors(cont);
      setProjects(prj);

      if (isEdit && id) {
        const s: any = await payrollApi.statements.get(id);
        setCurrentStatus(s.status);
        reset({
          contractorId: s.contractorId,
          contractId: s.contractId || undefined,
          projectId: s.projectId,
          statementNumber: s.statementNumber,
          periodStart: s.periodStart?.slice(0, 10),
          periodEnd: s.periodEnd?.slice(0, 10),
          prepaymentPercent: Number(s.prepaymentPercent),
          prepaymentDepreciation: Number(s.prepaymentDepreciation),
          insurancePercent: Number(s.insurancePercent),
          taxPercent: Number(s.taxPercent),
          retentionPercent: Number(s.retentionPercent),
          otherDeduction: Number(s.otherDeduction),
          description: s.description || undefined,
          items: (s.items || []).map((it: any) => ({
            wbsItemId: it.wbsItemId || undefined,
            description: it.description,
            unit: it.unit || undefined,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            notes: it.notes || undefined,
          })),
        });
      }
    }).catch(() => toast.error('خطا'))
      .finally(() => setLoadingData(false));
  }, [id, isEdit, reset]);

  // وقتی پیمانکار عوض می‌شود → قراردادهای پیمانکاری او
  useEffect(() => {
    if (!contractorId) { setContracts([]); return; }
    setLoadingContract(true);
    contractsApi.listByParty(contractorId)
      .then((all: LegalContract[]) => {
        const filtered = all.filter((c: LegalContract) =>
          CONTRACTOR_KINDS.includes(c.kind)
        );
        setContracts(filtered);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoadingContract(false));
  }, [contractorId]);

  // وقتی قرارداد انتخاب می‌شود → اقلام
  useEffect(() => {
    if (!contractId) return;
    const c = contracts.find((x) => x.id === contractId);
    if (!c) return;
    const cItems = (c as any).items || [];
    if (cItems.length === 0) return;
    replace(cItems.map((it: any) => ({
      description: it.description,
      unit: it.unit || undefined,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      notes: it.notes || undefined,
    })));
    toast.success('اقلام قرارداد بارگذاری شد');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // WBS
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload: any = {
        contractorId: data.contractorId,
        contractId: data.contractId || undefined,
        projectId: data.projectId,
        statementNumber: Number(data.statementNumber),
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        prepaymentPercent: Number(data.prepaymentPercent) || 0,
        prepaymentDepreciation: Number(data.prepaymentDepreciation) || 0,
        insurancePercent: Number(data.insurancePercent) || 0,
        taxPercent: Number(data.taxPercent) || 0,
        retentionPercent: Number(data.retentionPercent) || 0,
        otherDeduction: Number(data.otherDeduction) || 0,
        description: data.description || undefined,
        items: data.items.map((it) => ({
          wbsItemId: it.wbsItemId || undefined,
          description: it.description,
          unit: it.unit || undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          notes: it.notes || undefined,
        })),
      };

      if (isEdit && id) {
        const needsForce = !!currentStatus && currentStatus !== 'DRAFT' && currentStatus !== 'SUBMITTED';
        await payrollApi.statements.update(id, payload, needsForce);
        toast.success('ویرایش شد');
      } else {
        await payrollApi.statements.create(payload);
        toast.success('ایجاد شد');
      }
      navigate('/payroll/subcontractor-statements');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setLoading(false); }
  };

  const reloadItems = () => {
    if (!contractId) { toast.error('ابتدا قرارداد را انتخاب کنید'); return; }
    const c = contracts.find((x) => x.id === contractId);
    if (!c) return;
    const cItems = (c as any).items || [];
    replace(cItems.map((it: any) => ({
      description: it.description,
      unit: it.unit || undefined,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      notes: it.notes || undefined,
    })));
    toast.success('اقلام قرارداد بارگذاری شد');
  };

  if (loadingData) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش صورت‌وضعیت' : 'صورت‌وضعیت جدید'}
        </h1>
        <button onClick={() => navigate('/payroll/subcontractor-statements')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b">مشخصات صورت‌وضعیت</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">پیمانکار *</label>
              <select {...register('contractorId', { required: true })} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">قرارداد پیمانکاری</label>
              {loadingContract ? (
                <div className="input flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> در حال بارگذاری قراردادها...
                </div>
              ) : (
                <select {...register('contractId')} className="input" disabled={!contractorId || contracts.length === 0}>
                  <option value="">
                    {!contractorId ? '— ابتدا پیمانکار را انتخاب کنید —' :
                     contracts.length === 0 ? '— قراردادی برای این پیمانکار یافت نشد —' :
                     '— انتخاب کنید —'}
                  </option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-slate-500 mt-1">
                اقلام صورت‌وضعیت از این قرارداد بارگذاری می‌شوند (قابل ویرایش)
              </p>
            </div>
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">شماره صورت‌وضعیت *</label>
              <input type="number" {...register('statementNumber', { valueAsNumber: true })} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">از تاریخ *</label>
              <Controller name="periodStart" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div>
              <label className="label">تا تاریخ *</label>
              <Controller name="periodEnd" control={control}
                render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
            </div>
            <div className="md:col-span-3">
              <label className="label">توضیحات</label>
              <input type="text" {...register('description')} className="input" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">اقلام صورت‌وضعیت</h2>
            <div className="flex items-center gap-2">
              {contractId && (
                <button type="button" onClick={reloadItems}
                  className="btn-secondary text-sm" title="بارگذاری مجدد اقلام از قرارداد">
                  <RefreshCw className="w-4 h-4" /> بارگذاری از قرارداد
                </button>
              )}
              <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن قلم
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 w-10">#</th>
                  <th className="text-right px-2 py-2">ردیف WBS</th>
                  <th className="text-right px-2 py-2">شرح *</th>
                  <th className="text-center px-2 py-2 w-20">واحد</th>
                  <th className="text-center px-2 py-2 w-24">مقدار</th>
                  <th className="text-center px-2 py-2 w-32">بهای واحد</th>
                  <th className="text-left px-2 py-2 w-32">جمع</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => {
                  const q = Number(items[idx]?.quantity) || 0;
                  const p = Number(items[idx]?.unitPrice) || 0;
                  return (
                    <tr key={f.id}>
                      <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <select {...register(`items.${idx}.wbsItemId`)} className="input text-xs py-1.5">
                          <option value="">—</option>
                          {wbsItems.map((w) => (
                            <option key={w.id} value={w.id}>{w.indent}{w.code} — {w.title}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" {...register(`items.${idx}.description`, { required: true })} className="input text-xs py-1.5" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" {...register(`items.${idx}.unit`)} className="input text-xs py-1.5 text-center" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="1000" {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </td>
                      <td className="px-2 py-2 text-left">
                        <span className="num text-sm font-medium text-slate-800" dir="ltr">{formatNumber(q * p)}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b">کسورات و ضرایب</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">درصد پیش‌پرداخت (%)</label>
              <input type="number" step="0.01" {...register('prepaymentPercent')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">استهلاک پیش‌پرداخت (ریال)</label>
              <input type="number" step="1000000" {...register('prepaymentDepreciation')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">بیمه سهم کارفرما (%)</label>
              <input type="number" step="0.01" {...register('insurancePercent')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">مالیات تکلیفی (%)</label>
              <input type="number" step="0.01" {...register('taxPercent')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">حسن انجام کار (%)</label>
              <input type="number" step="0.01" {...register('retentionPercent')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">سایر کسورات (ریال)</label>
              <input type="number" step="1000000" {...register('otherDeduction')} className="input num" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-800">خلاصه مالی</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <TotalBox label="جمع اقلام" value={totals.totalAmount} />
            <TotalBox label={'بیمه (' + insurancePercent + '٪)'} value={totals.insuranceAmount} danger />
            <TotalBox label={'مالیات (' + taxPercent + '٪)'} value={totals.taxAmount} danger />
            <TotalBox label={'حسن انجام (' + retentionPercent + '٪)'} value={totals.retentionAmount} danger />
            <TotalBox label="استهلاک پیش‌پرداخت" value={Number(prepaymentDepreciation)} danger />
            <TotalBox label="سایر کسورات" value={Number(otherDeduction)} danger />
          </div>
          <div className="mt-4 pt-4 border-t-2 border-brand-300 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">جمع کسورات</div>
              <div className="text-lg font-bold text-rose-700 num" dir="ltr">{formatNumber(totals.totalDeduction)}</div>
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-500">خالص قابل پرداخت</div>
              <div className="text-2xl font-bold text-emerald-700 num" dir="ltr">
                {formatNumber(totals.netPayable)} <span className="text-xs font-normal">ریال</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border">
            <button type="button" onClick={() => navigate('/payroll/subcontractor-statements')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ثبت صورت‌وضعیت'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TotalBox({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={'text-sm font-bold num ' + (danger ? 'text-rose-700' : 'text-slate-800')} dir="ltr">
        {danger && '-'}{formatNumber(Math.abs(value))}
      </div>
    </div>
  );
}
