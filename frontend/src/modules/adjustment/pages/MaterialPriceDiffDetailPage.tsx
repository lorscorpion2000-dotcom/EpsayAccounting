import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Package, CheckCircle2, Send, XCircle, BadgeCheck, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { adjustmentApi } from '../services/adjustment.api';
import type { MaterialPriceDiff } from '@/types/adjustment';
import { ADJ_STATUS_LABELS, ADJ_STATUS_COLORS } from '@/types/adjustment';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import SignatureBlock from '@/components/SignatureBlock';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED

export default function MaterialPriceDiffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MaterialPriceDiff | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await adjustmentApi.priceDiffs.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string) => {
    if (!id) return;
    const confirmMsg = action === 'confirm' ? 'تأیید شود؟' : action === 'post' ? 'سند حسابداری ثبت شود؟' : 'لغو شود؟';
    if (!confirm(confirmMsg)) return;
    try {
      if (action === 'confirm') await adjustmentApi.priceDiffs.confirm(id);
      else if (action === 'post') await adjustmentApi.priceDiffs.post(id);
      else if (action === 'cancel') await adjustmentApi.priceDiffs.cancel(id);
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

  const diff = Number(data.diffAmount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/material-price-diffs')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> مابه‌التفاوت‌ها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{data.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Package className="w-7 h-7" />
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
                <span>{data.materialType}</span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(data.periodFrom)} تا {formatJalaliDate(data.periodTo)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <PagePrintButton documentTitle="مابه‌التفاوت مصالح" />
            {data.status === 'DRAFT' && (
              <button className="btn-primary" onClick={() => doAction('confirm')}>
                <CheckCircle2 className="w-4 h-4" /> تأیید
              </button>
            )}
            {data.status === 'CONFIRMED' && (
              <button className="btn-primary" onClick={() => doAction('post')}>
                <Send className="w-4 h-4" /> ثبت سند
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
            <div className="text-xs text-slate-500">مقدار</div>
            <div className="text-lg font-bold num">{toPersianDigits(Number(data.quantity).toFixed(2))} {data.unit || ''}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">قیمت پایه</div>
            <div className="text-lg font-bold num">{toPersianDigits(Math.round(Number(data.basePrice)).toLocaleString())}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">قیمت واقعی</div>
            <div className="text-lg font-bold num">{toPersianDigits(Math.round(Number(data.actualPrice)).toLocaleString())}</div>
          </div>
          <div className={clsx(diff > 0 ? 'text-red-700' : diff < 0 ? 'text-emerald-700' : 'text-slate-700')}>
            <div className="text-xs text-slate-500">مابه‌التفاوت کل</div>
            <div className="text-lg font-bold num flex items-center gap-1">
              {diff > 0 && <TrendingUp className="w-4 h-4" />}
              {diff < 0 && <TrendingDown className="w-4 h-4" />}
              {diff > 0 ? '+' : ''}{toPersianDigits(Math.round(diff).toLocaleString())}
            </div>
          </div>
        </div>

        {data.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
            <span className="font-bold">توضیحات: </span>{data.notes}
          </div>
        )}

        <div className="card p-6 mt-6">
          <SignatureBlock slots={[
            { title: 'تهیه‌کننده', type: 'current-user', caption: 'نام و امضا' },
            { title: 'تأییدکننده', type: 'empty', caption: 'نام و امضا' },
            { title: 'مهر شرکت', type: 'company-stamp', caption: 'مهر و امضا' },
          ]} />
        </div>
      </div>
    </div>
  );
}
