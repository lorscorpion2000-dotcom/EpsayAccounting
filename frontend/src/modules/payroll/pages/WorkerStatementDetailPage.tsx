import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Send, CheckCircle2, DollarSign, Edit, Users,
} from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import { formatJalaliDate, formatNumber, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import PrintButton from '@/components/PrintButton';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغوشده',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function WorkerStatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await (payrollApi as any).workerStatements.get(id);
      setS(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async () => {
    if (!s || !action) return;
    setActionLoading(true);
    try {
      const ws = (payrollApi as any).workerStatements;
      if (action === 'submit') { await ws.submit(s.id); toast.success('ارسال شد'); }
      else if (action === 'approve') { await ws.approve(s.id); toast.success('تایید شد'); }
      else if (action === 'pay') { await ws.pay(s.id); toast.success('پرداخت ثبت شد'); }
      setAction(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!s) return null;

  const items = s.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/payroll/worker-statements')} className="btn-secondary">
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-600" />
              صورت‌وضعیت پرسنل
            </h1>
            <p className="text-sm text-slate-500 num" dir="ltr">{s.code}</p>
          </div>
          <span className={clsx('text-xs px-2.5 py-1 rounded-md', STATUS_COLORS[s.status])}>
            {STATUS_LABELS[s.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {s.status === 'DRAFT' && (
            <>
              <button className="btn-secondary" onClick={() => navigate('/payroll/worker-statements/' + s.id + '/edit')}>
                <Edit className="w-4 h-4" /> ویرایش
              </button>
              <button className="btn-primary" onClick={() => setAction('submit')}>
                <Send className="w-4 h-4" /> ارسال
              </button>
            </>
          )}
          {s.status === 'SUBMITTED' && (
            <button className="btn-primary" onClick={() => setAction('approve')}>
              <CheckCircle2 className="w-4 h-4" /> تایید
            </button>
          )}
          {s.status === 'APPROVED' && (
            <button className="btn-primary" onClick={() => setAction('pay')}>
              <DollarSign className="w-4 h-4" /> ثبت پرداخت
            </button>
          )}
          <PrintButton contentRef={printRef} documentTitle={s ? 'صورت‌وضعیت-پرسنل-' + s.code : 'statement'} label="چاپ / PDF" />
        </div>
      </div>

      <div ref={printRef} className="card p-8 bg-white">
        <div className="text-center mb-6">
          <div className="text-xl font-bold">صورت‌وضعیت حقوق پرسنل</div>
          <div className="text-sm text-slate-500 mt-1 num" dir="ltr">{s.code}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4 mb-4">
          <div><span className="text-slate-500">پرسنل: </span><span className="font-medium">{s.partner?.name}</span></div>
          <div><span className="text-slate-500">کد: </span><span className="num" dir="ltr">{s.partner?.code}</span></div>
          <div><span className="text-slate-500">پروژه: </span>{s.project?.name || '—'}</div>
          <div><span className="text-slate-500">شماره: </span><span className="num">{toPersianDigits(s.statementNumber)}</span></div>
          <div><span className="text-slate-500">از تاریخ: </span><span className="num">{formatJalaliDate(s.periodStart)}</span></div>
          <div><span className="text-slate-500">تا تاریخ: </span><span className="num">{formatJalaliDate(s.periodEnd)}</span></div>
        </div>

        <div className="grid grid-cols-5 gap-2 text-xs bg-slate-50 p-3 rounded mb-4">
          <div><span className="text-slate-500">روز کارکرد: </span><span className="num font-bold">{toPersianDigits(Number(s.workDays))}</span></div>
          <div><span className="text-slate-500">اضافه‌کار: </span><span className="num font-bold">{toPersianDigits(Number(s.overtimeHours))}</span></div>
          <div><span className="text-slate-500">تعطیلی: </span><span className="num font-bold">{toPersianDigits(Number(s.holidayHours))}</span></div>
          <div><span className="text-slate-500">غیبت: </span><span className="num font-bold">{toPersianDigits(Number(s.absentDays))}</span></div>
          <div><span className="text-slate-500">مرخصی: </span><span className="num font-bold">{toPersianDigits(Number(s.leaveDays))}</span></div>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-slate-50">
            <tr>
              <th className="border p-2 text-center w-12">#</th>
              <th className="border p-2 text-right">شرح</th>
              <th className="border p-2 text-center w-20">واحد</th>
              <th className="border p-2 text-center w-24">مقدار</th>
              <th className="border p-2 text-left w-32">بهای واحد</th>
              <th className="border p-2 text-left w-32">جمع</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => (
              <tr key={it.id || idx}>
                <td className="border p-2 text-center num">{toPersianDigits(idx + 1)}</td>
                <td className="border p-2">{it.description}</td>
                <td className="border p-2 text-center">{it.unit || '—'}</td>
                <td className="border p-2 text-center num">{toPersianDigits(Number(it.quantity))}</td>
                <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.unitPrice))}</td>
                <td className="border p-2 text-left num font-bold" dir="ltr">{formatNumber(Number(it.totalPrice))}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border p-2 text-left">جمع دریافتی</td>
              <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(s.totalEarnings))}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 max-w-md ms-auto bg-slate-50 border rounded p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span>بیمه ({Number(s.insurancePercent)}٪):</span>
            <span className="num text-rose-700" dir="ltr">- {formatNumber(Number(s.totalInsurance))}</span>
          </div>
          <div className="flex justify-between">
            <span>مالیات:</span>
            <span className="num text-rose-700" dir="ltr">- {formatNumber(Number(s.totalTax))}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold text-base">
            <span>خالص قابل پرداخت:</span>
            <span className="num text-emerald-700" dir="ltr">{formatNumber(Number(s.netPayable))}</span>
          </div>
        </div>

        {s.description && (
          <div className="mt-6 p-3 bg-slate-50 rounded text-sm">
            <span className="text-slate-500">توضیحات: </span>{s.description}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t text-xs text-center">
          <div>
            <div className="font-bold mb-8">پرسنل</div>
            <div>امضاء:</div>
          </div>
          <div>
            <div className="font-bold mb-8">مدیر منابع انسانی</div>
            <div>امضاء:</div>
          </div>
          <div>
            <div className="font-bold mb-8">مدیر مالی</div>
            <div>امضاء:</div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!action}
        title={action === 'submit' ? 'ارسال' : action === 'approve' ? 'تایید' : 'ثبت پرداخت'}
        message="آیا مطمئن هستید؟"
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={doAction}
        onCancel={() => setAction(null)}
      />
    </div>
  );
}
