import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, Play, CheckCircle2, Ban, FileText } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractStatus } from '../services/contracts.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';
import { exportHtmlToWord } from '@/utils/word-export';
import { renderContractTemplate } from '@/utils/contract-template';
import CancelDialog from '../components/CancelDialog';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const STATUS_LABELS: Record<LegalContractStatus, string> = {
  DRAFT: 'پیش‌نویس', ACTIVE: 'فعال', SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته', CANCELLED: 'ابطال‌شده', TERMINATED: 'فسخ‌شده',
};

export default function ContractViewPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<LegalContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await contractsApi.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleActivate = async () => {
    if (!id) return;
    try { await contractsApi.activate(id); toast.success('فعال شد'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleComplete = async () => {
    if (!id) return;
    try { await contractsApi.complete(id); toast.success('خاتمه یافت'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await contractsApi.cancel(id, reason);
      toast.success('ابطال شد'); setCancelling(false); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
  if (!data) return <div className="p-8 text-center text-slate-500">قرارداد پیدا نشد</div>;


  const handleWordExport = () => {
    if (!data) return;
    const innerHtml = printRef.current
      ? (printRef.current.querySelector('.contract-body')?.innerHTML ||
         printRef.current.innerHTML || '')
      : '';
    exportHtmlToWord({
      filename: 'قرارداد-' + (data.code || data.title),
      title: data.title,
      subtitle: 'قرارداد ' + (KIND_LABELS[data.kind] || ''),
      code: data.code,
      bodyHtml: innerHtml,
      signatures: {
        left: 'مهر و امضای شرکت',
        right: 'امضای طرف قرارداد: ' + (data.party?.fullName || ''),
      },
    });
  };

  const handlePrint = () => {
    if (!data) return;
    window.print();
  };

  const renderedBody = data?.bodyHtml
    ? renderContractTemplate(data.bodyHtml, data)
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {data.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1 num" dir="ltr">{data.code} — {KIND_LABELS[data.kind]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton contentRef={printRef} documentTitle={data.title} />
          <button onClick={handleWordExport} className="btn-secondary" title="خروجی Word">
            <FileText className="w-4 h-4" />
            Word
          </button>
          {data.status === 'DRAFT' && (
            <button onClick={handleActivate} className="btn-primary">
              <Play className="w-4 h-4" /> فعال‌سازی
            </button>
          )}
          {data.status === 'ACTIVE' && (
            <button onClick={handleComplete} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" /> خاتمه
            </button>
          )}
          {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
            <button onClick={() => setCancelling(true)} className="btn-danger">
              <Ban className="w-4 h-4" /> ابطال
            </button>
          )}
        </div>
      </div>

      <div ref={printRef} className="card p-8 bg-white print-area">
        <PrintHeader title={data.title} subtitle={KIND_LABELS[data.kind]} />

        <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
          <div>
            <div className="text-slate-500 mb-1">طرف قرارداد:</div>
            <div className="font-bold">{data.party?.fullName}</div>
            {data.party?.nationalId && <div className="text-xs num" dir="ltr">کد ملی: {data.party.nationalId}</div>}
            {data.party?.fatherName && <div className="text-xs">فرزند: {data.party.fatherName}</div>}
          </div>
          <div>
            <div className="text-slate-500 mb-1">وضعیت:</div>
            <div className="font-bold">{STATUS_LABELS[data.status]}</div>
          </div>
          {data.project && (
            <div>
              <div className="text-slate-500 mb-1">پروژه:</div>
              <div className="font-bold">{data.project.name}</div>
            </div>
          )}
          {data.registrationNumber && (
            <div>
              <div className="text-slate-500 mb-1">شماره ثبت:</div>
              <div className="num" dir="ltr">{data.registrationNumber}</div>
            </div>
          )}
          {data.registrationDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ ثبت:</div>
              <div className="num">{formatJalaliDate(data.registrationDate)}</div>
            </div>
          )}
          {data.startDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ شروع:</div>
              <div className="num">{formatJalaliDate(data.startDate)}</div>
            </div>
          )}
          {data.endDate && (
            <div>
              <div className="text-slate-500 mb-1">تاریخ پایان:</div>
              <div className="num">{formatJalaliDate(data.endDate)}</div>
            </div>
          )}
          {data.durationText && (
            <div>
              <div className="text-slate-500 mb-1">مدت:</div>
              <div>{data.durationText}</div>
            </div>
          )}
          {data.workLocation && (
            <div className="col-span-2">
              <div className="text-slate-500 mb-1">محل انجام کار:</div>
              <div>{data.workLocation}</div>
            </div>
          )}
        </div>

        {(data.totalAmount || data.salaryMonthly || data.salaryDaily || data.salaryHourly) && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="font-bold mb-3">مبالغ و حقوق</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {data.totalAmount && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">مبلغ کل</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.totalAmount))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryMonthly && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق ماهانه</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryMonthly))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryDaily && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق روزانه</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryDaily))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
              {data.salaryHourly && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">حقوق ساعتی</div>
                  <div className="num font-bold" dir="ltr">{formatNumber(Number(data.salaryHourly))}</div>
                  <div className="text-xs text-slate-500">ریال</div>
                </div>
              )}
            </div>
          </div>
        )}

        {(data.guaranteeType || data.guaranteeNumber || data.guaranteeAmount) && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <div className="font-bold mb-3">تضامین قراردادی</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {data.guaranteeType && <div><div className="text-slate-500 text-xs">نوع</div><div>{data.guaranteeType}</div></div>}
              {data.guaranteeNumber && <div><div className="text-slate-500 text-xs">شماره</div><div className="num" dir="ltr">{data.guaranteeNumber}</div></div>}
              {data.guaranteeAmount && <div><div className="text-slate-500 text-xs">مبلغ</div><div className="num" dir="ltr">{formatNumber(Number(data.guaranteeAmount))}</div></div>}
              {data.guaranteeBank && <div><div className="text-slate-500 text-xs">بانک</div><div>{data.guaranteeBank}</div></div>}
            </div>
          </div>
        )}

        {data.subject && (
          <div className="mt-6">
            <div className="font-bold mb-2">موضوع قرارداد</div>
            <p className="text-sm leading-7 whitespace-pre-wrap">{data.subject}</p>
          </div>
        )}

        {renderedBody && (
          <div className="mt-6">
            <div className="font-bold mb-3 pb-2 border-b">متن کامل قرارداد</div>
            <div className="contract-body text-sm leading-8" dangerouslySetInnerHTML={{ __html: renderedBody }} />
          </div>
        )}

        {data.notes && (
          <div className="mt-6 p-3 bg-slate-50 rounded">
            <div className="text-xs text-slate-500 mb-1">یادداشت</div>
            <div className="text-sm">{data.notes}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای شرکت</div>
            <div className="border-t border-slate-400 pt-2">{data.companySignerName || ''}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای طرف قرارداد</div>
            <div className="border-t border-slate-400 pt-2">{data.workerSignerName || data.party?.fullName || ''}</div>
          </div>
        </div>

        {data.status === 'CANCELLED' && data.cancellationReason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-bold text-red-700 mb-1">این قرارداد ابطال شده است</div>
            <div className="text-sm text-red-600">{data.cancellationReason}</div>
            {data.cancelledAt && (
              <div className="text-xs text-red-500 mt-2 num">
                تاریخ ابطال: {formatJalaliDate(data.cancelledAt)}
              </div>
            )}
          </div>
        )}
      </div>

      <CancelDialog
        isOpen={cancelling}
        title="ابطال قرارداد"
        message="دلیل ابطال را وارد کنید. این عمل برگشت‌پذیر نیست."
        loading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelling(false)}
      />
    </div>
  );
}
