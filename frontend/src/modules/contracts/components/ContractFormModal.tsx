import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { X, Save, Loader2, Plus, FileText, Trash2, Calculator } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractParty, LegalContractItem, WageBreakdown } from '../services/contracts.api';
import { projectsApi } from '@/modules/projects/services/projects.api';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { payrollApi } from '@/modules/payroll/services/payroll.api';
import { formatNumber } from '@/utils/format';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import PartyFormModal from './PartyFormModal';
import { PersianDatePicker } from '@/components/PersianDatePicker';

/**
 * پیش‌نمایش HTML قالب با هایلایت placeholderها و نقطه‌چین‌ها
 */
function highlightPlaceholders(html: string): string {
  if (!html || html.length < 5) {
    return '<span style="color:#94a3b8;font-style:italic">(خالی — بعد از انتخاب نوع قرارداد، قالب خودکار لود میشه)</span>';
  }
  // F3: sanitize preview — حذف script/style/iframe/on* قبل از هر پردازش
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','b','i','u','strong','em','br','hr','span','div','section','article',
      'h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','caption','colgroup','col',
      'ul','ol','li','a'],
    ALLOWED_ATTR: ['style','dir','class','title','colspan','rowspan','width','height','align','valign','href','target','rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script','iframe','object','embed','form','input','button','textarea','select','style','link','meta'],
    FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onfocus','onblur','onchange','onsubmit','onmouseenter','onmouseleave'],
  });
  // هایلایت {{placeholder}}
  let out = sanitized.replace(
    /\{\{([^}]+)\}\}/g,
    '<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-weight:bold;font-size:11px;border:1px solid #fcd34d">{{$1}}</span>'
  );
  // هایلایت نقطه‌چین‌ها
  out = out.replace(
    /\.{5,}/g,
    (m) => `<span style="background:#fee2e2;color:#991b1b;padding:1px 5px;border-radius:3px;font-size:10px;border:1px solid #fca5a5" title="${m.length} نقطه — نیاز به پرکردن دستی یا placeholder دارد">⬤ ${m.length}</span>`
  );
  return out;
}

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const isEmployeeKind = (kind: string) => kind === 'WORKER_EMPLOYMENT';

const isContractorKind = (kind: string) =>
  kind === 'CONTRACTOR_AGREEMENT' || kind === 'SUBCONTRACTOR' || kind === 'CLIENT_CONTRACT';

// ردیف‌های پیش‌فرض برای قرارداد کارگری
const defaultWorkerItems = (): LegalContractItem[] => [
  { rowNumber: 1, description: 'حقوق پایه', unit: 'روز', quantity: 30, unitPrice: 0 },
  { rowNumber: 2, description: 'بن کارگری', unit: 'روز', quantity: 30, unitPrice: 0 },
  { rowNumber: 3, description: 'حق مسکن', unit: 'روز', quantity: 30, unitPrice: 0 },
  { rowNumber: 4, description: 'حق اولاد', unit: 'روز', quantity: 30, unitPrice: 0 },
];

interface Props {
  isOpen: boolean;
  editing: LegalContract | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContractFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<LegalContractParty[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [loadingContractorData, setLoadingContractorData] = useState(false);
  const [items, setItems] = useState<LegalContractItem[]>([]);
  // B15.6: پیوست ۱ — تفکیک حقوق و مزایا
  const [wage, setWage] = useState<WageBreakdown>({
    baseSalary: '', housingAllow: '', foodAllow: '', childAllow: '',
    missionAllow: '', overtimeAllow: '', attractionAllow: '',
    positionAllow: '', seniority: '', insuranceShare: '',
  });

  const [form, setForm] = useState<any>({
    kind: 'WORKER_EMPLOYMENT',
    title: '',
    partyId: '',
    projectId: '',
    registrationNumber: '',
    registrationDate: '',
    subject: '',
    bodyHtml: '',
    totalAmount: '',
    salaryMonthly: '',
    salaryDaily: '',
    salaryHourly: '',
    workHoursPerWeek: '',
    startDate: '',
    endDate: '',
    durationText: '',
    workLocation: '',
    guaranteeType: '',
    guaranteeNumber: '',
    guaranteeAmount: '',
    guaranteeBank: '',
    supervisorName: '',
    companySignerName: '',
    workerSignerName: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setPendingFiles([]);
    setSelectedEmployeeId('');
    Promise.all([
      contractsApi.listParties(),
      projectsApi.list().catch(() => []),
      payrollApi.employees.list({ active: true }).catch(() => []),
      partnersApi.list({ type: 'CONTRACTOR' }).catch(() => []),
    ]).then(([p, pr, emps, contrs]) => {
      setParties(p);
      setProjects(pr as any[]);
      setEmployees(Array.isArray(emps) ? emps : []);
      setContractors(Array.isArray(contrs) ? contrs : []);
    });
    if (editing) {
      setForm({
        kind: editing.kind,
        title: editing.title,
        partyId: editing.partyId,
        projectId: editing.projectId || '',
        registrationNumber: editing.registrationNumber || '',
        registrationDate: editing.registrationDate?.slice(0, 10) || '',
        subject: editing.subject || '',
        bodyHtml: editing.bodyHtml || '',
        totalAmount: editing.totalAmount ? String(editing.totalAmount) : '',
        salaryMonthly: editing.salaryMonthly ? String(editing.salaryMonthly) : '',
        salaryDaily: editing.salaryDaily ? String(editing.salaryDaily) : '',
        salaryHourly: editing.salaryHourly ? String(editing.salaryHourly) : '',
        workHoursPerWeek: editing.workHoursPerWeek || '',
        startDate: editing.startDate?.slice(0, 10) || '',
        endDate: editing.endDate?.slice(0, 10) || '',
        durationText: editing.durationText || '',
        workLocation: editing.workLocation || '',
        guaranteeType: editing.guaranteeType || '',
        guaranteeNumber: editing.guaranteeNumber || '',
        guaranteeAmount: editing.guaranteeAmount ? String(editing.guaranteeAmount) : '',
        guaranteeBank: editing.guaranteeBank || '',
        supervisorName: editing.supervisorName || '',
        companySignerName: editing.companySignerName || '',
        workerSignerName: editing.workerSignerName || '',
        notes: editing.notes || '',
      });
      setItems((editing.items || []).map((it: any, idx: number) => ({
        rowNumber: it.rowNumber ?? idx + 1,
        description: it.description,
        unit: it.unit || '',
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        notes: it.notes || '',
      })));
      // B15.6: load wage breakdown
      const wb = (editing.wageBreakdown || {}) as any;
      setWage({
        baseSalary:     wb.baseSalary     != null ? String(wb.baseSalary)     : '',
        housingAllow:   wb.housingAllow   != null ? String(wb.housingAllow)   : '',
        foodAllow:      wb.foodAllow      != null ? String(wb.foodAllow)      : '',
        childAllow:     wb.childAllow     != null ? String(wb.childAllow)     : '',
        missionAllow:   wb.missionAllow   != null ? String(wb.missionAllow)   : '',
        overtimeAllow:  wb.overtimeAllow  != null ? String(wb.overtimeAllow)  : '',
        attractionAllow:wb.attractionAllow!= null ? String(wb.attractionAllow): '',
        positionAllow:  wb.positionAllow  != null ? String(wb.positionAllow)  : '',
        seniority:      wb.seniority      != null ? String(wb.seniority)      : '',
        insuranceShare: wb.insuranceShare != null ? String(wb.insuranceShare) : '',
      });
    } else {
      setForm({
        kind: 'WORKER_EMPLOYMENT', title: '', partyId: '', projectId: '',
        registrationNumber: '', registrationDate: '', subject: '', bodyHtml: '',
        totalAmount: '', salaryMonthly: '', salaryDaily: '', salaryHourly: '',
        workHoursPerWeek: '', startDate: '', endDate: '', durationText: '',
        workLocation: '', guaranteeType: '', guaranteeNumber: '', guaranteeAmount: '',
        guaranteeBank: '', supervisorName: '', companySignerName: '',
        workerSignerName: '', notes: '',
      });
      setItems(defaultWorkerItems());
      // B15.6: reset wage
      setWage({
        baseSalary: '', housingAllow: '', foodAllow: '', childAllow: '',
        missionAllow: '', overtimeAllow: '', attractionAllow: '',
        positionAllow: '', seniority: '', insuranceShare: '',
      });
    }
  }, [isOpen, editing]);

  // Auto-load template when kind changes (if bodyHtml is empty)
  useEffect(() => {
    if (!isOpen) return;
    if (!form.kind) return;
    if (form.bodyHtml && form.bodyHtml.length > 50) return;

    let cancelled = false;
    contractsApi.getTemplate(form.kind)
      .then((tpl: any) => {
        if (cancelled) return;
        if (tpl && tpl.bodyHtml) {
          set('bodyHtml', tpl.bodyHtml);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, form.kind]);

  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const reloadParties = async () => {
    const p = await contractsApi.listParties();
    setParties(p);
  };

  const handleEmployeePick = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      set('partyId', '');
      return;
    }
    setLoadingEmployeeData(true);
    try {
      const party = await contractsApi.findOrCreatePartyFromEmployee(employeeId);
      const emp = employees.find((e: any) => e.id === employeeId);
      setForm((f: any) => ({
        ...f,
        partyId: party.id,
        salaryMonthly: emp?.baseSalary ? String(emp.baseSalary) : f.salaryMonthly,
        salaryDaily: emp?.dailyWage ? String(emp.dailyWage) : f.salaryDaily,
        salaryHourly: emp?.hourlyWage ? String(emp.hourlyWage) : f.salaryHourly,
        workHoursPerWeek: f.workHoursPerWeek || '44',
      }));
      // B15.6: auto-fill از پرونده پرسنلی
      setWage((w) => ({
        ...w,
        baseSalary:      emp?.baseSalary   != null ? String(emp.baseSalary)   : w.baseSalary,
        housingAllow:    emp?.housingAllow != null ? String(emp.housingAllow) : w.housingAllow,
        foodAllow:       emp?.foodAllow    != null ? String(emp.foodAllow)    : w.foodAllow,
        childAllow:      emp?.childAllow   != null ? String(emp.childAllow)   : w.childAllow,
        seniority:       emp?.otherAllow   != null ? String(emp.otherAllow)   : w.seniority,
      }));
      await reloadParties();
      toast.success('اطلاعات پرسنل بارگذاری شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بارگذاری اطلاعات پرسنل');
      setSelectedEmployeeId('');
    } finally {
      setLoadingEmployeeData(false);
    }
  };

  const handleContractorPick = async (partnerId: string) => {
    setSelectedContractorId(partnerId);
    if (!partnerId) {
      set('partyId', '');
      return;
    }
    setLoadingContractorData(true);
    try {
      const party = await contractsApi.findOrCreatePartyFromPartner(partnerId);
      setForm((f: any) => ({ ...f, partyId: party.id }));
      await reloadParties();
      toast.success('اطلاعات پیمانکار بارگذاری شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بارگذاری اطلاعات پیمانکار');
      setSelectedContractorId('');
    } finally {
      setLoadingContractorData(false);
    }
  };

  // ─── helpers برای جدول اجزا ───
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { rowNumber: prev.length + 1, description: '', unit: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<LegalContractItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const itemsTotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('عنوان الزامی است'); return; }
    if (!form.partyId) {
      toast.error(isEmployeeKind(form.kind) ? 'پرسنل را انتخاب کنید' : 'طرف قرارداد را انتخاب کنید');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['totalAmount', 'salaryMonthly', 'salaryDaily', 'salaryHourly', 'guaranteeAmount', 'workHoursPerWeek'].forEach((k) => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
        else payload[k] = Number(payload[k]);
      });
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });

      // B15.6: پیوست ۱ — تفکیک حقوق و مزایا
      if (isEmployeeKind(form.kind)) {
        const wb: any = {};
        Object.entries(wage).forEach(([k, v]: any) => {
          if (v !== '' && v !== null && v !== undefined) {
            const n = Number(v);
            if (Number.isFinite(n)) wb[k] = n;
          }
        });
        payload.wageBreakdown = wb;
      }

      // اجزای اجرای قرارداد
      payload.items = items
        .filter((it) => it.description && it.description.trim())
        .map((it, idx) => ({
          rowNumber: idx + 1,
          description: it.description.trim(),
          unit: it.unit || undefined,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          notes: it.notes || undefined,
        }));

      // اگر اجزا داریم، totalAmount را از Σ بگذار
      if (payload.items.length > 0) {
        payload.totalAmount = payload.items.reduce(
          (s: number, it: any) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          0,
        );
      }
      if (editing) {
        await contractsApi.update(editing.id, payload);
      } else {
        const saved = await contractsApi.create(payload);
        if (pendingFiles.length > 0 && (saved as any)?.id) {
          try {
            await attachmentsApi.createMany('LEGAL_CONTRACT', (saved as any).id, pendingFiles);
          } catch (e) { console.error('خطا در پیوستها', e); }
        }
      }
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      const status = e?.response?.status;
      console.error('❌ Contract save failed:');
      console.error('   status:', status);
      console.error('   message:', m);
      console.error('   full data:', e?.response?.data);
      toast.error(Array.isArray(m) ? m[0] : (typeof m === 'string' ? m : JSON.stringify(m) || 'خطا'));
    } finally { setSaving(false); }
  };

  const loadTemplate = async () => {
    if (!form.kind) return;
    setLoadingTemplate(true);
    try {
      const tpl = await contractsApi.getTemplate(form.kind);
      if (!tpl || !tpl.bodyHtml) {
        toast.info('قالبی برای این نوع قرارداد ذخیره نشده');
        return;
      }
      set('bodyHtml', tpl.bodyHtml);
      toast.success('قالب بارگذاری شد');
    } catch { toast.error('خطا در بارگذاری قالب'); }
    finally { setLoadingTemplate(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-8">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="text-lg font-bold text-slate-800">
              {editing ? 'ویرایش قرارداد' : 'قرارداد جدید'}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع قرارداد *</label>
                <select
                  value={form.kind}
                  onChange={(e) => {
                   const newKind = e.target.value;
                   setForm((f: any) => ({
                    ...f,
                    kind: newKind,
                    bodyHtml: '',  // ← Force reload of template
                   }));
                   if (newKind === 'WORKER_EMPLOYMENT') {
                    setItems(defaultWorkerItems());
                   } else if (items.length > 0 && items.every((it) => ['حقوق پایه','بن کارگری','حق مسکن','حق اولاد'].includes(it.description))) {
                   setItems([]);
                   }
                  }}
                  className="input w-full"
                >
                  {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان قرارداد *</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input w-full" />
              </div>

              {/* ─── Picker: Employee vs Party ─────────────────── */}
              {isContractorKind(form.kind) ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">پیمانکار *</label>
                  <select
                    value={selectedContractorId}
                    onChange={(e) => handleContractorPick(e.target.value)}
                    className="input w-full"
                    disabled={loadingContractorData}
                  >
                    <option value="">— انتخاب پیمانکار از دایرکتوری اشخاص —</option>
                    {contractors.length === 0 ? (
                      <option value="" disabled>
                        (هیچ پیمانکاری در دایرکتوری ثبت نشده — ابتدا از «اشخاص» یک شخص با نوع پیمانکار بسازید)
                      </option>
                    ) : (
                      contractors.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? '(' + p.code + ')' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {loadingContractorData && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> در حال بارگذاری اطلاعات پیمانکار...
                    </p>
                  )}
                  {form.partyId && !loadingContractorData && (
                    <p className="text-xs text-emerald-600 mt-1">
                      ✓ طرف قرارداد از دایرکتوری اشخاص بارگذاری شد — می‌توانید در فهرست زیر تغییر دهید
                    </p>
                  )}
                  {parties.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer">
                        یا انتخاب از لیست طرف‌های قرارداد قبلی
                      </summary>
                      <select
                        value={form.partyId}
                        onChange={(e) => set('partyId', e.target.value)}
                        className="input w-full mt-2"
                      >
                        <option value="">انتخاب کنید...</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} {p.nationalId ? '(' + p.nationalId + ')' : ''}
                          </option>
                        ))}
                      </select>
                    </details>
                  )}
                </div>
              ) : isEmployeeKind(form.kind) ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">پرسنل *</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleEmployeePick(e.target.value)}
                    className="input w-full"
                    disabled={loadingEmployeeData}
                  >
                    <option value="">— انتخاب پرسنل از پرونده پرسنلی —</option>
                    {employees.length === 0 ? (
                      <option value="" disabled>
                        (هیچ پرسنلی ثبت نشده — ابتدا از منوی حقوق و دستمزد پرسنل بسازید)
                      </option>
                    ) : (
                      employees.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.partner?.name || 'بدون نام'}
                          {e.employeeCode ? ' (' + e.employeeCode + ')' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {loadingEmployeeData && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> در حال بارگذاری پرونده پرسنلی...
                    </p>
                  )}
                  {form.partyId && !loadingEmployeeData && (
                    <p className="text-xs text-emerald-600 mt-1">
                      ✓ اطلاعات طرف قرارداد از پرونده پرسنلی خوانده شد
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    کد ملی، آدرس، شماره شبا و شماره بیمه به‌طور خودکار از پرونده پرسنلی به قرارداد منتقل می‌شود
                  </p>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">طرف قرارداد *</label>
                  <div className="flex gap-2">
                    <select value={form.partyId} onChange={(e) => set('partyId', e.target.value)} className="input flex-1">
                      <option value="">انتخاب کنید...</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} {p.nationalId ? '(' + p.nationalId + ')' : ''}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowPartyModal(true)} className="btn-secondary">
                      <Plus className="w-4 h-4" /> طرف جدید
                    </button>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">پروژه (اختیاری)</label>
                <select value={form.projectId} onChange={(e) => set('projectId', e.target.value)} className="input w-full">
                  <option value="">— بدون پروژه —</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">شماره ثبت</label>
                <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ ثبت</label>
                <PersianDatePicker value={form.registrationDate} onChange={(v: string | null) => set('registrationDate', v || '')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ شروع</label>
                <PersianDatePicker value={form.startDate} onChange={(v: string | null) => set('startDate', v || '')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پایان</label>
                <PersianDatePicker value={form.endDate} onChange={(v: string | null) => set('endDate', v || '')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ کل (ریال)</label>
                <input type="number" value={form.totalAmount} onChange={(e) => set('totalAmount', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق ماهانه (ریال)</label>
                <input type="number" value={form.salaryMonthly} onChange={(e) => set('salaryMonthly', e.target.value)} className="input w-full num" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق روزانه</label>
                <input type="number" value={form.salaryDaily} onChange={(e) => set('salaryDaily', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">حقوق ساعتی</label>
                <input type="number" value={form.salaryHourly} onChange={(e) => set('salaryHourly', e.target.value)} className="input w-full num" dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ساعت کار در هفته</label>
                <input type="number" value={form.workHoursPerWeek} onChange={(e) => set('workHoursPerWeek', e.target.value)} className="input w-full num" dir="ltr" />
              </div>

              {/* B15.6: پیوست ۱ — تفکیک حقوق و مزایا */}
              {isEmployeeKind(form.kind) && (
                <div className="md:col-span-2 border-t pt-5 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-brand-600" />
                        تفکیک حقوق و مزایا (پیوست ۱)
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        با انتخاب پرسنل از پرونده پرسنلی پر می‌شود؛ می‌توانید دستی تغییر دهید.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'baseSalary',      label: 'حقوق پایه' },
                      { key: 'housingAllow',    label: 'حق مسکن' },
                      { key: 'foodAllow',       label: 'بن کارگری (حق خواربار)' },
                      { key: 'childAllow',      label: 'حق اولاد' },
                      { key: 'missionAllow',    label: 'حق ماموریت' },
                      { key: 'overtimeAllow',   label: 'اضافه کاری' },
                      { key: 'attractionAllow', label: 'حق جذب' },
                      { key: 'positionAllow',   label: 'فوق العاده شغل' },
                      { key: 'seniority',       label: 'سنوات' },
                      { key: 'insuranceShare',  label: 'سهم بیمه تأمین اجتماعی' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                        <input
                          type="number"
                          value={((wage as any)[key] as any) ?? ''}
                          onChange={(e) => setWage((w) => ({ ...w, [key]: e.target.value }))}
                          className="input w-full num text-sm"
                          dir="ltr"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مدت قرارداد</label>
                <input value={form.durationText} onChange={(e) => set('durationText', e.target.value)} className="input w-full" placeholder="مثال: ۳ ماه" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">محل انجام کار</label>
                <input value={form.workLocation} onChange={(e) => set('workLocation', e.target.value)} className="input w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع تضمین</label>
                <input value={form.guaranteeType} onChange={(e) => set('guaranteeType', e.target.value)} className="input w-full" placeholder="چک / سفته / ضمانت‌نامه" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">شماره تضمین</label>
                <input value={form.guaranteeNumber} onChange={(e) => set('guaranteeNumber', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ تضمین</label>
                <input type="number" value={form.guaranteeAmount} onChange={(e) => set('guaranteeAmount', e.target.value)} className="input w-full num" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">بانک تضمین</label>
                <input value={form.guaranteeBank} onChange={(e) => set('guaranteeBank', e.target.value)} className="input w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ناظر قرارداد</label>
                <input value={form.supervisorName} onChange={(e) => set('supervisorName', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">امضاکننده شرکت</label>
                <input value={form.companySignerName} onChange={(e) => set('companySignerName', e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">امضاکننده طرف</label>
                <input value={form.workerSignerName} onChange={(e) => set('workerSignerName', e.target.value)} className="input w-full" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">موضوع قرارداد</label>
                <textarea value={form.subject} onChange={(e) => set('subject', e.target.value)} rows={3} className="input w-full resize-none" />
              </div>

              {/* ─── اجزای اجرای قرارداد ─── */}
              <div className="md:col-span-2 border-t pt-5 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-brand-600" />
                      اجزای اجرای قرارداد
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      مثال: «اجرای ... به ازای هر متر مربع ... ریال» — جمع کل به‌طور خودکار محاسبه می‌شود
                    </p>
                  </div>
                  <button type="button" onClick={addItem} className="btn-secondary text-sm">
                    <Plus className="w-4 h-4" /> افزودن ردیف
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg">
                    هنوز ردیفی اضافه نشده — برای قرارداد پیمانکاری حداقل یک ردیف لازم است
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2">شرح</th>
                          <th className="text-right px-2 py-2 w-24">واحد</th>
                          <th className="text-right px-2 py-2 w-24">تعداد</th>
                          <th className="text-right px-2 py-2 w-32">مبلغ واحد (ریال)</th>
                          <th className="text-left px-2 py-2 w-32 bg-emerald-50">جمع</th>
                          <th className="text-center px-2 py-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => {
                          const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                          return (
                            <tr key={idx}>
                              <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={it.description || ''}
                                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                                  className="input text-xs py-1.5"
                                  placeholder="مثال: اجرای سقف تیرچه بلوک"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={it.unit || ''}
                                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                                  className="input text-xs py-1.5"
                                  placeholder="متر مربع"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.quantity ?? 0}
                                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                  className="input num text-xs py-1.5 text-left"
                                  dir="ltr"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  step="1"
                                  value={it.unitPrice ?? 0}
                                  onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                                  className="input num text-xs py-1.5 text-left"
                                  dir="ltr"
                                />
                              </td>
                              <td className="px-2 py-2 text-left bg-emerald-50/50">
                                <span className="num text-xs font-bold text-emerald-700" dir="ltr">
                                  {formatNumber(lineTotal)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-100 font-bold">
                          <td colSpan={5} className="px-2 py-2 text-left text-sm">
                            جمع کل اجزا:
                          </td>
                          <td className="px-2 py-2 text-left bg-emerald-100">
                            <span className="num text-sm text-emerald-800" dir="ltr">
                              {formatNumber(itemsTotal)}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">متن کامل قرارداد (HTML)</label>
                  <button
                    type="button"
                    onClick={loadTemplate}
                    disabled={loadingTemplate}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                  >
                    {loadingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    بارگذاری قالب
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <textarea
                    value={form.bodyHtml}
                    onChange={(e) => set('bodyHtml', e.target.value)}
                    rows={12}
                    className="input w-full resize-none font-mono text-xs"
                    dir="rtl"
                  />

                  <div className="border rounded-lg p-3 bg-slate-50 overflow-auto" style={{ maxHeight: 300 }}>
                    <div className="text-[10px] text-slate-500 mb-2 font-bold flex items-center gap-2 flex-wrap">
                      <span>🔍 پیش‌نمایش</span>
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                        {'{{placeholder}}'}
                      </span>
                      <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px]">
                        ⬤ = نقطه‌چین
                      </span>
                    </div>
                    <div
                      dir="rtl"
                      className="text-xs leading-6"
                      dangerouslySetInnerHTML={{ __html: highlightPlaceholders(form.bodyHtml) }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  برای درج placeholder از الگوی <code className="bg-slate-100 px-1 rounded" dir="ltr">{'{{party.fullName}}'}</code> استفاده کنید
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
              </div>
            </div>
          </div>

          <div className="px-6 pb-4">
            <AttachmentsManager
              entityType="LEGAL_CONTRACT"
              entityId={editing?.id || null}
              label="پیوست‌های قرارداد"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />
          </div>

          <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
            <button onClick={onClose} className="btn-secondary">انصراف</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editing ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </div>
      </div>

      <PartyFormModal
        isOpen={showPartyModal}
        editing={null}
        onClose={() => setShowPartyModal(false)}
        onSaved={reloadParties}
      />
    </>
  );
}