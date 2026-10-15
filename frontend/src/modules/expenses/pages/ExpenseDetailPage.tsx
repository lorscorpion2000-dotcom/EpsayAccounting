import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Send, Check, X, Ban, Edit, FileText } from 'lucide-react';
import clsx from 'clsx';
import { expensesApi } from '../services/expenses.api';
import type { Expense } from '@/types/expense';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: 'پیش‌نویس',  color: 'bg-slate-100 text-slate-700' },
  SUBMITTED:  { label: 'ارسال‌شده', color: 'bg-amber-100 text-amber-800' },
  APPROVED:   { label: 'تأییدشده',  color: 'bg-blue-100 text-blue-800' },
  POSTED:     { label: 'ثبت‌شده',   color: 'bg-emerald-100 text-emerald-800' },
  REJECTED:   { label: 'ردشده',     color: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'لغوشده',    color: 'bg-slate-100 text-slate-500' },
};

export default function ExpenseDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [e, setE] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setE(await expensesApi.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); await load(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'خطا'); }
  };

  if (loading) return <div className="card p-12 text-center text-slate-400">در حال بارگذاری...</div>;
  if (!e) return <div className="card p-12 text-center text-slate-500">یافت نشد</div>;

  const st = STATUS_MAP[e.status] || { label: e.status, color: 'bg-slate-100' };
  const canEdit = e.status === 'DRAFT';
  const canSubmit = e.status === 'DRAFT';
  const canApprove = e.status === 'SUBMITTED';
  const canPrint = ['APPROVED', 'POSTED'].includes(e.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            هزینه {e.code}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className={clsx('text-xs px-2 py-0.5 rounded-md font-medium', st.color)}>{st.label}</span>
            {e.journalEntry && <span className="ms-3 text-xs">سند: <span className="num font-mono" dir="ltr">{e.journalEntry.code}</span></span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={() => nav('/expenses')}>
            <ArrowRight className="w-4 h-4" /> بازگشت
          </button>
          {canEdit && <button className="btn-secondary" onClick={() => nav('/expenses/' + e.id + '/edit')}>
            <Edit className="w-4 h-4" /> ویرایش
          </button>}
          {canPrint && <PagePrintButton documentTitle="هزینه" />}
          {canSubmit && <button className="btn-primary" onClick={() => act(() => expensesApi.submit(e.id), 'ارسال شد')}>
            <Send className="w-4 h-4" /> ارسال برای تأیید
          </button>}
          {canApprove && <>
            <button className="btn-primary" onClick={() => act(() => expensesApi.approve(e.id), 'تأیید شد')}>
              <Check className="w-4 h-4" /> تأیید
            </button>
            <button className="btn-secondary" onClick={() => {
              const r = prompt('دلیل رد:');
              if (r) act(() => expensesApi.reject(e.id, r), 'رد شد');
            }}><X className="w-4 h-4" /> رد
            </button>
          </>}
          {['DRAFT', 'SUBMITTED', 'APPROVED'].includes(e.status) && (
            <button className="btn-secondary text-red-600" onClick={() => {
              if (confirm('لغو شود؟')) act(() => expensesApi.cancel(e.id), 'لغو شد');
            }}><Ban className="w-4 h-4" /> لغو</button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
          <Row label="تاریخ" value={formatJalaliDate(e.expenseDate)} />
          <Row label="دسته" value={e.category?.name || '—'} />
          <Row label="پروژه" value={e.project?.name || '—'} />
          <Row label="طرف حساب" value={e.supplier?.name || '—'} />
          <Row label="شماره فاکتور" value={e.invoiceNumber || '—'} />
          <Row label="نوع پرداخت" value={
            e.payFromType === 'BANK' ? 'بانک' : e.payFromType === 'CASH' ? 'صندوق' : 'تنخواه'
          } />
          <Row label="حساب پرداخت" value={e.payFromAccount ? `${e.payFromAccount.code} — ${e.payFromAccount.name}` : '—'} />
          <Row label="حساب هزینه" value={e.expenseAccount ? `${e.expenseAccount.code} — ${e.expenseAccount.name}` : '—'} />
          <Row label="تأییدکننده" value={e.approvedBy?.fullName || '—'} />
          <Row label="تاریخ تأیید" value={e.approvedAt ? formatJalaliDate(e.approvedAt) : '—'} />
          <Row label="مبلغ" value={formatNumber(Number(e.amount)) + ' ریال'} />
          <Row label="مالیات" value={formatNumber(Number(e.taxAmount)) + ' ریال'} />
          <Row label="مبلغ کل" value={formatNumber(Number(e.totalAmount)) + ' ریال'} highlight />
          <div className="md:col-span-3">
            <div className="text-xs text-slate-500 mb-1">شرح</div>
            <div className="font-medium">{e.description}</div>
          </div>
          {e.notes && <div className="md:col-span-3">
            <div className="text-xs text-slate-500 mb-1">یادداشت</div>
            <div>{e.notes}</div>
          </div>}
          {e.rejectedReason && <div className="md:col-span-3">
            <div className="text-xs text-red-500 mb-1">دلیل رد</div>
            <div className="text-red-700">{e.rejectedReason}</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={clsx('num', highlight ? 'font-bold text-lg text-brand-700' : 'font-medium')} dir="auto">{value}</div>
    </div>
  );
}
