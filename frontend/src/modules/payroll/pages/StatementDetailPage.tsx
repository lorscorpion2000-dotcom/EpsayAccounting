import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, FileSpreadsheet, Printer, CheckCircle2, Send, FileText, Edit, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';
import { payrollApi } from '../services/payroll.api';
import type { SubcontractorStatement } from '@/types/payroll';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
};

type Tab = 'summary' | 'print';

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [s, setS] = useState<SubcontractorStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('summary');
  const [action, setAction] = useState<{ type: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await payrollApi.statements.get(id);
      setS(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: s ? 'صورت‌وضعیت-' + (s as any).code : 'statement',
  });

  const doAction = async () => {
    if (!s || !action) return;
    setActionLoading(true);
    try {
      if (action.type === 'submit') {
        await payrollApi.statements.submit(s.id);
        toast.success('ارسال شد');
      } else if (action.type === 'approve') {
        await payrollApi.statements.approve(s.id);
        toast.success('تایید شد');
      } else if (action.type === 'pay') {
        await payrollApi.statements.pay(s.id);
        toast.success('پرداخت ثبت شد');
      }
      setAction(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!s) return null;

  const items = (s as any).items || [];
  const totalAmount = Number((s as any).totalAmount || 0);
  const insuranceAmount = Number((s as any).insuranceAmount || 0);
  const taxAmount = Number((s as any).taxAmount || 0);
  const retentionAmount = Number((s as any).retentionAmount || 0);

  const prepaymentDepreciation = Number((s as any).prepaymentDepreciation || 0);
  const otherDeduction = Number((s as any).otherDeduction || 0);
  const totalDeduction = Number((s as any).totalDeduction || 0);
  const netPayable = Number((s as any).netPayable || 0);

  const isDraft = s.status === 'DRAFT';
  const isSubmitted = s.status === 'SUBMITTED';
  const isApproved = s.status === 'APPROVED';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/payroll/subcontractor-statements')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> صورت‌وضعیت پیمانکاران
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{(s as any).code}</span>
      </div>

      {/* Header */}
      <div className="card p-6 no-print">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{(s as any).code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', STATUS_COLORS[s.status])}>
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{(s as any).contractor?.name}</span>
                <span className="text-slate-300">•</span>
                <span>{(s as any).project?.name}</span>
                <span className="text-slate-300">•</span>
                <span>
                  شماره: <span className="num">{toPersianDigits(Number((s as any).statementNumber))}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="num">
                  {formatJalaliDate((s as any).periodStart)} تا {formatJalaliDate((s as any).periodEnd)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <>
                <button className="btn-secondary" onClick={() => navigate('/payroll/subcontractor-statements/' + s.id + '/edit')}>
                  <Edit className="w-4 h-4" /> ویرایش
                </button>
                <button className="btn-primary" onClick={() => setAction({ type: 'submit' })}>
                  <Send className="w-4 h-4" /> ارسال
                </button>
              </>
            )}
            {isSubmitted && (
              <button className="btn-primary" onClick={() => setAction({ type: 'approve' })}>
                <CheckCircle2 className="w-4 h-4" /> تایید
              </button>
            )}
            {isApproved && (
              <button className="btn-primary" onClick={() => setAction({ type: 'pay' })}>
                <BadgeCheck className="w-4 h-4" /> ثبت پرداخت
              </button>
            )}
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> چاپ / PDF
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">جمع کارکرد</div>
            <div className="text-xl font-bold num">
              {toPersianDigits(Math.round(totalAmount).toLocaleString())}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">جمع کسورات</div>
            <div className="text-xl font-bold num text-red-600">
              {toPersianDigits(Math.round(totalDeduction).toLocaleString())}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">خالص قابل پرداخت</div>
            <div className="text-xl font-bold num text-brand-700">
              {toPersianDigits(Math.round(netPayable).toLocaleString())}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden no-print">
        <div className="border-b border-slate-200 flex">
          <button type="button" onClick={() => setTab('summary')}
            className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'summary'
                ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <FileText className="w-4 h-4" /> خلاصه
          </button>
          <button type="button" onClick={() => setTab('print')}
            className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'print'
                ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Printer className="w-4 h-4" /> چاپ / PDF
          </button>
        </div>
      </div>

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="space-y-6">
          {/* Items table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-800">ردیف‌های کارکرد</h2>
            </div>
            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">هیچ ردیفی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-3 py-3 w-12 font-medium text-slate-600">#</th>
                      <th className="text-right px-3 py-3 font-medium text-slate-600">شرح</th>
                      <th className="text-center px-3 py-3 w-20 font-medium text-slate-600">واحد</th>
                      <th className="text-center px-3 py-3 w-24 font-medium text-slate-600">مقدار</th>
                      <th className="text-left px-3 py-3 w-32 font-medium text-slate-600">فی (ریال)</th>
                      <th className="text-left px-3 py-3 w-32 font-medium text-slate-600">جمع (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-3 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                        <td className="px-3 py-3 text-slate-800 text-xs">{it.description}</td>
                        <td className="px-3 py-3 text-center text-xs text-slate-500">{it.unit || '—'}</td>
                        <td className="px-3 py-3 text-center num text-xs">{toPersianDigits(Number(it.quantity).toFixed(2))}</td>
                        <td className="px-3 py-3 text-left num text-xs">{toPersianDigits(Math.round(Number(it.unitPrice)).toLocaleString())}</td>
                        <td className="px-3 py-3 text-left num text-xs font-bold">{toPersianDigits(Math.round(Number(it.totalPrice)).toLocaleString())}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2">
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-right text-slate-700">جمع کارکرد:</td>
                      <td className="px-3 py-3 text-left num">{toPersianDigits(Math.round(totalAmount).toLocaleString())}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Deductions summary */}
          <div className="card p-6">
            <h2 className="font-bold text-slate-800 border-b pb-2 mb-4">خلاصه کسورات و خالص</h2>
            <div className="space-y-3">
              <Row label="جمع کارکرد" value={totalAmount} bold />
              <Row label={`بیمه سهم پیمانکار (${(s as any).insurancePercent || 0}٪)`} value={insuranceAmount} negative />
              <Row label={`مالیات (${(s as any).taxPercent || 0}٪)`} value={taxAmount} negative />
              <Row label={`حسن انجام کار (${(s as any).retentionPercent || 0}٪)`} value={retentionAmount} negative />
              <Row label="استهلاک پیش‌پرداخت" value={prepaymentDepreciation} negative />
              <Row label="سایر کسورات" value={otherDeduction} negative />
              <div className="border-t pt-3 mt-3">
                <Row label="جمع کسورات" value={totalDeduction} bold negative />
              </div>
              <div className="border-t-2 pt-3 mt-3">
                <Row label="خالص قابل پرداخت به پیمانکار" value={netPayable} bold highlight />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Tab */}
      {tab === 'print' && (
        <div className="space-y-4">
          <div className="card p-4 no-print flex items-center justify-between">
            <div className="text-sm text-slate-600">
              2 برگ صورت‌وضعیت (کارکرد + خلاصه مالی) آماده چاپ است
            </div>
            <button onClick={handlePrint} className="btn-primary">
              <Printer className="w-4 h-4" /> چاپ / ذخیره PDF
            </button>
          </div>

          <div ref={printRef} className="bg-white p-6" dir="rtl">
            <PrintSheets
              statement={s}
              items={items}
              totalAmount={totalAmount}
              insuranceAmount={insuranceAmount}
              taxAmount={taxAmount}
              retentionAmount={retentionAmount}
              prepaymentDepreciation={prepaymentDepreciation}
              otherDeduction={otherDeduction}
              totalDeduction={totalDeduction}
              netPayable={netPayable}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!action}
        title={
          action?.type === 'submit' ? 'ارسال صورت‌وضعیت' :
          action?.type === 'approve' ? 'تایید صورت‌وضعیت' :
          'ثبت پرداخت'
        }
        message={
          action?.type === 'submit' ? 'ارسال به کارتابل تایید.' :
          action?.type === 'approve' ? 'صورت‌وضعیت تایید می‌شود.' :
          'پرداخت صورت‌وضعیت ثبت می‌شود.'
        }
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={doAction}
        onCancel={() => setAction(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Row helper
// ═══════════════════════════════════════════════════════════
function Row({ label, value, bold, negative, highlight }: any) {
  return (
    <div className={clsx('flex items-center justify-between', highlight && 'text-brand-700')}>
      <span className={clsx('text-sm', bold ? 'font-bold' : 'text-slate-600')}>{label}</span>
      <span className={clsx('num',
        bold ? 'font-bold text-base' : 'text-sm',
        negative && 'text-red-700',
        highlight && 'text-lg font-bold')}>
        {toPersianDigits(Math.round(value).toLocaleString())} ریال
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Print Sheets (2 pages)
// ═══════════════════════════════════════════════════════════
function PrintSheets({
  statement, items, totalAmount, insuranceAmount, taxAmount,
  retentionAmount, prepaymentDepreciation, otherDeduction,
  totalDeduction, netPayable,
}: any) {
  const s = statement;

  return (
    <div className="space-y-8">
      {/* Sheet 1: Work */}
      <div className="border-2 border-slate-300 p-4 mb-8" style={{ pageBreakAfter: 'always' }}>
        <PrintHeader s={s} sheetTitle="برگه کارکرد" sheetNumber={1} />
        <table className="w-full text-xs border-collapse mt-3" style={{ border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px', width: '35px' }}>ردیف</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px' }}>شرح عملیات</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px', width: '60px' }}>واحد</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px', width: '70px' }}>مقدار</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px', width: '110px' }}>فی (ریال)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '5px', width: '120px' }}>جمع (ریال)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td></tr>
            ) : items.map((it: any, idx: number) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}>{it.description}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{it.unit || '—'}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>{toPersianDigits(Number(it.quantity).toFixed(2))}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(it.unitPrice)).toLocaleString())}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>{toPersianDigits(Math.round(Number(it.totalPrice)).toLocaleString())}</td>
              </tr>
            ))}
            <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
              <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>جمع کل کارکرد</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(totalAmount).toLocaleString())}</td>
            </tr>
          </tbody>
        </table>
        <Signatures />
      </div>

      {/* Sheet 2: Summary */}
      <div className="border-2 border-slate-300 p-4" style={{ pageBreakAfter: 'always' }}>
        <PrintHeader s={s} sheetTitle="خلاصه مالی" sheetNumber={2} />
        <table className="w-full text-xs border-collapse mt-3" style={{ border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '35px' }}>ردیف</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>شرح</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '160px' }}>مبلغ (ریال)</th>
            </tr>
          </thead>
          <tbody>
            <Row2 idx={1} label="جمع کارکرد" value={totalAmount} />
            <Row2 idx={2} label={`بیمه سهم پیمانکار (${s.insurancePercent || 0}٪)`} value={insuranceAmount} negative />
            <Row2 idx={3} label={`مالیات (${s.taxPercent || 0}٪)`} value={taxAmount} negative />
            <Row2 idx={4} label={`حسن انجام کار (${s.retentionPercent || 0}٪)`} value={retentionAmount} negative />
            <Row2 idx={5} label="استهلاک پیش‌پرداخت" value={prepaymentDepreciation} negative />
            <Row2 idx={6} label="سایر کسورات" value={otherDeduction} negative />
            <Row2 idx={7} label="جمع کسورات" value={totalDeduction} negative bold />
            <tr style={{ background: '#dcfce7', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>۸</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>خالص قابل پرداخت</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{toPersianDigits(Math.round(netPayable).toLocaleString())}</td>
            </tr>
          </tbody>
        </table>
        <Signatures />
      </div>
    </div>
  );
}

function Row2({ idx, label, value, negative, bold }: any) {
  return (
    <tr>
      <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>{toPersianDigits(idx)}</td>
      <td style={{ border: '1px solid #cbd5e1', padding: '5px', fontWeight: bold ? 'bold' : 'normal' }}>{label}</td>
      <td style={{
        border: '1px solid #cbd5e1',
        padding: '5px',
        textAlign: 'left',
        color: negative ? '#b91c1c' : '#000',
        fontWeight: bold ? 'bold' : 'normal',
      }}>
        {toPersianDigits(Math.round(value).toLocaleString())}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════
// Print header
// ═══════════════════════════════════════════════════════════
function PrintHeader({ s, sheetTitle, sheetNumber }: any) {
  return (
    <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
      <div className="text-xs space-y-0.5">
        <div><span className="font-bold">پروژه: </span>{s.project?.name}</div>
        <div><span className="font-bold">کارفرما: </span>{s.project?.client?.name || '—'}</div>
        <div><span className="font-bold">پیمانکار جزء: </span>{s.contractor?.name}</div>
      </div>
      <div className="text-center">
        <div className="font-bold text-base">{sheetTitle}</div>
        <div className="text-xs mt-1">برگه {toPersianDigits(sheetNumber)} از ۲</div>
      </div>
      <div className="text-xs text-left space-y-0.5">
        <div>صورت‌وضعیت شماره <span className="num font-bold">{toPersianDigits(Number(s.statementNumber))}</span></div>
        <div>کد: <span className="num" style={{ fontFamily: 'monospace' }}>{s.code}</span></div>
        <div>دوره: <span className="num">{formatJalaliDate(s.periodStart)}</span> تا <span className="num">{formatJalaliDate(s.periodEnd)}</span></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Signatures
// ═══════════════════════════════════════════════════════════
function Signatures() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4 text-xs" style={{ marginTop: '40px' }}>
      <div className="text-center">
        <div className="font-bold mb-8">پیمانکار جزء</div>
        <div>امضاء:</div>
      </div>
      <div className="text-center">
        <div className="font-bold mb-8">ناظر / مهندس کارگاه</div>
        <div>امضاء:</div>
      </div>
      <div className="text-center">
        <div className="font-bold mb-8">مدیر پروژه</div>
        <div>امضاء:</div>
      </div>
    </div>
  );
}
