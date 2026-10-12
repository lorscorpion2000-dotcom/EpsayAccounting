import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, ClipboardList, Printer, Send, Sun, Cloud, CloudRain, Snowflake, Wind, Users, Truck, Package, TrendingUp, AlertCircle, UserCheck, ShoppingCart, Bell, Edit } from 'lucide-react';
import clsx from 'clsx';
import { siteOpsApi } from '../services/site-ops.api';
import type { DailyReport, WeatherCondition, RequestType, EventType } from '@/types/site-ops';
import {
  REPORT_STATUS_LABELS, REPORT_STATUS_COLORS, WEATHER_LABELS,
  ATTENDANCE_LABELS, ATTENDANCE_COLORS,
  EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS,
  ENTRY_EXIT_KIND_LABELS, REQUEST_TYPE_LABELS, REQUEST_PRIORITY_LABELS,
  REQUEST_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_SEVERITY_LABELS,
} from '@/types/site-ops';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import PrintHeader from '@/components/PrintHeader';
import { api } from '@/services/api';

const WEATHER_ICONS: Record<WeatherCondition, any> = {
  SUNNY: Sun, CLOUDY: Cloud, RAINY: CloudRain, SNOWY: Snowflake, WINDY: Wind, STORM: CloudRain,
};

const EVENT_COLORS: Record<EventType, string> = {
  STOP: 'bg-amber-50 text-amber-700',
  INCIDENT: 'bg-red-50 text-red-700',
  VISIT: 'bg-blue-50 text-blue-700',
  INSTRUCTION: 'bg-indigo-50 text-indigo-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

const SECTION_LABELS: Record<string, string> = {
  HEADER: 'الف) سربرگ',
  PROGRESS: 'ب) پیشرفت کار',
  WORKERS: 'ج) نیروی انسانی و اکیپ‌ها',
  EQUIPMENTS: 'د) ماشین‌آلات',
  MATERIALS: 'ه) مصالح',
  ENTRY_EXIT: 'و) ورود و خروج',
  REQUESTS: 'ز) درخواست‌ها',
  EVENTS: 'ح) تحولات و رویدادها',
  ATTACHMENTS: 'ط) پیوست‌ها',
};

const SECTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'رد‌شده',
  FORWARDED: 'ارسال‌شده',
  FAILED: 'خطا در ارسال',
};

const SECTION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  FORWARDED: 'bg-blue-50 text-blue-700 border-blue-200',
  FAILED: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SECTION_ORDER = ['HEADER','PROGRESS','WORKERS','EQUIPMENTS','MATERIALS','ENTRY_EXIT','REQUESTS','EVENTS','ATTACHMENTS'];

function DailyReportSectionsPanel({
  sections, onApprove, onReject, busy, canApprove,
}: {
  sections: any[];
  onApprove: (t: string) => void;
  onReject: (t: string) => void;
  busy: string | null;
  canApprove: boolean;
}) {
  if (!sections || sections.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-400 text-sm">
        بخش‌ها بارگذاری نشده‌اند
      </div>
    );
  }

  const sorted = [...sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.sectionType) - SECTION_ORDER.indexOf(b.sectionType),
  );
  const pending = sorted.filter((s) => s.status === 'PENDING').length;
  const approved = sorted.filter((s) => s.status === 'APPROVED' || s.status === 'FORWARDED').length;
  const rejected = sorted.filter((s) => s.status === 'REJECTED').length;

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-slate-800">بخش‌های گزارش روزانه</h2>
          <p className="text-xs text-slate-500 mt-1">هر بخش را می‌توانید جداگانه تأیید یا رد کنید.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">در انتظار: <b>{pending}</b></span>
          <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">تأیید: <b>{approved}</b></span>
          {rejected > 0 && (
            <span className="px-2 py-1 rounded bg-red-50 text-red-700">رد: <b>{rejected}</b></span>
          )}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {sorted.map((s) => (
          <div key={s.id || s.sectionType} className="p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium text-slate-800 text-sm">
                {SECTION_LABELS[s.sectionType] || s.sectionType}
              </div>
              {s.rejectedReason && (
                <div className="text-xs text-red-600 mt-1">دلیل رد: {s.rejectedReason}</div>
              )}
            </div>
            <span className={clsx(
              'inline-block text-xs px-2.5 py-1 rounded-md border',
              SECTION_STATUS_COLORS[s.status] || 'bg-slate-100',
            )}>
              {SECTION_STATUS_LABELS[s.status] || s.status}
            </span>
            {canApprove && (s.status === 'PENDING' || s.status === 'REJECTED') && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onApprove(s.sectionType)}
                  disabled={busy === s.sectionType}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  {busy === s.sectionType ? '...' : 'تأیید'}
                </button>
                <button type="button" onClick={() => onReject(s.sectionType)}
                  disabled={busy === s.sectionType}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  رد
                </button>
              </div>
            )}
            {s.status === 'APPROVED' && canApprove && (
              <button type="button" onClick={() => onReject(s.sectionType)}
                disabled={busy === s.sectionType}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                لغو تأیید
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyReportDetailPage() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<DailyReport | null>(null);

  // F2 — تفکیک تأییدکننده از ثبت‌کننده
  const { user: __f2User } = useAuthStore();
  const canApproveReport = (() => {
    if (!report) return false;
    const r = report as any;
    if (r.status === 'APPROVED') return false;
    const roles: string[] = __f2User?.roles || [];
    const perms: string[] = (__f2User as any)?.permissions || [];
    const isSuper = roles.includes('super_admin');
    // F2.5 — نیاز به permission تأیید
    const hasApprovePerm = isSuper || perms.includes('approvals.approve');
    if (!hasApprovePerm) return false;
    // F2 — ثبت‌کننده نمی‌تواند تأیید کند (مگر super_admin)
    const isCreator = r.createdById && __f2User?.id && r.createdById === __f2User.id;
    if (isCreator && !isSuper) return false;
    return true;
  })();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [sectionsBusy, setSectionsBusy] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ type: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionItem, setActionItem] = useState<{ action: 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setReport(await siteOpsApi.reports.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const loadSections = async () => {
    if (!id) return;
    try {
      const r = await api.get('/site-ops/daily-reports/' + id + '/sections');
      setSections(Array.isArray(r.data) ? r.data : []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadSections(); }, [id]);

  const approveSection = async (type: string) => {
    if (!id) return;
    setSectionsBusy(type);
    try {
      await api.patch('/site-ops/daily-reports/' + id + '/sections/' + type + '/approve');
      toast.success('بخش تأیید شد');
      loadSections();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSectionsBusy(null); }
  };

  const openReject = (type: string) => {
    setRejectReason('');
    setRejectDialog({ type });
  };

  const confirmReject = async () => {
    if (!id || !rejectDialog || !rejectReason.trim()) return;
    setSectionsBusy(rejectDialog.type);
    try {
      await api.patch(
        '/site-ops/daily-reports/' + id + '/sections/' + rejectDialog.type + '/reject',
        { reason: rejectReason },
      );
      toast.success('بخش رد شد');
      setRejectDialog(null);
      setRejectReason('');
      loadSections();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSectionsBusy(null); }
  };

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
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!report) return null;

  const WeatherIcon = report.weather ? WEATHER_ICONS[report.weather] : null;

  return (<>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/site-ops/daily-reports')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> گزارش‌های روزانه
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{report.code}</span>
      </div>

      <PrintHeader title="گزارش روزانه کارگاه" subtitle={`پروژه: ${report.project?.name || ''}`} />

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
                {report.startTime && report.endTime && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="num" dir="ltr">{report.startTime} - {report.endTime}</span>
                  </>
                )}
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
            {(report.status === 'DRAFT' || report.status === 'REJECTED') && (
              <>
                <button className="btn-secondary" onClick={() => navigate('/site-ops/daily-reports/' + report.id + '/edit')}>
                  <Edit className="w-4 h-4" /> ویرایش
                </button>
                <button className="btn-primary" onClick={() => setActionItem({ action: 'submit' })}>
                  <Send className="w-4 h-4" /> ارسال
                </button>
              </>
            )}
            {report.status === 'SUBMITTED' && (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                ℹ️ لطفاً بخش‌ها را به‌صورت جداگانه در پایین صفحه تایید یا رد کنید
              </div>
            )}
          </div>
        </div>

        {/* هشدار بخش‌های ردشده */}
        {report.status === 'REJECTED' && sections.some((s: any) => s.status === 'REJECTED') && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              بخش‌های زیر رد شده‌اند — لطفاً اصلاح کنید و مجدداً ارسال کنید
            </div>
            <ul className="list-disc list-inside text-sm text-amber-900 space-y-1">
              {sections.filter((s: any) => s.status === 'REJECTED').map((s: any) => (
                <li key={s.id || s.sectionType}>
                  <b>{SECTION_LABELS[s.sectionType] || s.sectionType}</b>
                  {s.rejectedReason && (
                    <span className="text-red-700"> — {s.rejectedReason}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500 mb-1">وضعیت جوی</div>
            <div className="flex items-center gap-2">
              {WeatherIcon && <WeatherIcon className="w-5 h-5 text-slate-500" />}
              <span className="text-sm font-medium">{report.weather ? WEATHER_LABELS[report.weather] : '—'}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">دما</div>
            <div className="text-sm font-medium num">
              {report.tempMin != null && report.tempMax != null
                ? toPersianDigits(report.tempMin) + '° تا ' + toPersianDigits(report.tempMax) + '°'
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">نیروی انسانی</div>
            <div className="text-sm font-medium"><span className="num">{toPersianDigits(report._count?.workers || report.workers?.length || 0)}</span> اکیپ</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">ماشین‌آلات</div>
            <div className="text-sm font-medium"><span className="num">{toPersianDigits(report._count?.equipments || report.equipments?.length || 0)}</span> دستگاه</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">رویدادها</div>
            <div className="text-sm font-medium"><span className="num">{toPersianDigits(report._count?.events || report.events?.length || 0)}</span> مورد</div>
          </div>
        </div>
      </div>

      {report.rejectedReason && (
        <div className="card p-4 bg-red-50 border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-800 text-sm">دلیل رد</div>
            <div className="text-sm text-red-700 mt-1">{report.rejectedReason}</div>
          </div>
        </div>
      )}

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
                {report.workers.map((w, i) => (
                  <tr key={w.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-slate-800">{w.teamName}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{w.foreman || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(w.workerCount)}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(Number(w.workHours))}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(Number(w.overtime))}</td>
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

      {/* Equipments */}
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
                  <th className="text-right px-3 py-2">نام</th>
                  <th className="text-right px-3 py-2">پلاک</th>
                  <th className="text-right px-3 py-2">راننده</th>
                  <th className="text-center px-3 py-2">ساعت</th>
                  <th className="text-center px-3 py-2">سوخت (ل)</th>
                  <th className="text-center px-3 py-2">وضعیت</th>
                  <th className="text-right px-3 py-2">علت توقف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.equipments.map((e, i) => (
                  <tr key={e.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-slate-800">{e.name}</td>
                    <td className="px-3 py-2 num text-xs" dir="ltr">{e.plateNumber || '—'}</td>
                    <td className="px-3 py-2 text-xs">{e.operator || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(Number(e.hoursWorked))}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(Number(e.fuelLiters || 0))}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', EQUIPMENT_STATUS_COLORS[e.status])}>
                        {EQUIPMENT_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{e.stopReason || '—'}</td>
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
            <h2 className="font-bold text-slate-800">مصالح</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2">کالا</th>
                  <th className="text-center px-3 py-2">واحد</th>
                  <th className="text-center px-3 py-2">مقدار</th>
                  <th className="text-center px-3 py-2">نوع</th>
                  <th className="text-right px-3 py-2">تأمین‌کننده</th>
                  <th className="text-center px-3 py-2">کیفیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.materials.map((m, i) => (
                  <tr key={m.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-slate-800">{m.itemName}</td>
                    <td className="px-3 py-2 text-center text-xs">{m.unit || '—'}</td>
                    <td className="px-3 py-2 text-center num">{toPersianDigits(Number(m.quantity))}</td>
                    <td className="px-3 py-2 text-center text-xs">
                      {m.movementType === 'IN' ? 'ورود' : m.movementType === 'CONSUMPTION' ? 'مصرف' : m.movementType === 'OUT' ? 'خروج' : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">{m.supplier || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs">
                      {m.qcResult === 'ACCEPTED' ? '✓ قبول' : m.qcResult === 'CONDITIONAL' ? '⚠ مشروط' : m.qcResult === 'REJECTED' ? '✗ رد' : '—'}
                    </td>
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
                  <th className="text-center px-3 py-2">مقدار</th>
                  <th className="text-right px-3 py-2">محل</th>
                  <th className="text-right px-3 py-2">یادداشت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.progresses.map((p, i) => (
                  <tr key={p.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-slate-800">{p.description}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                        {toPersianDigits(Number(p.progressPct).toFixed(1))}٪
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center num">{p.quantity ? toPersianDigits(Number(p.quantity)) : '—'}</td>
                    <td className="px-3 py-2 text-xs">{p.location || '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry/Exit */}
      {report.entryExits && report.entryExits.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">ورود و خروج کارگاه</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-center px-3 py-2 w-20">نوع</th>
                  <th className="text-right px-3 py-2">نام / سازمان</th>
                  <th className="text-right px-3 py-2">هدف / بار</th>
                  <th className="text-center px-3 py-2 w-24">ورود</th>
                  <th className="text-center px-3 py-2 w-24">خروج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.entryExits.map((e, i) => (
                  <tr key={e.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md',
                        e.kind === 'PERSON' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}>
                        {ENTRY_EXIT_KIND_LABELS[e.kind]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-800">
                      {e.personName || '—'}
                      {e.organization && <span className="text-xs text-slate-500"> ({e.organization})</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{e.purpose || e.cargo || '—'}</td>
                    <td className="px-3 py-2 text-center num text-xs" dir="ltr">{e.entryTime || '—'}</td>
                    <td className="px-3 py-2 text-center num text-xs" dir="ltr">{e.exitTime || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests */}
      {report.requests && report.requests.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800">درخواست‌ها</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-right px-3 py-2 w-28">نوع</th>
                  <th className="text-right px-3 py-2">عنوان</th>
                  <th className="text-center px-3 py-2 w-20">اولویت</th>
                  <th className="text-center px-3 py-2 w-24">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.requests.map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-xs">{REQUEST_TYPE_LABELS[r.requestType as RequestType]}</td>
                    <td className="px-3 py-2 text-slate-800 text-xs">{r.title}</td>
                    <td className="px-3 py-2 text-center text-xs">{REQUEST_PRIORITY_LABELS[r.priority || 'NORMAL']}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md',
                        r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                        r.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                        r.status === 'DONE' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700')}>
                        {REQUEST_STATUS_LABELS[r.status || 'PENDING']}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events */}
      {report.events && report.events.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-800">تحولات و رویدادها</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-2 w-10">#</th>
                  <th className="text-center px-3 py-2 w-24">نوع</th>
                  <th className="text-right px-3 py-2">عنوان</th>
                  <th className="text-right px-3 py-2">شرح</th>
                  <th className="text-center px-3 py-2 w-20">مدت</th>
                  <th className="text-center px-3 py-2 w-20">شدت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.events.map((e, i) => (
                  <tr key={e.id || i}>
                    <td className="px-3 py-2 text-center text-slate-500 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', EVENT_COLORS[e.eventType as EventType])}>
                        {EVENT_TYPE_LABELS[e.eventType as EventType]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-800 text-xs">{e.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{e.description || '—'}</td>
                    <td className="px-3 py-2 text-center num text-xs">
                      {e.durationHrs ? toPersianDigits(Number(e.durationHrs)) + ' س' : '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">{e.severity ? EVENT_SEVERITY_LABELS[e.severity] : '—'}</td>
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
        message={actionItem?.action === 'submit' ? 'گزارش به کارتابل مدیر ارسال می‌شود.' : 'آیا گزارش تایید می‌شود؟'}
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

      <DailyReportSectionsPanel
        sections={sections}
        onApprove={approveSection}
        onReject={openReject}
        busy={sectionsBusy}
        canApprove={canApproveReport}
      />
      {rejectDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد بخش</h3>
            <p className="text-sm text-slate-600 mb-3">
              دلیل رد بخش «{SECTION_LABELS[rejectDialog.type] || rejectDialog.type}» را وارد کنید.
            </p>
            <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRejectDialog(null)} className="btn-secondary">انصراف</button>
              <button type="button" onClick={confirmReject} disabled={!rejectReason.trim() || !!sectionsBusy} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
  </>);
}
