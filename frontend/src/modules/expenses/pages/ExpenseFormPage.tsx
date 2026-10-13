import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, ArrowRight, ReceiptText } from 'lucide-react';
import { expensesApi, expenseCategoriesApi } from '../services/expenses.api';
import type { ExpenseCategory, ExpensePayFromType } from '@/types/expense';
import { api } from '@/services/api';

interface AccountOpt { id: string; code: string; name: string; }
interface ProjectOpt { id: string; name: string; }
interface PartnerOpt { id: string; name: string; }

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
    amount: 0,
    taxAmount: 0,
    description: '',
    payFromType: 'BANK' as ExpensePayFromType,
    payFromAccountId: '',
    expenseAccountId: '',
    invoiceNumber: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      expenseCategoriesApi.list().catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/partners').then((r) => r.data).catch(() => []),
      api.get('/accounting/accounts').then((r) => r.data).catch(() => []),
    ]).then(([c, p, pt, a]) => {
      setCats(c as ExpenseCategory[]);
      setProjects((p as any[]).map((x) => ({ id: x.id, name: x.name })));
      setPartners((pt as any[]).map((x) => ({ id: x.id, name: x.name })));
      setAccounts((a as any[]).filter((x: any) => x.isPostable && x.isActive).map((x: any) => ({ id: x.id, code: x.code, name: x.name })));
    });
    if (isEdit && id) {
      expensesApi.get(id).then((e) => {
        setForm({
          expenseDate: e.expenseDate.slice(0, 10),
          categoryId: e.categoryId,
          projectId: e.projectId || '',
          supplierId: e.supplierId || '',
          amount: Number(e.amount),
          taxAmount: Number(e.taxAmount),
          description: e.description,
          payFromType: e.payFromType,
          payFromAccountId: e.payFromAccountId,
          expenseAccountId: e.expenseAccountId,
          invoiceNumber: e.invoiceNumber || '',
          notes: e.notes || '',
        });
      }).catch(() => toast.error('خطا در بارگذاری'));
    }
  }, [id, isEdit]);

  const submit = async () => {
    if (!form.categoryId || !form.description || form.amount <= 0 || !form.payFromAccountId || !form.expenseAccountId) {
      toast.error('فیلدهای اجباری را پر کنید'); return;
    }
    setSaving(true);
    try {
      const payload = {
        expenseDate: form.expenseDate,
        categoryId: form.categoryId,
        projectId: form.projectId || null,
        supplierId: form.supplierId || null,
        amount: form.amount,
        taxAmount: form.taxAmount,
        description: form.description,
        payFromType: form.payFromType,
        payFromAccountId: form.payFromAccountId,
        expenseAccountId: form.expenseAccountId,
        invoiceNumber: form.invoiceNumber || null,
        notes: form.notes || null,
      };
      if (isEdit && id) { await expensesApi.update(id, payload); toast.success('ویرایش شد'); }
      else { const e = await expensesApi.create(payload); toast.success('ثبت شد'); nav('/expenses/' + e.id); return; }
      nav('/expenses/' + id);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'خطا'); }
    finally { setSaving(false); }
  };

  const payFromAccounts = accounts.filter((a) =>
    form.payFromType === 'BANK' ? a.code.startsWith('1.1.1.02') || a.code.startsWith('1.1.1.03') :
    form.payFromType === 'PETTY_CASH' ? a.code.startsWith('1.1.1.03') :
    a.code.startsWith('1.1.1.01'),
  );
  const expenseAccounts = accounts.filter((a) => a.code.startsWith('5.'));

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

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="تاریخ *">
            <input type="date" className="input" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
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
          <Field label="طرف حساب / تأمین‌کننده (اختیاری)">
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">—</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="مبلغ * (ریال)">
            <input type="number" className="input num" dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </Field>
          <Field label="مالیات (اختیاری)">
            <input type="number" className="input num" dir="ltr" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: Number(e.target.value) })} />
          </Field>
          <Field label="شرح *" className="md:col-span-2">
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="نوع پرداخت *">
            <select className="input" value={form.payFromType} onChange={(e) => setForm({ ...form, payFromType: e.target.value as ExpensePayFromType })}>
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
          </Field>
          <Field label="حساب هزینه (بدهکار) *" className="md:col-span-2">
            <select className="input" value={form.expenseAccountId} onChange={(e) => setForm({ ...form, expenseAccountId: e.target.value })}>
              <option value="">انتخاب...</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </Field>
          <Field label="شماره فاکتور (اختیاری)">
            <input className="input num" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </Field>
          <Field label="یادداشت">
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => nav('/expenses')}>انصراف</button>
          <button className="btn-primary" disabled={saving} onClick={submit}>
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
