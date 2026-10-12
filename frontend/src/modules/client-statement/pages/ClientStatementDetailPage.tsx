import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, FileSpreadsheet, Printer, Send, CheckCircle2, XCircle, Package, Users, Wrench, Truck, Cog, FileText, Edit, BadgeCheck, Ban } from 'lucide-react';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';
import { clientStatementApi } from '../services/client-statement.api';
import type { ClientStatement, CSItem, CSCategory } from '@/types/client-statement';
import {
  CS_CATEGORY_LABELS, CS_CATEGORY_ORDER, CS_STATUS_LABELS, CS_STATUS_COLORS,
} from '@/types/client-statement';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

const CATEGORY_ICONS: Record<CSCategory, any> = {
  MATERIAL: Package,
  LABOR: Users,
  MISC: Wrench,
  TRANSPORT: Truck,
  EQUIPMENT: Cog,
};

type Tab = 'summary' | 'print' | CSCategory;

export default function ClientStatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [s, setS] = useState<ClientStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('summary');
  const [action, setAction] = useState<{ type: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonModal, setReasonModal] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setS(await clientStatementApi.get(id));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // ─── Print handler ───
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: s ? 'صورت‌وضعیت-' + s.code : 'statement',
  });

  const handleSubmit = async () => {
    if (!s) return;
    setActionLoading(true);
    try {
      await clientStatementApi.submit(s.id);
      toast.success('ارسال شد');
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    if (!s) return;
    setActionLoading(true);
    try {
      await clientStatementApi.approve(s.id);
      toast.success('تایید شد');
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!s || !reason.trim()) return;
    setActionLoading(true);
    try {
      await clientStatementApi.reject(s.id, reason);
      toast.success('رد شد');
      setReasonModal(false);
      setReason('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handlePost = async () => {
    if (!s) return;
    setActionLoading(true);
    try {
      await clientStatementApi.post(s.id);
      toast.success('سند حسابداری ثبت شد');
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!s) return;
    setActionLoading(true);
    try {
      await clientStatementApi.cancel(s.id);
      toast.success('لغو شد');
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const grouped = useMemo(() => {
    if (!s?.items) return {} as Record<CSCategory, CSItem[]>;
    const map: Record<CSCategory, CSItem[]> = {
      MATERIAL: [], LABOR: [], MISC: [], TRANSPORT: [], EQUIPMENT: [],
    };
    for (const it of s.items) {
      if (map[it.category]) map[it.category].push(it);
    }
    return map;
  }, [s]);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!s) return null;

  const TABS: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'summary', label: 'خلاصه', icon: FileText },
    ...CS_CATEGORY_ORDER.map((cat) => ({
      key: cat as Tab,
      label: CS_CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat],
      count: grouped[cat]?.length || 0,
    })),
    { key: 'print', label: 'چاپ / PDF', icon: Printer },
  ];

  const isDraft = s.status === 'DRAFT';
  const isSubmitted = s.status === 'SUBMITTED';
  const canPost = (s.status === 'APPROVED' || s.status === 'SUBMITTED') && !s.journalEntryId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/client-statements')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> صورت‌وضعیت‌ها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{s.code}</span>
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
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{s.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', CS_STATUS_COLORS[s.status])}>
                  {CS_STATUS_LABELS[s.status]}
                </span>
                {s.journalEntry && (
                  <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> سند: <span className="num" dir="ltr">{s.journalEntry.code}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{s.project?.name}</span>
                <span className="text-slate-300">•</span>
                <span>شماره: <span className="num">{toPersianDigits(s.statementNumber)}</span></span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(s.periodStart)} تا {formatJalaliDate(s.periodEnd)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <>
                <button className="btn-secondary" onClick={() => navigate('/client-statements/' + s.id + '/edit')}>
                  <Edit className="w-4 h-4" /> ویرایش
                </button>
                <button className="btn-primary" onClick={() => setAction({ type: 'submit' })}>
                  <Send className="w-4 h-4" /> ارسال
                </button>
              </>
            )}
            {isSubmitted && (
              <>
                <button className="btn-danger" onClick={() => setReasonModal(true)}>
                  <XCircle className="w-4 h-4" /> رد
                </button>
                <button className="btn-primary" onClick={() => setAction({ type: 'approve' })}>
                  <CheckCircle2 className="w-4 h-4" /> تایید
                </button>
              </>
            )}
            {canPost && (
              <button className="btn-primary" onClick={() => setAction({ type: 'post' })}>
                <BadgeCheck className="w-4 h-4" /> ثبت سند حسابداری
              </button>
            )}
            {!['CANCELLED', 'PAID'].includes(s.status) && (
              <button className="btn-secondary" onClick={() => setAction({ type: 'cancel' })}>
                <Ban className="w-4 h-4" /> لغو
              </button>
            )}
          </div>
        </div>

        {/* Rejection reason */}
        {s.rejectedReason && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div><span className="font-bold">دلیل رد: </span>{s.rejectedReason}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden no-print">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}>
                <Icon className="w-4 h-4" />
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                    {toPersianDigits(t.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {CS_CATEGORY_ORDER.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const subtotalKey = ('subtotal' + cat.charAt(0) + cat.slice(1).toLowerCase()) as keyof ClientStatement;
              const val = Number(s[subtotalKey] || 0);
              return (
                <div key={cat} className="card p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon className="w-4 h-4" /> {CS_CATEGORY_LABELS[cat]}
                  </div>
                  <div className="text-sm font-bold num mt-2">{toPersianDigits(Math.round(val).toLocaleString())}</div>
                </div>
              );
            })}
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-slate-800 border-b pb-2">خلاصه مالی</h2>
            <Row label="جمع هزینه‌ها (قبل از ضریب)" value={Number(s.totalBeforeCoefficient)} />
            <Row label={'جمع با احتساب ضریب ' + s.coefficient} value={Number(s.totalAfterCoefficient)} />
            <Row label={'حق‌العمل پیمانکار (' + s.contractorSharePercent + '٪)'} value={Number(s.contractorShareAmount)} bold />
            <div className="border-t pt-3 mt-3">
              <Row label={'استهلاک پیش‌پرداخت (' + s.prepaymentDeductionPercent + '٪)'} value={Number(s.prepaymentDeductionAmount)} negative />
            </div>
            <div className="border-t-2 pt-3 mt-3">
              <Row label="خالص قابل دریافت" value={Number(s.netPayable)} bold highlight />
            </div>
          </div>
        </div>
      )}

      {/* Category tab */}
      {tab !== 'summary' && tab !== 'print' && (
        <div className="card overflow-hidden">
          {!grouped[tab as CSCategory] || grouped[tab as CSCategory].length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              هیچ ردیفی در این دسته ثبت نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-center px-3 py-2 w-12 font-medium text-slate-600">#</th>
                    <th className="text-right px-3 py-2 w-28 font-medium text-slate-600">ش.ف</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">شرح</th>
                    <th className="text-center px-3 py-2 w-24 font-medium text-slate-600">واحد</th>
                    <th className="text-left px-3 py-2 w-32 font-medium text-slate-600">بهای واحد</th>
                    <th className="text-center px-3 py-2 w-20 font-medium text-slate-600">مقدار</th>
                    <th className="text-left px-3 py-2 w-32 font-medium text-slate-600">جمع</th>
                    <th className="text-center px-3 py-2 w-32 font-medium text-slate-600">تاریخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grouped[tab as CSCategory].map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                      <td className="px-3 py-2">
                        <span className="num text-xs font-mono" dir="ltr">{it.priceListCode || '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-xs">{it.description}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-500">{it.unit || '—'}</td>
                      <td className="px-3 py-2 text-left num text-xs">{toPersianDigits(Number(it.unitPrice).toLocaleString())}</td>
                      <td className="px-3 py-2 text-center num text-xs">{toPersianDigits(Number(it.quantity))}</td>
                      <td className="px-3 py-2 text-left num text-xs font-bold">
                        {toPersianDigits(Math.round(Number(it.totalPrice || Number(it.unitPrice) * Number(it.quantity))).toLocaleString())}
                      </td>
                      <td className="px-3 py-2 text-center num text-xs">
                        {it.itemDate ? formatJalaliDate(it.itemDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Print tab */}
      {tab === 'print' && (
        <div className="space-y-4">
          <div className="card p-4 no-print flex items-center justify-between">
            <div className="text-sm text-slate-600">
              7 برگ صورت‌وضعیت (برگه‌های مالی + خلاصه) آماده چاپ است
            </div>
            <button onClick={handlePrint} className="btn-primary">
              <Printer className="w-4 h-4" /> چاپ / ذخیره PDF
            </button>
          </div>

          <div ref={printRef} className="bg-white p-6" dir="rtl">
            <PrintSheets statement={s} grouped={grouped} />
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={!!action && action.type !== 'cancel'}
        title={
          action?.type === 'submit' ? 'ارسال صورت‌وضعیت' :
          action?.type === 'approve' ? 'تایید صورت‌وضعیت' :
          action?.type === 'post' ? 'ثبت سند حسابداری' : ''
        }
        message={
          action?.type === 'submit' ? 'صورت‌وضعیت به کارتابل ارسال می‌شود.' :
          action?.type === 'approve' ? 'صورت‌وضعیت تایید می‌شود.' :
          action?.type === 'post' ? 'سند حسابداری برای صورت‌وضعیت ثبت می‌شود. مطمئنید؟' : ''
        }
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={
          action?.type === 'submit' ? handleSubmit :
          action?.type === 'approve' ? handleApprove :
          handlePost
        }
        onCancel={() => setAction(null)}
      />

      <ConfirmDialog
        isOpen={!!action && action.type === 'cancel'}
        title="لغو صورت‌وضعیت"
        message="آیا از لغو این صورت‌وضعیت اطمینان دارید؟"
        confirmLabel="بله، لغو کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setAction(null)}
      />

      {/* Reject reason modal */}
      {reasonModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد صورت‌وضعیت</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReasonModal(false); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleReject} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Row helper for summary
// ═══════════════════════════════════════════════════════════
function Row({ label, value, bold, negative, highlight }: any) {
  return (
    <div className={clsx('flex items-center justify-between', highlight && 'text-brand-700')}>
      <span className={clsx('text-sm', bold ? 'font-bold' : 'text-slate-600')}>{label}</span>
      <span className={clsx(
        'num',
        bold ? 'font-bold text-base' : 'text-sm',
        negative && 'text-red-700',
        highlight && 'text-lg font-bold',
      )}>
        {toPersianDigits(Math.round(value).toLocaleString())} ریال
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Print: 7 sheets
// ═══════════════════════════════════════════════════════════
function PrintSheets({ statement, grouped }: { statement: ClientStatement; grouped: Record<CSCategory, CSItem[]> }) {
  const s = statement;
  const sheets: { cat: CSCategory; title: string }[] = CS_CATEGORY_ORDER.map((cat) => ({
    cat,
    title: CS_CATEGORY_LABELS[cat],
  }));

  return (
    <div className="space-y-8">
      {sheets.map(({ cat, title }, sheetIdx) => {
        const rows = grouped[cat] || [];
        const subtotalKey = ('subtotal' + cat.charAt(0) + cat.slice(1).toLowerCase()) as keyof ClientStatement;
        const subtotal = Number(s[subtotalKey] || 0);
        return (
          <div key={cat} className="border-2 border-slate-300 p-4 mb-8" style={{ pageBreakAfter: 'always' }}>
            <PrintHeader s={s} sheetTitle={title} sheetNumber={sheetIdx + 1} />
            <table className="w-full text-xs border-collapse mt-3" style={{ border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '30px' }}>ردیف</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '60px' }}>شماره</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>شرح عملیات</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '60px' }}>واحد</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '90px' }}>بهای واحد</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '50px' }}>مقدار</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '100px' }}>بهای کل</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px', width: '70px' }}>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td></tr>
                ) : rows.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center', fontFamily: 'monospace' }}>{it.priceListCode || '—'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px' }}>{it.description}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>{it.unit || '—'}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'left' }}>{toPersianDigits(Number(it.unitPrice).toLocaleString())}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>{toPersianDigits(Number(it.quantity))}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'left', fontWeight: 'bold' }}>{toPersianDigits(Math.round(Number(it.totalPrice)).toLocaleString())}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>{it.itemDate ? formatJalaliDate(it.itemDate) : '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                  <td colSpan={6} style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left' }}>جمع کل {title}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'left' }}>{toPersianDigits(Math.round(subtotal).toLocaleString())}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '4px' }}></td>
                </tr>
              </tbody>
            </table>
            <Signatures />
          </div>
        );
      })}

      {/* Sheet 6: خلاصه مالی */}
      <div className="border-2 border-slate-300 p-4 mb-8" style={{ pageBreakAfter: 'always' }}>
        <PrintHeader s={s} sheetTitle="خلاصه مالی" sheetNumber={6} />
        <table className="w-full text-xs border-collapse mt-3" style={{ border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '30px' }}>ردیف</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>شرح</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '150px' }}>جمع کل (ریال)</th>
            </tr>
          </thead>
          <tbody>
            {CS_CATEGORY_ORDER.map((cat, idx) => {
              const subtotalKey = ('subtotal' + cat.charAt(0) + cat.slice(1).toLowerCase()) as keyof ClientStatement;
              const val = Number(s[subtotalKey] || 0);
              return (
                <tr key={cat}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>{toPersianDigits(idx + 1)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px' }}>{CS_CATEGORY_LABELS[cat]}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(val).toLocaleString())}</td>
                </tr>
              );
            })}
            <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
              <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>جمع هزینه‌ها</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.totalBeforeCoefficient)).toLocaleString())}</td>
            </tr>
          </tbody>
        </table>
        <Signatures />
      </div>

      {/* Sheet 7: خلاصه مالی کل */}
      <div className="border-2 border-slate-300 p-4" style={{ pageBreakAfter: 'always' }}>
        <PrintHeader s={s} sheetTitle="خلاصه مالی کل" sheetNumber={7} />
        <table className="w-full text-xs border-collapse mt-3" style={{ border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '30px' }}>ردیف</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'right' }}>شرح</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px', width: '150px' }}>جمع کل (ریال)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>۱</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px' }}>جمع هزینه‌ها</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.totalBeforeCoefficient)).toLocaleString())}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>۲</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px' }}>جمع با احتساب ضریب {s.coefficient}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.totalAfterCoefficient)).toLocaleString())}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>۳</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px' }}>حق‌العمل پیمانکار ({s.contractorSharePercent}٪)</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.contractorShareAmount)).toLocaleString())}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'center' }}>۴</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px' }}>درصد استهلاک پیش‌پرداخت ({s.prepaymentDeductionPercent}٪)</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '5px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.prepaymentDeductionAmount)).toLocaleString())}</td>
            </tr>
            <tr style={{ background: '#dcfce7', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>۵</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>خالص قابل دریافت</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>{toPersianDigits(Math.round(Number(s.netPayable)).toLocaleString())}</td>
            </tr>
          </tbody>
        </table>
        <Signatures />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Print header (repeats on each sheet)
// ═══════════════════════════════════════════════════════════
function PrintHeader({ s, sheetTitle, sheetNumber }: any) {
  return (
    <div>
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
        <div className="text-xs space-y-0.5">
          <div><span className="font-bold">پروژه: </span>{s.project?.name}</div>
          <div><span className="font-bold">کارفرما: </span>—</div>
          <div><span className="font-bold">مشاور: </span>—</div>
          <div><span className="font-bold">پیمانکار: </span>—</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-base">{sheetTitle}</div>
          <div className="text-xs mt-1">برگه مالی — شماره {toPersianDigits(sheetNumber)} از ۷</div>
        </div>
        <div className="text-xs text-left space-y-0.5">
          <div>صورت‌وضعیت شماره <span className="num font-bold">{toPersianDigits(s.statementNumber)}</span></div>
          <div>کد: <span className="num" style={{ fontFamily: 'monospace' }}>{s.code}</span></div>
          <div>دوره: <span className="num">{formatJalaliDate(s.periodStart)}</span> تا <span className="num">{formatJalaliDate(s.periodEnd)}</span></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Signature block
// ═══════════════════════════════════════════════════════════
function Signatures() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4 text-xs" style={{ marginTop: '40px' }}>
      <div className="text-center">
        <div className="font-bold mb-8">حسابداری پیمانکار</div>
        <div>امضاء:</div>
      </div>
      <div className="text-center">
        <div className="font-bold mb-8">نماینده اجرایی کارفرما</div>
        <div>امضاء:</div>
      </div>
      <div className="text-center">
        <div className="font-bold mb-8">نمایندگان کارفرما</div>
        <div>امضاء:</div>
      </div>
    </div>
  );
}
