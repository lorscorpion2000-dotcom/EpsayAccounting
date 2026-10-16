import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, ArrowRight, ReceiptText, Building2, UserCheck } from 'lucide-react';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { expensesApi, expenseCategoriesApi } from '../services/expenses.api';
import type { ExpenseCategory, ExpensePayFromType } from '@/types/expense';
import { api } from '@/services/api';
import clsx from 'clsx';

interface AccountOpt {
  id: string;
  code: string;
  name: string;
  level?: string;
  detailType?: string | null;
  isPostable?: boolean;
}
interface ProjectOpt { id: string; name: string; }
interface PartnerOpt { id: string; name: string; type?: string; }

type CostType = 'COMPANY' | 'CLIENT_PASS_THROUGH';

export default function ExpenseFormPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [cats, setCats] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [partners, setPartners] = useState<PartnerOpt[]>([]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryId: '',
    projectId: '',
    supplierId: '',
    clientId: '',
    costType: 'COMPANY' as CostType,
    amount: 0,
    taxAmount: 0,
    description: '',
    payFromType: 'BANK' as ExpensePayFromType,
    payFromAccountId: '',
    expenseAccountId: '',
    invoiceNumber: '',
    notes: '',
  });

  const isPassThrough = form.costType === 'CLIENT_PASS_THROUGH';

  useEffect(() => {
    Promise.all([
      expenseCategoriesApi.list().catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
      api.get('/accounts/postable').then((r) => r.data).catch(() => []),
    ]).then(([c, p, pt, a]) => {
      setCats(c as ExpenseCategory[]);
      setProjects((p as any[]).map((x) => ({ id: x.id, name: x.name })));
      setPartners((pt as any[]).map((x) => ({ id: x.id, name: x.name, type: x.type })));
      setAccounts((a as any[])
        .filter((x: any) => x.isPostable && x.isActive)
        .map((x: any) => ({
          id: x.id,
          code: x.code,
          name: x.name,
          level: x.level,
          detailType: x.detailType ?? null,
          isPostable: x.isPostable,
        })));
    });
    if (isEdit && id) {
      expensesApi.get(id).then((e: any) => {
        setForm({
          expenseDate: e.expenseDate.slice(0, 10),
          categoryId: e.categoryId,
          projectId: e.projectId || '',
          supplierId: e.supplierId || '',
          clientId: e.clientId || '',
          costType: (e.costType as CostType) || 'COMPANY',
          amount: Number(e.amount),
          taxAmount: Number(e.taxAmount),
          description: e.description,
          payFromType: e.payFromType || 'BANK',
          payFromAccountId: e.payFromAccountId || '',
          expenseAccountId: e.expenseAccountId || '',
          invoiceNumber: e.invoiceNumber || '',
          notes: e.notes || '',
        });
      }).catch(() => toast.error('خطا در بارگذاری'));
    }
  }, [id, isEdit]);

  // ─── اعتبارسنجی ───
  const canSubmit = useMemo(() => {
    if (!form.categoryId || !form.description || form.amount <= 0) return false;
    if (isPassThrough) {
      return !!form.clientId; // کارفرما اجباری
    }
    return !!form.payFromAccountId && !!form.expenseAccountId;
  }, [form, isPassThrough]);

  const submit = async () => {
    if (!canSubmit) {
      toast.error(isPassThrough
        ? 'برای هزینه کارفرما، انتخاب کارفرما و فیلدهای اصلی الزامی است'
        : 'فیلدهای اجباری را پر کنید');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        expenseDate: form.expenseDate,
        categoryId: form.categoryId,
        projectId: form.projectId || null,
        supplierId: form.supplierId || null,
        costType: form.costType,
        clientId: isPassThrough ? (form.clientId || null) : null,
        amount: form.amount,
        taxAmount: form.taxAmount,
        description: form.description,
        invoiceNumber: form.invoiceNumber || null,
        notes: form.notes || null,
      };
      if (!isPassThrough) {
        payload.payFromType = form.payFromType;
        payload.payFromAccountId = form.payFromAccountId;
        payload.expenseAccountId = form.expenseAccountId;
      }
      if (isEdit && id) { await expensesApi.update(id, payload); toast.success('ویرایش شد'); }
      else { const e = await expensesApi.create(payload); toast.success('ثبت شد'); nav('/expenses/' + e.id); return; }
      nav('/expenses/' + id);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
    finally { setSaving(false); }
  };

  const payFromAccounts = accounts.filter((a) => {
    if (a.level !== 'DETAIL') return false;
    if (form.payFromType === 'BANK') return a.detailType === 'BANK';
    if (form.payFromType === 'CASH') return a.detailType === 'CASH_REGISTER';
    if (form.payFromType === 'PETTY_CASH') return a.detailType === 'PETTY_CASH';
    return false;
  });

  const expenseAccounts = accounts.filter((a) =>
    a.code.startsWith('5.') || a.code.startsWith('5')
  );

  // فقط طرف حساب‌های CLIENT برای کارفرما
  const clientPartners = partners.filter((x) => !x.type || x.type === 'CLIENT');
  const supplierPartners = partners.filter((x) => !x.type || x.type === 'SUPPLIER' || x.type === 'CONTRACTOR' || x.type === 'OTHER');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ReceiptText className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
        </h1>
        <button className="btn-secondary" onClick={() => nav('/expenses')}>
          <ArrowRight className="w-4 h-4" /> بازگشت
        </button>
      </div>

      {/* انتخاب نوع هزینه */}
      <div className="card p-4">
        <label className="block text-xs font-medium text-slate-600 mb-3">نوع هزینه</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, costType: 'COMPANY' })}
            className={clsx(
              'p-4 rounded-xl border-2 text-right transition-all flex items-start gap-3',
              form.costType === 'COMPANY'
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              form.costType === 'COMPANY' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
            )}>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-800">هزینه شرکت</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-5">
                هزینه‌ی واقعی شرکت ما — از حساب بانکی، صندوق یا تنخواه پرداخت می‌شود و در سود و زیان اثر دارد.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, costType: 'CLIENT_PASS_THROUGH' })}
            className={clsx(
              'p-4 rounded-xl border-2 text-right transition-all flex items-start gap-3',
              form.costType === 'CLIENT_PASS_THROUGH'
                ? 'border-amber-500 bg-amber-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              form.costType === 'CLIENT_PASS_THROUGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            )}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-800">هزینه کارفرما</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-5">
                کارفرما خودش پرداخت می‌کند. کارفرما بدهکار و طرف حساب بستانکار می‌شود — در سود و زیان شرکت اثر ندارد.
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="تاریخ *">
            <PersianDatePicker value={form.expenseDate} onChange={(v) => setForm({ ...form, expenseDate: v || '' })} />
          </Field>
          <Field label="دسته‌بندی *">
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">انتخاب...</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="پروژه (اختیاری)">
            <select className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={isPassThrough ? 'طرف حساب / تأمین‌کننده' : 'طرف حساب / تأمین‌کننده (اختیاری)'}>
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">—</option>
              {supplierPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {isPassThrough ? (
            <Field label="کارفرما *" className="md:col-span-2">
              <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">انتخاب کارفرما...</option>
                {clientPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {clientPartners.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">
                  هیچ طرف حسابی با نقش «کارفرما» در سیستم ثبت نشده. ابتدا از صفحه‌ی «اشخاص» یک کارفرما بسازید.
                </p>
              ) : null}
            </Field>
          ) : null}
          <Field label="مبلغ * (ریال)">
            <input type="number" className="input num" dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </Field>
          <Field label="مالیات (اختیاری)">
            <input type="number" className="input num" dir="ltr" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: Number(e.target.value) })} />
          </Field>
          <Field label="شرح *" className="md:col-span-2">
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          {!isPassThrough ? (
            <>
              <Field label="نوع پرداخت *">
                <select className="input" value={form.payFromType} onChange={(e) => setForm({ ...form, payFromType: e.target.value as ExpensePayFromType, payFromAccountId: '' })}>
                  <option value="BANK">بانک</option>
                  <option value="CASH">صندوق</option>
                  <option value="PETTY_CASH">تنخواه</option>
                </select>
              </Field>
              <Field label="حساب پرداخت‌کننده *">
                <select className="input" value={form.payFromAccountId} onChange={(e) => setForm({ ...form, payFromAccountId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {payFromAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                {payFromAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {form.payFromType === 'BANK' && 'هیچ حساب بانکی تفضیلی تعریف نشده.'}
                    {form.payFromType === 'CASH' && 'هیچ صندوق تفضیلی تعریف نشده.'}
                    {form.payFromType === 'PETTY_CASH' && 'هیچ تنخواه تفضیلی تعریف نشده.'}
                  </p>
                )}
              </Field>
              <Field label="حساب هزینه (بدهکار) *" className="md:col-span-2">
                <select className="input" value={form.expenseAccountId} onChange={(e) => setForm({ ...form, expenseAccountId: e.target.value })}>
                  <option value="">انتخاب...</option>
                  {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </Field>
            </>
          ) : null}

          <Field label="شماره فاکتور (اختیاری)">
            <input className="input num" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </Field>
          <Field label="یادداشت">
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>

        {isPassThrough ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-6">
            سند خودکار: <b>کارفرما بدهکار</b> و <b>طرف حساب / تأمین‌کننده بستانکار</b> به مبلغ کل (مبلغ + مالیات).
            هیچ جابجایی نقدی رخ نمی‌دهد و این مبلغ در سود و زیان شرکت اثر ندارد.
          </div>
        ) : null}

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => nav('/expenses')}>انصراف</button>
          <button className="btn-primary" disabled={saving || !canSubmit} onClick={submit}>
            <Save className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
