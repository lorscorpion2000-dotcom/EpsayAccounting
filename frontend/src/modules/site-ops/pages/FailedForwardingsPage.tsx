import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle, RefreshCw, Loader2, RotateCw, ExternalLink,
  FileWarning, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { forwardingsApi, FailedForwarding } from '../services/forwardings.api';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';

const SECTION_LABELS: Record<string, string> = {
  PROGRESS: 'پیشرفت کار',
  WORKERS: 'پرسنل',
  EQUIPMENTS: 'ماشین‌آلات',
  MATERIALS: 'مصالح',
  REQUESTS: 'درخواست‌ها',
  EVENTS: 'رویدادها',
};

const TARGET_LABELS: Record<string, string> = {
  DAILY_WORK_LOG: 'کارکرد روزانه',
  GOODS_RECEIPT: 'رسید انبار',
  GOODS_ISSUE: 'حواله مصرف',
  EQUIPMENT_DAILY_LOG: 'کارکرد ماشین',
  PURCHASE_REQUEST: 'درخواست خرید',
  PETTY_CASH_REQUEST: 'درخواست تنخواه',
  NOTIFICATION: 'اعلان',
  WBS_PROGRESS_SNAPSHOT: 'اسنپشات پیشرفت',
};

export default function FailedForwardingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FailedForwarding[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await forwardingsApi.list(200);
      setItems(data);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const r = await forwardingsApi.retry(id);
      toast.success('موفق: ' + (r.targetCode || r.targetModel || 'OK'));
      await load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'retry ناموفق');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileWarning className="w-6 h-6 text-amber-600" />
            صندوق خطا — Forwarding های ناموفق
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ردیف‌هایی که هنگام ارسال به واحد مقصد خطا خورده‌اند. می‌توانید retry کنید.
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" />
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700 mb-1">صندوق خطا خالی است</p>
          <p className="text-sm text-slate-500">همه‌ی forwarding ها موفق بوده‌اند</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-right">
                  <th className="px-4 py-3 font-medium text-slate-600">گزارش</th>
                  <th className="px-4 py-3 font-medium text-slate-600">بخش</th>
                  <th className="px-4 py-3 font-medium text-slate-600">ردیف</th>
                  <th className="px-4 py-3 font-medium text-slate-600">مقصد</th>
                  <th className="px-4 py-3 font-medium text-slate-600">خطا</th>
                  <th className="px-4 py-3 font-medium text-slate-600">زمان</th>
                  <th className="px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate('/site-ops/daily-reports/' + it.reportId)}
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <span className="num font-mono text-xs" dir="ltr">{it.reportCode || '—'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {it.reportDate && (
                        <div className="text-xs text-slate-500 mt-0.5">{formatJalaliDate(it.reportDate)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                        {SECTION_LABELS[it.sectionType] || it.sectionType}
                        {it.sectionStatus && (
                          <span className="text-slate-400">({it.sectionStatus})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 num">{toPersianDigits(it.rowNumber)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs">
                        <ArrowRight className="w-3 h-3" />
                        {TARGET_LABELS[it.targetType] || it.targetType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2 max-w-md">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-red-700 line-clamp-2" title={it.errorMessage || ''}>
                          {it.errorMessage || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatJalaliDate(it.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRetry(it.id)}
                        disabled={retryingId === it.id}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {retryingId === it.id ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال تلاش...</>
                        ) : (
                          <><RotateCw className="w-3.5 h-3.5" /> Retry</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
