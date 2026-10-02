import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2, Plus, FileText } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractParty } from '../services/contracts.api';
import { projectsApi } from '@/modules/projects/services/projects.api';
import { payrollApi } from '@/modules/payroll/services/payroll.api';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import PartyFormModal from './PartyFormModal';
import { PersianDatePicker } from '@/components/PersianDatePicker';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const isEmployeeKind = (kind: string) => kind === 'WORKER_EMPLOYMENT';

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
    ]).then(([p, pr, emps]) => {
      setParties(p);
      setProjects(pr as any[]);
      setEmployees(Array.isArray(emps) ? emps : []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    set('kind', e.target.value);
                    set('partyId', '');
                    setSelectedEmployeeId('');
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
              {isEmployeeKind(form.kind) ? (
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
                <textarea value={form.bodyHtml} onChange={(e) => set('bodyHtml', e.target.value)} rows={8} className="input w-full resize-none font-mono text-xs" dir="rtl" />
                <p className="text-xs text-slate-500 mt-1">می‌توانید متن قرارداد را اینجا Paste کنید (HTML یا متن ساده)</p>
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