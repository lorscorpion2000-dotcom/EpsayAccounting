import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, ClipboardList, Printer, Send, CheckCircle2, XCircle,
  Sun, Cloud, CloudRain, Snowflake, Wind, Users, Truck, Package, TrendingUp,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { siteOpsApi } from '../services/site-ops.api';
import type { DailyReport, WeatherCondition } from '@/types/site-ops';
import {
  REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, WEATHER_LABELS,
  ATTENDANCE_LABELS, ATTENDANCE_COLORS,
  EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS,
} from '@/types/site-ops';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import PrintHeader from '@/components/PrintHeader';

const WEATHER_ICONS: Record<WeatherCondition, any> = {
  SUNNY: Sun, CLOUDY: Cloud, RAINY: CloudRain, SNOWY: Snowflake, WINDY: Wind, STORM: CloudRain,
};

export default function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await siteOpsApi.reports.get(id);
      setReport(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async () => {
    if (!actionItem || !report) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'submit') {
        await siteOpsApi.reports.submit(report.id);
        toast.success('به کارتابل ارسال شد');
        setActionItem(null);
        setTimeout(() => navigate('/approvals'), 500);
        return;
      }
      if (actionItem.action === 'approve') { await siteOpsApi.reports.approve(report.id); toast.success('تایید شد'); }
      else if (actionItem.action === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await siteOpsApi.reports.reject(report.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null);
      setReason('');
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!report) return null;

  const WeatherIcon = report.weather ? WEATHER_ICONS[report.weather] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/site-ops/daily-reports')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> گزارش‌های روزانه
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{report.code}</span>
      </div>

      <PrintHeader
        title="گزارش روزانه کارگاه"
        subtitle={`پروژه: ${report.project?.name || ''}`}
      />

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{report.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', REPORT_STATUS_COLORS[report.status])}>
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{report.project?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(report.reportDate)}</span>
                {report.createdBy && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>ثبت: {report.createdBy.fullName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> چاپ
            </button>
            {report.status === 'DRAFT' && (
              <button className="btn-primary" onClick={() => setActionItem({ action: 'submit' })}>
                <Send className="w-4 h-4" /> ارسال به کارتابل
              </button>
            )}
            {report.status === 'SUBMITTED' && (
              <>
                <button className="btn-danger" onClick={() => setActionItem({ action: 'reject' })}>
                  <XCircle className="w-4 h-4" /> رد
                </button>
                <button className="btn-primary" onClick={() => setActionItem({ action: 'approve' })}>
                  <CheckCircle2 className="w-4 h-4" /> تایید
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 mb-1">وضعیت جوی</div>
            <div className="flex items-center gap-2">
              {WeatherIcon && <WeatherIcon className="w-5 h-5 text-slate-500" />}
              <span className="text-sm font-medium">
                {report.weather ? WEATHER_LABELS[report.weather] : '—'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">دما</div>
            <div className="text-sm font-medium num">
              {report.tempMin != null && report.tempMax != null
                ? `${toPersianDigits(report.tempMin)}° تا ${toPersianDigits(report.tempMax)}°`
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">نیروی انسانی</div>
            <div className="text-sm font-medium">
              <span className="num">{toPersianDigits(report._count?.workers || report.workers?.length || 0)}</span> اکیپ
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">ماشین‌آلات</div>
            <div className="text-sm font-medium">
              <span className="num">{toPersianDigits(report._count?.equipments || report.equipments?.length || 0)}</span> دستگاه
            </div>
          </div>
        </div>
      </div>

      {/* Rejected reason */}
      {report.rejectedReason && (
        <div className="card p-4 bg-red-50 border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-800 text-sm">دلیل رد</div>
            <div className="text-sm text-red-700 mt-1">{report.rejectedReason}</div>
          </div>
        </div>
      )}

      {/* Operations */}
      {report.operations && (
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-3">شرح عملیات روزانه</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{report.operations}</p>
        </div>
      )}

      {/* Workers */}
      {report.workers && report.workers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">نیروی انسانی</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2">نام اکیپ</th>
                  <th className="text-right px-3 py-2">سرپرست</th>
                  <th className="text-center px-3 py-2">نفرات</th>
                  <th className="text-center px-3 py-2">ساعت</th>
                  <th className="text-center px-3 py-2">اضافه‌کار</th>
                  <th className="text-center px-3 py-2">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.workers.map((w) => (
                  <tr key={w.id}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(w.rowNumber || 0)}</td>
                    <td className="px-3 py-2 text-slate-800">{w.teamName}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{w.foreman || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(w.workerCount)}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(w.workHours)}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(w.overtime)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', ATTENDANCE_COLORS[w.status])}>
                        {ATTENDANCE_LABELS[w.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment */}
      {report.equipments && report.equipments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">ماشین‌آلات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2">نام ماشین</th>
                  <th className="text-right px-3 py-2">شماره</th>
                  <th className="text-right px-3 py-2">راننده</th>
                  <th className="text-center px-3 py-2">ساعت</th>
                  <th className="text-center px-3 py-2">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.equipments.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(e.rowNumber || 0)}</td>
                    <td className="px-3 py-2 text-slate-800">{e.name}</td>
                    <td className="px-3 py-2 num text-xs" dir="ltr">{e.plateNumber || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{e.operator || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(e.hoursWorked)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', EQUIPMENT_STATUS_COLORS[e.status])}>
                        {EQUIPMENT_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Materials */}
      {report.materials && report.materials.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-slate-800">مصالح وارده</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2">نام کالا</th>
                  <th className="text-center px-3 py-2">واحد</th>
                  <th className="text-center px-3 py-2">مقدار</th>
                  <th className="text-right px-3 py-2">تأمین‌کننده</th>
                  <th className="text-right px-3 py-2">ش. ماشین</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(m.rowNumber || 0)}</td>
                    <td className="px-3 py-2 text-slate-800">{m.itemName}</td>
                    <td className="px-3 py-2 text-center text-xs">{m.unit || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(m.quantity)}</td>
                    <td className="px-3 py-2 text-xs">{m.supplier || '—'}</td>
                    <td className="px-3 py-2 num text-xs" dir="ltr">{m.vehiclePlate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress */}
      {report.progresses && report.progresses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-800">پیشرفت فیزیکی</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2">شرح فعالیت</th>
                  <th className="text-center px-3 py-2">درصد</th>
                  <th className="text-right px-3 py-2">یادداشت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.progresses.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(p.rowNumber || 0)}</td>
                    <td className="px-3 py-2 text-slate-800">{p.description}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                        {toPersianDigits(Number(p.progressPct).toFixed(1))}٪
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issues/Incidents */}
      {(report.issues || report.incidents) && (
        <div className="card p-6 space-y-4">
          {report.issues && (
            <div>
              <h3 className="font-bold text-slate-800 mb-2">مشکلات اجرایی</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.issues}</p>
            </div>
          )}
          {report.incidents && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> حوادث
              </h3>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{report.incidents}</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید گزارش'}
        message={
          actionItem?.action === 'submit' ? 'گزارش به کارتابل مدیر ارسال می‌شود.'
          : 'آیا گزارش تایید می‌شود؟'
        }
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد گزارش</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
