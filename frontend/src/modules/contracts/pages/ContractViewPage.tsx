import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Play, CheckCircle2, Ban, FileText } from 'lucide-react';
import { contractsApi, LegalContract, LegalContractKind, LegalContractStatus } from '../services/contracts.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { numberToWords as formatNumberToWords } from '@/utils/number-to-words';
import PrintButton from '@/components/PrintButton';
import { exportHtmlToWord } from '@/utils/word-export';
import { renderContractTemplate } from '@/utils/contract-template';
import CancelDialog from '../components/CancelDialog';
import { COMPANY } from '../company-info';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const STATUS_LABELS: Record<LegalContractStatus, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته',
  CANCELLED: 'ابطال‌شده',
  TERMINATED: 'فسخ‌شده',
};

const PRINT_STYLES = `
@media print {
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }

  html, body {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  * {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    will-change: auto !important;
    contain: none !important;
  }

  body * { visibility: hidden !important; }

  .print-header-fixed,
  .print-header-fixed *,
  .print-footer-fixed,
  .print-footer-fixed *,
  .print-area,
  .print-area * {
    visibility: visible !important;
  }

  body > div,
  body > div > div,
  body > div > div > div,
  body > div > div > div > div,
  main,
  [role='main'] {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    position: static !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .print-area {
    padding-top: 28mm !important;   /* جای هدر ثابت 22mm + 6mm فاصله */
    padding-bottom: 20mm !important; /* جای فوتر ثابت 14mm + 6mm فاصله */
    height: auto !important;
    overflow: visible !important;
    position: static !important;
    display: block !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: white !important;
    border: none !important;
  }

  .no-print { display: none !important; }

  /* سربرگ: لوگو بالا + نام شرکت زیرش، وسط‌چین */
  .print-header-fixed {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 22mm !important;
    padding: 1mm 12mm 1mm !important;
    background: white !important;
    border-bottom: 1px solid #cbd5e1 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 9999 !important;
    box-sizing: border-box !important;
    visibility: visible !important;
  }
  .print-header-fixed .logo-wrap img {
    display: block !important;
    height: 10.5mm !important;
    width: auto !important;
    object-fit: contain !important;
    visibility: visible !important;
  }
  .print-header-fixed .print-header-meta {
    font-size: 9px !important;
    color: #1e3a8a !important;
    margin-top: 0.4mm !important;
    display: flex !important;
    gap: 8mm !important;
    justify-content: center !important;
  }
  .print-header-fixed .print-header-meta span {
    white-space: nowrap !important;
    font-weight: bold !important;
  }
  .print-header-fixed .brand-name {
    font-size: 15px !important;
    font-weight: bold !important;
    color: #1e3a8a !important;
    text-align: center !important;
    margin-top: 0.5mm !important;
    line-height: 1.2 !important;
  }

  /* فوتر: بدون خط جداکننده، دو ستون */
  .print-footer-fixed {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 14mm !important;
    padding: 1mm 12mm 1mm !important;
    background: white !important;
    display: flex !important;
    justify-content: space-around !important;
    align-items: flex-start !important;
    z-index: 9999 !important;
    box-sizing: border-box !important;
    visibility: visible !important;
  }
  .print-footer-fixed > div {
    text-align: center !important;
    flex: 1 !important;
  }
  .print-footer-fixed .sig-title {
    font-weight: bold !important;
    color: #1e3a8a !important;
    font-size: 10px !important;
    margin-bottom: 1mm !important;
  }
  .print-footer-fixed .sig-name {
    color: #475569 !important;
    font-size: 10px !important;
  }

  /* جدول‌ها */
  .print-area table,
  .contract-body table {
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    font-size: 9px !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }
  .print-area table th,
  .print-area table td,
  .contract-body table th,
  .contract-body table td {
    padding: 2px 3px !important;
    font-size: 9px !important;
    word-break: break-word !important;
    line-height: 1.3 !important;
  }

  .contract-body {
    font-size: 11px !important;
    line-height: 1.7 !important;
  }
  .contract-body h1,
  .contract-body h2,
  .contract-body h3 {
    font-size: 12px !important;
    margin: 4px 0 !important;
    page-break-after: avoid !important;
  }
}

@media screen {
  .print-header-fixed,
  .print-footer-fixed { display: none !important; }
}
`;

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
    <div className='p-12 flex items-center justify-center text-slate-400'>
      <Loader2 className='w-6 h-6 animate-spin' />
    </div>
  );
  if (!data) return <div className='p-8 text-center text-slate-500'>قرارداد پیدا نشد</div>;

  const handleWordExport = async () => {
    if (!data) return;
    const root = printRef.current;
    let innerHtml = '';
    if (root) {
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.no-print').forEach((el) => el.remove());
      innerHtml = clone.innerHTML;
    }
    await exportHtmlToWord({
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

  const renderedBody = data?.bodyHtml
    ? renderContractTemplate(data.bodyHtml, { ...data, company: COMPANY, wage: data.wageBreakdown || {} } as any)
    : '';

  // ─── Portalها برای سربرگ و فوتر چاپ ───
  // B15.4: print meta — کد و تاریخ
  const printHeaderEl = (
    <div className='print-header-fixed'>
      <div className='logo-wrap'>
        <img src={window.location.origin + '/images/logo.png'} alt='لوگو' />
      </div>
      <div className='brand-name'>{COMPANY.name}</div>
      <div className='print-header-meta'>
        <span>شماره: {data?.code || '—'}</span>
        <span>تاریخ: {data?.registrationDate ? formatJalaliDate(data.registrationDate) : '—'}</span>
      </div>
    </div>
  );

  const printFooterEl = (
    <div className='print-footer-fixed'>
      <div>
        <div className='sig-title'>امضای کارفرما</div>
        <div className='sig-name'>{data.companySignerName || 'شرکت سدید کوه بن آچه'}</div>
      </div>
      <div>
        <div className='sig-title'>امضای پیمانکار</div>
        <div className='sig-name'>{data.workerSignerName || data.party?.fullName || '................................'}</div>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {typeof document !== 'undefined' && createPortal(printHeaderEl, document.body)}
      {typeof document !== 'undefined' && createPortal(printFooterEl, document.body)}

      <div className='space-y-6'>
        <div className='flex items-center justify-between flex-wrap gap-4 no-print'>
          <div className='flex items-center gap-3'>
            <button onClick={() => nav('/contracts')} className='btn-secondary'><ArrowRight className='w-4 h-4' /></button>
            <div>
              <h1 className='text-2xl font-bold text-slate-800 flex items-center gap-2'>
                {data.title}
              </h1>
              <p className='text-sm text-slate-500 mt-1 num' dir='ltr'>{data.code} — {KIND_LABELS[data.kind]}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <PrintButton contentRef={printRef} documentTitle={data.title} pageMargin="28mm 12mm 20mm 12mm" /> {/* CONTRACT_PRINT_MARGIN_FIX */}
            <button onClick={handleWordExport} className='btn-secondary' title='خروجی Word'>
              <FileText className='w-4 h-4' />
              Word
            </button>
            {data.status === 'DRAFT' && (
              <button onClick={handleActivate} className='btn-primary'>
                <Play className='w-4 h-4' /> فعال‌سازی
              </button>
            )}
            {data.status === 'ACTIVE' && (
              <button onClick={handleComplete} className='btn-primary'>
                <CheckCircle2 className='w-4 h-4' /> خاتمه
              </button>
            )}
            {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
              <button onClick={() => setCancelling(true)} className='btn-danger'>
                <Ban className='w-4 h-4' /> ابطال
              </button>
            )}
          </div>
        </div>

        <div ref={printRef} className='card p-8 bg-white print-area'>
          <div className='grid grid-cols-2 gap-6 text-sm no-print'>
            <div>
              <div className='text-slate-500 mb-1'>طرف قرارداد:</div>
              <div className='font-bold'>{data.party?.fullName}</div>
              {data.party?.nationalId && <div className='text-xs num' dir='ltr'>کد ملی: {data.party.nationalId}</div>}
              {data.party?.fatherName && <div className='text-xs'>فرزند: {data.party.fatherName}</div>}
            </div>
            <div>
              <div className='text-slate-500 mb-1'>وضعیت:</div>
              <div className='font-bold'>{STATUS_LABELS[data.status]}</div>
            </div>
            {data.project && (
              <div>
                <div className='text-slate-500 mb-1'>پروژه:</div>
                <div className='font-bold'>{data.project.name}</div>
              </div>
            )}
            {data.registrationNumber && (
              <div>
                <div className='text-slate-500 mb-1'>شماره ثبت:</div>
                <div className='num' dir='ltr'>{data.registrationNumber}</div>
              </div>
            )}
            {data.registrationDate && (
              <div>
                <div className='text-slate-500 mb-1'>تاریخ ثبت:</div>
                <div className='num'>{formatJalaliDate(data.registrationDate)}</div>
              </div>
            )}
            {data.startDate && (
              <div>
                <div className='text-slate-500 mb-1'>تاریخ شروع:</div>
                <div className='num'>{formatJalaliDate(data.startDate)}</div>
              </div>
            )}
            {data.endDate && (
              <div>
                <div className='text-slate-500 mb-1'>تاریخ پایان:</div>
                <div className='num'>{formatJalaliDate(data.endDate)}</div>
              </div>
            )}
            {data.durationText && (
              <div>
                <div className='text-slate-500 mb-1'>مدت:</div>
                <div>{data.durationText}</div>
              </div>
            )}
            {data.workLocation && (
              <div className='col-span-2'>
                <div className='text-slate-500 mb-1'>محل انجام کار:</div>
                <div>{data.workLocation}</div>
              </div>
            )}
          </div>

          {(data.totalAmount || data.salaryMonthly || data.salaryDaily || data.salaryHourly) && (
            <div className='mt-6 p-4 bg-slate-50 rounded-lg no-print'>
              <div className='font-bold mb-3'>مبالغ و حقوق</div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                {data.totalAmount && (
                  <div>
                    <div className='text-slate-500 text-xs mb-1'>مبلغ کل</div>
                    <div className='num font-bold' dir='ltr'>{formatNumber(Number(data.totalAmount))}</div>
                    <div className='text-xs text-slate-500'>ریال</div>
                  </div>
                )}
                {data.salaryMonthly && (
                  <div>
                    <div className='text-slate-500 text-xs mb-1'>حقوق ماهانه</div>
                    <div className='num font-bold' dir='ltr'>{formatNumber(Number(data.salaryMonthly))}</div>
                    <div className='text-xs text-slate-500'>ریال</div>
                  </div>
                )}
                {data.salaryDaily && (
                  <div>
                    <div className='text-slate-500 text-xs mb-1'>حقوق روزانه</div>
                    <div className='num font-bold' dir='ltr'>{formatNumber(Number(data.salaryDaily))}</div>
                    <div className='text-xs text-slate-500'>ریال</div>
                  </div>
                )}
                {data.salaryHourly && (
                  <div>
                    <div className='text-slate-500 text-xs mb-1'>حقوق ساعتی</div>
                    <div className='num font-bold' dir='ltr'>{formatNumber(Number(data.salaryHourly))}</div>
                    <div className='text-xs text-slate-500'>ریال</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(data.guaranteeType || data.guaranteeNumber || data.guaranteeAmount) && (
            <div className='mt-6 p-4 bg-amber-50 rounded-lg no-print'>
              <div className='font-bold mb-3'>تضامین قراردادی</div>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm'>
                {data.guaranteeType && <div><div className='text-slate-500 text-xs'>نوع</div><div>{data.guaranteeType}</div></div>}
                {data.guaranteeNumber && <div><div className='text-slate-500 text-xs'>شماره</div><div className='num' dir='ltr'>{data.guaranteeNumber}</div></div>}
                {data.guaranteeAmount && <div><div className='text-slate-500 text-xs'>مبلغ</div><div className='num' dir='ltr'>{formatNumber(Number(data.guaranteeAmount))}</div></div>}
                {data.guaranteeBank && <div><div className='text-slate-500 text-xs'>بانک</div><div>{data.guaranteeBank}</div></div>}
              </div>
            </div>
          )}

          {data.items && data.items.length > 0 && (
            <div className='mt-6 no-print'>
              <div className='font-bold mb-3 pb-2 border-b'>اجزای اجرای قرارداد</div>
              <table className='w-full text-sm border'>
                <thead className='bg-slate-50'>
                  <tr>
                    <th className='border p-2 text-center w-12'>#</th>
                    <th className='border p-2 text-right'>شرح</th>
                    <th className='border p-2 text-center w-24'>واحد</th>
                    <th className='border p-2 text-center w-24'>تعداد</th>
                    <th className='border p-2 text-left w-32'>مبلغ واحد (ریال)</th>
                    <th className='border p-2 text-left w-32'>جمع (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it: any, i: number) => (
                    <tr key={it.id || i}>
                      <td className='border p-2 text-center num'>{i + 1}</td>
                      <td className='border p-2'>{it.description}{it.notes ? ' — ' + it.notes : ''}</td>
                      <td className='border p-2 text-center'>{it.unit || '—'}</td>
                      <td className='border p-2 text-center num' dir='ltr'>{formatNumber(Number(it.quantity || 0))}</td>
                      <td className='border p-2 text-left num' dir='ltr'>{formatNumber(Number(it.unitPrice || 0))}</td>
                      <td className='border p-2 text-left num font-bold bg-emerald-50' dir='ltr'>{formatNumber(Number(it.totalPrice || 0))}</td>
                    </tr>
                  ))}
                  <tr className='bg-slate-100 font-bold'>
                    <td colSpan={5} className='border p-2 text-left'>جمع کل اجزا</td>
                    <td className='border p-2 text-left num bg-emerald-100' dir='ltr'>
                      {formatNumber(data.items.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className='mt-3 text-sm p-3 bg-emerald-50 border border-emerald-200 rounded'>
                <span className='text-slate-600'>جمع کل به حروف: </span>
                <span className='font-bold text-emerald-800'>
                  {formatNumberToWords(
                    data.items.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0)
                  )}{' '}
                  ریال
                </span>
              </div>
            </div>
          )}

          {data.subject && (
            <div className='mt-6 no-print'>
              <div className='font-bold mb-2'>موضوع قرارداد</div>
              <p className='text-sm leading-7 whitespace-pre-wrap'>{data.subject}</p>
            </div>
          )}

          {renderedBody && (
            <div className='mt-6'>
              <div className='contract-body text-sm leading-8' dangerouslySetInnerHTML={{ __html: renderedBody }} />
            </div>
          )}

          {data.notes && (
            <div className='mt-6 p-3 bg-slate-50 rounded no-print'>
              <div className='text-xs text-slate-500 mb-1'>یادداشت</div>
              <div className='text-sm'>{data.notes}</div>
            </div>
          )}

          {data.status === 'CANCELLED' && data.cancellationReason && (
            <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg no-print'>
              <div className='font-bold text-red-700 mb-1'>این قرارداد ابطال شده است</div>
              <div className='text-sm text-red-600'>{data.cancellationReason}</div>
              {data.cancelledAt && (
                <div className='text-xs text-red-500 mt-2 num'>
                  تاریخ ابطال: {formatJalaliDate(data.cancelledAt)}
                </div>
              )}
            </div>
          )}
        </div>

        <CancelDialog
          isOpen={cancelling}
          title='ابطال قرارداد'
          message='دلیل ابطال را وارد کنید. این عمل برگشت‌پذیر نیست.'
          loading={actionLoading}
          onConfirm={handleCancel}
          onCancel={() => setCancelling(false)}
        />
      </div>
    </>
  );
}
