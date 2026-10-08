import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Calculator, CheckCircle2, XCircle, Printer, FileText,
} from 'lucide-react';
import clsx from 'clsx';
import { overheadApi } from '../services/overhead.api';
import type { OverheadAllocation } from '@/types/overhead';
import {
  OVERHEAD_METHOD_LABELS, OVERHEAD_STATUS_LABELS, OVERHEAD_STATUS_COLORS,
} from '@/types/overhead';
import { toPersianDigits } from '@/utils/format';

export default function OverheadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<OverheadAllocation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setItem(await overheadApi.get(id));
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handlePost = async () => {
    if (!id || !confirm('سند تسهیم در حسابداری ثبت شود؟')) return;
    try {
      await overheadApi.post(id);
      toast.success('سند ثبت شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!item) return null;

  const totalPercent = item.items.reduce((s, it) => s + Number(it.percent), 0);
  const totalAmount = item.items.reduce((s, it) => s + Number(it.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/overhead-allocations')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> تسهیم سربار
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{item.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{item.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', OVERHEAD_STATUS_COLORS[item.status])}>
                  {OVERHEAD_STATUS_LABELS[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{item.fiscalYear?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num" dir="ltr">{item.periodMonth}</span>
                <span className="text-slate-300">•</span>
                <span>{OVERHEAD_METHOD_LABELS[item.method]}</span>
                {item.journalEntry && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 num text-xs" dir="ltr">سند: {item.journalEntry.code}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> چاپ
            </button>
            {item.status === 'DRAFT' && (
              <button className="btn-primary" onClick={handlePost}>
                <CheckCircle2 className="w-4 h-4" /> ثبت در حسابداری
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">مبلغ کل</div>
            <div className="text-xl font-bold num">{toPersianDigits(Number(item.totalAmount).toLocaleString())}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">تعداد پروژه</div>
            <div className="text-xl font-bold num">{toPersianDigits(item.items.length)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">جمع درصد</div>
            <div className="text-xl font-bold num">{toPersianDigits(totalPercent.toFixed(2))}٪</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-slate-800">ردیف‌های تسهیم</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-center px-4 py-2 w-12 font-medium text-slate-600">#</th>
                <th className="text-right px-4 py-2 w-32 font-medium text-slate-600">کد پروژه</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600">نام پروژه</th>
                <th className="text-center px-4 py-2 w-32 font-medium text-slate-600">درصد</th>
                <th className="text-left px-4 py-2 w-40 font-medium text-slate-600">مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {item.items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="px-4 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                  <td className="px-4 py-2">
                    <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">
                      {it.project?.code}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-800 text-xs">{it.project?.name}</td>
                  <td className="px-4 py-2 text-center num text-xs">{toPersianDigits(Number(it.percent).toFixed(2))}٪</td>
                  <td className="px-4 py-2 text-left num text-xs font-bold">
                    {toPersianDigits(Number(it.amount).toLocaleString())}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-slate-700">جمع کل</td>
                <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(totalPercent.toFixed(2))}٪</td>
                <td className="px-4 py-3 text-left num text-xs">{toPersianDigits(Math.round(totalAmount).toLocaleString())}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
