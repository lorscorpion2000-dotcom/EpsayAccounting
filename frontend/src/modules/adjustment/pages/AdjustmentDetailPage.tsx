import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Calculator, CheckCircle2, Send, XCircle, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import { adjustmentApi } from '../services/adjustment.api';
import type { AdjustmentCalculation } from '@/types/adjustment';
import { ADJ_STATUS_LABELS, ADJ_STATUS_COLORS } from '@/types/adjustment';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED

export default function AdjustmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AdjustmentCalculation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await adjustmentApi.calculations.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string) => {
    if (!id) return;
    const confirmMsg = action === 'confirm' ? 'تأیید شود؟' : action === 'post' ? 'سند حسابداری ثبت شود؟' : 'لغو شود؟';
    if (!confirm(confirmMsg)) return;
    try {
      if (action === 'confirm') await adjustmentApi.calculations.confirm(id);
      else if (action === 'post') await adjustmentApi.calculations.post(id);
      else if (action === 'cancel') await adjustmentApi.calculations.cancel(id);
      toast.success('انجام شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/adjustments')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> تعدیل‌ها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{data.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{data.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', ADJ_STATUS_COLORS[data.status])}>
                  {ADJ_STATUS_LABELS[data.status]}
                </span>
                {data.journalEntry && (
                  <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> سند: <span className="num" dir="ltr">{data.journalEntry.code}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{data.project?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(data.periodFrom)} تا {formatJalaliDate(data.periodTo)}</span>
                <span className="text-slate-300">•</span>
                <span>{data.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <PagePrintButton documentTitle="تعدیل" />
            {data.status === 'DRAFT' && (
              <button className="btn-primary" onClick={() => doAction('confirm')}>
                <CheckCircle2 className="w-4 h-4" /> تأیید
              </button>
            )}
            {data.status === 'CONFIRMED' && (
              <button className="btn-primary" onClick={() => doAction('post')}>
                <Send className="w-4 h-4" /> ثبت سند حسابداری
              </button>
            )}
            {['DRAFT', 'CONFIRMED'].includes(data.status) && (
              <button className="btn-secondary" onClick={() => doAction('cancel')}>
                <XCircle className="w-4 h-4" /> لغو
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">مبلغ پایه</div>
            <div className="text-lg font-bold num">{toPersianDigits(Math.round(Number(data.baseAmount)).toLocaleString())}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">شاخص پایه / جاری</div>
            <div className="text-lg font-bold num">
              {toPersianDigits(Number(data.baseIndex).toLocaleString())} / {toPersianDigits(Number(data.currentIndex).toLocaleString())}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">ضریب</div>
            <div className="text-lg font-bold num text-brand-700">{Number(data.coefficient).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">مبلغ تعدیل</div>
            <div className="text-lg font-bold num text-emerald-700">
              {toPersianDigits(Math.round(Number(data.adjustedAmount)).toLocaleString())}
            </div>
          </div>
        </div>

        {data.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
            <span className="font-bold">توضیحات: </span>{data.notes}
          </div>
        )}
      </div>
    </div>
  );
}
