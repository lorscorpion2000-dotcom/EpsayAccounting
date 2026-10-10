import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Users, Calculator, AlertCircle, RefreshCw,
} from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { contractsApi, LegalContract } from '@/modules/contracts/services/contracts.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Partner, Project } from '@/types/project';
import { formatNumber, toPersianDigits } from '@/utils/format';
import { todayLocalISO } from '@/utils/local-date';

const WORKER_KINDS = ['WORKER_EMPLOYMENT'];

export default function WorkerStatementFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [partners, setPartners] = useState<Partner[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<LegalContract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // فرم
  const [partnerId, setPartnerId] = useState('');
  const [contractId, setContractId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [statementNumber, setStatementNumber] = useState(1);
  const [periodStart, setPeriodStart] = useState(todayLocalISO());
  const [periodEnd, setPeriodEnd] = useState(todayLocalISO());
  const [description, setDescription] = useState('');
  const [insurancePercent, setInsurancePercent] = useState(7);

  // داده
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [totals, setTotals] = useState<any>(null);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      partnersApi.list({ type: 'EMPLOYEE' }).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(async ([emps, prj]) => {
      setPartners(emps);
      setProjects(prj);
      if (isEdit && id) {
        const s: any = await (payrollApi as any).workerStatements.get(id);
        setPartnerId(s.partnerId);
        setContractId(s.contractId || '');
        setProjectId(s.projectId || '');
        setStatementNumber(s.statementNumber);
        setPeriodStart(s.periodStart?.slice(0, 10));
        setPeriodEnd(s.periodEnd?.slice(0, 10));
        setDescription(s.description || '');
        setInsurancePercent(Number(s.insurancePercent) || 7);
        setItems((s.items || []).map((it: any) => ({
          description: it.description,
          unit: it.unit || '',
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
          contractItemId: it.contractItemId || '',
          notes: it.notes || '',
        })));
        setTotals({
          totalEarnings: Number(s.totalEarnings),
          insuranceAmount: Number(s.totalInsurance),
          taxAmount: Number(s.totalTax),
          totalDeductions: Number(s.totalDeductions),
          netPayable: Number(s.netPayable),
        });
      }
    }).catch(() => toast.error('خطا'))
      .finally(() => setLoadingData(false));
  }, [id, isEdit]);

  // قراردادهای پرسنل
  useEffect(() => {
    if (!partnerId) { setContracts([]); return; }
    setLoadingContracts(true);
    contractsApi.listByParty(partnerId)
      .then((all: LegalContract[]) => {
        const filtered = all.filter((c) => WORKER_KINDS.includes(c.kind));
        setContracts(filtered);
        if (filtered.length === 1) setContractId(filtered[0].id);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoadingContracts(false));
  }, [partnerId]);

  const recalc = (itemsArr: any[]) => {
    const totalEarnings = itemsArr.reduce(
      (s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0,
    );
    const insuranceAmount = (totalEarnings * insurancePercent) / 100;
    const taxableBase = totalEarnings - insuranceAmount;
    // پیش‌نمایش مالیات (محاسبه‌ی دقیق سمت سرور انجام می‌شود)
    const taxAmount = totals?.taxAmount ?? 0; // در preview می‌آید
    const totalDeductions = insuranceAmount + taxAmount;
    return {
      totalEarnings,
      insuranceAmount,
      taxAmount,
      totalDeductions,
      netPayable: totalEarnings - totalDeductions,
    };
  };

  const reloadPreview = async () => {
    if (!partnerId || !periodStart || !periodEnd) {
      toast.error('پرسنل و دوره را انتخاب کنید');
      return;
    }
    setLoadingPreview(true);
    try {
      const p = await (payrollApi as any).workerStatements.preview({
        partnerId,
        contractId: contractId || undefined,
        periodStart,
        periodEnd,
      });
      setItems((p.items || []).map((it: any) => ({
        description: it.description,
        unit: it.unit || '',
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
        contractItemId: it.contractItemId || '',
        notes: it.notes || '',
      })));
      setSummary(p.summary);
      setTotals(p.totals);
      if (p.totals?.insurancePercent) setInsurancePercent(p.totals.insurancePercent);
      toast.success('محاسبه انجام شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در محاسبه');
    } finally { setLoadingPreview(false); }
  };

  const updateItem = (idx: number, patch: any) => {
    setItems((prev) => {
      const n = prev.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      n[idx].totalPrice = Number(n[idx].quantity) * Number(n[idx].unitPrice);
      setTotals(recalc(n));
      return n;
    });
  };

  const onSubmit = async () => {
    if (!partnerId || !periodStart || !periodEnd) {
      toast.error('پرسنل و دوره الزامی است');
      return;
    }
    if (items.length === 0) { toast.error('حداقل یک ردیف لازم است'); return; }

    setLoading(true);
    try {
      const payload = {
        partnerId, contractId: contractId || undefined,
        projectId: projectId || undefined,
        statementNumber,
        periodStart, periodEnd,
        description: description || undefined,
        insurancePercent,
        items: items.map((it) => ({
          description: it.description,
          unit: it.unit || undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          contractItemId: it.contractItemId || undefined,
          notes: it.notes || undefined,
        })),
      };
      const ws = (payrollApi as any).workerStatements;
      if (isEdit && id) {
        await ws.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        await ws.create(payload);
        toast.success('ثبت شد');
      }
      navigate('/payroll/worker-statements');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setLoading(false); }
  };

  if (loadingData) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش صورت‌وضعیت پرسنل' : 'صورت‌وضعیت پرسنل جدید'}
        </h1>
        <button onClick={() => navigate('/payroll/worker-statements')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b">مشخصات</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">پرسنل *</label>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input" disabled={isEdit}>
              <option value="">— انتخاب کنید —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">قرارداد کارگری</label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="input" disabled={loadingContracts || contracts.length === 0}>
              <option value="">
                {loadingContracts ? 'در حال بارگذاری...' : contracts.length === 0 ? '— قراردادی یافت نشد —' : '— انتخاب کنید —'}
              </option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">پروژه</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">شماره صورت‌وضعیت</label>
            <input type="number" value={statementNumber} onChange={(e) => setStatementNumber(Number(e.target.value))} className="input num" dir="ltr" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={reloadPreview} disabled={loadingPreview || !partnerId} className="btn-primary w-full">
              {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              محاسبه از حضور و غیاب
            </button>
          </div>
          <div>
            <label className="label">از تاریخ *</label>
            <PersianDatePicker value={periodStart} onChange={(v) => setPeriodStart(v || '')} />
          </div>
          <div>
            <label className="label">تا تاریخ *</label>
            <PersianDatePicker value={periodEnd} onChange={(v) => setPeriodEnd(v || '')} />
          </div>
          <div>
            <label className="label">درصد بیمه</label>
            <input type="number" step="0.01" value={insurancePercent} onChange={(e) => setInsurancePercent(Number(e.target.value))} className="input num" dir="ltr" />
          </div>
          <div className="md:col-span-3">
            <label className="label">توضیحات</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
          </div>
        </div>

        {summary && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
            <div className="text-xs text-slate-500 mb-2">خلاصه کارکرد دوره:</div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div><span className="text-slate-500">روز کارکرد: </span><span className="num font-bold">{toPersianDigits(summary.workDays)}</span></div>
              <div><span className="text-slate-500">اضافه‌کار: </span><span className="num font-bold">{toPersianDigits(summary.overtimeHours)}</span></div>
              <div><span className="text-slate-500">تعطیلی: </span><span className="num font-bold">{toPersianDigits(summary.holidayHours)}</span></div>
              <div><span className="text-slate-500">غیبت: </span><span className="num font-bold">{toPersianDigits(summary.absentDays)}</span></div>
              <div><span className="text-slate-500">مرخصی: </span><span className="num font-bold">{toPersianDigits(summary.leaveDays)}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b">اقلام حقوق</h2>
        {items.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-lg">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              پرسنل و قرارداد را انتخاب کنید، سپس دکمه «محاسبه از حضور و غیاب» را بزنید
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-2 w-10">#</th>
                  <th className="text-right px-2 py-2">شرح</th>
                  <th className="text-center px-2 py-2 w-20">واحد</th>
                  <th className="text-center px-2 py-2 w-24">مقدار</th>
                  <th className="text-center px-2 py-2 w-32">بهای واحد</th>
                  <th className="text-left px-2 py-2 w-32">جمع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2 text-center text-slate-500 num">{toPersianDigits(idx + 1)}</td>
                    <td className="px-2 py-2">
                      <input type="text" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} className="input text-xs py-1.5" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={it.unit || ''} onChange={(e) => updateItem(idx, { unit: e.target.value })} className="input text-xs py-1.5 text-center" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" step="0.01" value={it.quantity || 0} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" step="1000" value={it.unitPrice || 0} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                    </td>
                    <td className="px-2 py-2 text-left">
                      <span className="num text-sm font-medium text-slate-800" dir="ltr">{formatNumber(Number(it.quantity) * Number(it.unitPrice))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totals && (
        <div className="card p-6 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-800">خلاصه مالی</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Box label="جمع دریافتی" value={totals.totalEarnings} />
            <Box label={'بیمه (' + insurancePercent + '٪)'} value={totals.insuranceAmount} danger />
            <Box label="مالیات پله‌ای" value={totals.taxAmount} danger />
            <Box label="جمع کسورات" value={totals.totalDeductions} danger />
            <Box label="خالص قابل پرداخت" value={totals.netPayable} highlight />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border">
          <button type="button" onClick={() => navigate('/payroll/worker-statements')} className="btn-secondary">انصراف</button>
          <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Box({ label, value, danger, highlight }: { label: string; value: number; danger?: boolean; highlight?: boolean }) {
  return (
    <div className={'rounded-lg p-3 border ' + (highlight ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200')}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={'text-sm font-bold num ' + (danger ? 'text-rose-700' : highlight ? 'text-emerald-700' : 'text-slate-800')} dir="ltr">
        {danger && '-'}{formatNumber(Math.abs(value))}
      </div>
    </div>
  );
}
