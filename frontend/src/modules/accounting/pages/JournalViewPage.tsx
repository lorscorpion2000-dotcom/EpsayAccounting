import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Printer, Edit, XCircle, CheckCircle2,
  FileText, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import type { JournalEntry, JournalStatus } from '@/types/accounting';
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUS_COLORS } from '@/types/accounting';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';

export default function JournalViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await accountingApi.journals.get(id);
      setJournal(data);
    } catch {
      toast.error('خطا در بارگذاری سند');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handlePost = async () => {
    if (!journal) return;
    setPosting(true);
    try {
      await accountingApi.journals.post(journal.id);
      toast.success('سند با موفقیت ثبت شد');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ثبت');
    } finally {
      setPosting(false);
    }
  };

  const handleReverse = async () => {
    if (!journal || !reversalReason.trim()) {
      toast.error('دلیل ابطال الزامی است');
      return;
    }
    setReversing(true);
    try {
      await accountingApi.journals.reverse(journal.id, reversalReason);
      toast.success('سند ابطال شد و سند معکوس ایجاد گردید');
      setShowReverseModal(false);
      setReversalReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ابطال');
    } finally {
      setReversing(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!journal) return null;

  const totalDebit = Number(journal.totalDebit);
  const totalCredit = Number(journal.totalCredit);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button
          onClick={() => navigate('/accounting/journals')}
          className="hover:text-brand-600 flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          اسناد حسابداری
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{journal.code}</span>
      </div>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">
                  {journal.code}
                </h1>
                <span className={clsx(
                  'text-xs px-2.5 py-1 rounded-md',
                  JOURNAL_STATUS_COLORS[journal.status as JournalStatus],
                )}>
                  {JOURNAL_STATUS_LABELS[journal.status as JournalStatus]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num">تاریخ: {formatJalaliDate(journal.entryDate)}</span>
                {journal.reference && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="num">مرجع: {journal.reference}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            {journal.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => navigate('/accounting/journals/' + journal.id + '/edit')}
                  className="btn-secondary"
                >
                  <Edit className="w-4 h-4" />
                  ویرایش
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting}
                  className="btn-primary"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  ثبت نهایی
                </button>
              </>
            )}
            {journal.status === 'POSTED' && (
              <>
                <button
                  onClick={() => window.print()}
                  className="btn-secondary"
                >
                  <Printer className="w-4 h-4" />
                  چاپ
                </button>
                <button
                  onClick={() => setShowReverseModal(true)}
                  className="btn-danger"
                >
                  <XCircle className="w-4 h-4" />
                  ابطال سند
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-1">شرح سند</div>
          <div className="text-sm text-slate-800">{journal.description}</div>
        </div>

        {/* Reversal info */}
        {journal.status === 'REVERSED' && journal.reversalReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
              <XCircle className="w-4 h-4" />
              این سند ابطال شده است
            </div>
            <div className="text-xs text-red-600">
              دلیل ابطال: {journal.reversalReason}
            </div>
            {journal.reversedAt && (
              <div className="text-xs text-red-500 mt-1 num">
                تاریخ ابطال: {formatJalaliDate(journal.reversedAt)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lines table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-12">#</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد حساب</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">نام حساب</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">شرح</th>
                <th className="text-left px-4 py-3 font-bold text-emerald-700 w-40">بدهکار</th>
                <th className="text-left px-4 py-3 font-bold text-brand-700 w-40">بستانکار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journal.lines?.map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-center text-slate-500 num">
                    {toPersianDigits(idx + 1)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="num text-xs text-slate-600 font-mono" dir="ltr">
                      {line.account?.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {line.account?.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {line.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {Number(line.debit) > 0 ? (
                      <span className="num font-medium text-emerald-700" dir="ltr">
                        {formatNumber(Number(line.debit))}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {Number(line.credit) > 0 ? (
                      <span className="num font-medium text-brand-700" dir="ltr">
                        {formatNumber(Number(line.credit))}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-800">
                  جمع کل
                </td>
                <td className="px-4 py-3 text-left">
                  <span className="num font-bold text-emerald-800" dir="ltr">
                    {formatNumber(totalDebit)}
                  </span>
                </td>
                <td className="px-4 py-3 text-left">
                  <span className="num font-bold text-brand-800" dir="ltr">
                    {formatNumber(totalCredit)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Balance status */}
      <div className={clsx(
        'card p-4 flex items-center gap-3',
        isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
      )}>
        {isBalanced ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-600" />
        )}
        <div className="flex-1">
          <div className={clsx(
            'font-bold',
            isBalanced ? 'text-emerald-800' : 'text-red-800',
          )}>
            {isBalanced ? 'سند تراز است ✅' : 'سند تراز نیست ❌'}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            اختلاف: {formatNumber(Math.abs(totalDebit - totalCredit))} ریال
          </div>
        </div>
      </div>

      {/* Meta footer */}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs no-print">
        <MetaItem label="کد سند" value={journal.code} ltr />
        <MetaItem label="شماره سند" value={toPersianDigits(journal.entryNumber)} />
        <MetaItem label="تاریخ ثبت" value={formatJalaliDate((journal as any).createdAt)} />
        <MetaItem
          label="تاریخ نهایی‌سازی"
          value={journal.postedAt ? formatJalaliDate(journal.postedAt) : '—'}
        />
      </div>

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">ابطال سند</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    سند «<span className="font-medium num">{journal.code}</span>» ابطال می‌شود و یک سند معکوس خودکار ایجاد خواهد شد.
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="label">دلیل ابطال *</label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="مثال: اشتباه در مبلغ، مغایرت با مستندات..."
                  className="input resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setShowReverseModal(false); setReversalReason(''); }}
                  className="btn-secondary"
                >
                  انصراف
                </button>
                <button
                  onClick={handleReverse}
                  disabled={reversing || !reversalReason.trim()}
                  className="btn-danger"
                >
                  {reversing ? 'در حال ابطال...' : 'ابطال سند'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <div className="text-slate-500 mb-1">{label}</div>
      <div className={clsx('font-medium text-slate-800 num', ltr ? 'font-mono' : '')} dir={ltr ? 'ltr' : 'rtl'}>
        {value}
      </div>
    </div>
  );
}
