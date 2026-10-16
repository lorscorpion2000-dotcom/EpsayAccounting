import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell, Loader2, RefreshCw, CheckCheck, Trash2, ScanLine,
  AlertTriangle, AlertCircle, Info, ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import { notificationApi } from '../services/notification.api';
import type { NotificationItem } from '@/types/notification';
import { toPersianDigits, formatJalaliDate } from '@/utils/format';

const SEVERITY_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  INFO:    { icon: Info,          color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-s-blue-500',  label: 'اطلاع' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-s-amber-500', label: 'هشدار' },
  DANGER:  { icon: AlertCircle,   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-s-red-500',   label: 'فوری' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const r = await notificationApi.list({ unread: filter === 'unread', limit: 100 });
      setItems(r);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const r = await notificationApi.scan();
      toast.success('اسکن کامل شد: ' + (r.created || 0) + ' اعلان');
      load();
    } catch {
      toast.error('خطا در اسکن');
    } finally { setScanning(false); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      toast.success('همه خوانده شد');
      load();
    } catch { toast.error('خطا'); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, isRead: true } : x));
    } catch { toast.error('خطا'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('حذف شد');
    } catch { toast.error('خطا'); }
  };

  const handleClearRead = async () => {
    if (!confirm('همه اعلان‌های خوانده‌شده حذف شوند؟')) return;
    try {
      const r = await notificationApi.clearRead();
      toast.success(toPersianDigits(r.deleted) + ' اعلان حذف شد');
      load();
    } catch { toast.error('خطا'); }
  };

  const unreadCount = items.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            اعلان‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            اعلان‌های سررسید خودکار (قراردادها، بیمه، ضمانت، مجوز، چک و ...)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleClearRead}>
            <Trash2 className="w-4 h-4" /> حذف خوانده‌ها
          </button>
          <button className="btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            اسکن الان
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="card p-4 border-s-4 border-s-blue-500 bg-blue-50/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-bold mb-1">اسکن خودکار روزانه ساعت ۸:۰۰ صبح</div>
            <div className="text-xs">
              سیستم هر روز صبح موارد نزدیک به سررسید را بررسی و اعلان می‌سازد. برای بررسی فوری، «اسکن الان» را بزنید.
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button onClick={() => setFilter('all')}
          className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}>
          همه ({toPersianDigits(items.length)})
        </button>
        <button onClick={() => setFilter('unread')}
          className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
            filter === 'unread' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}>
          خوانده‌نشده
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center num">
              {toPersianDigits(unreadCount)}
            </span>
          )}
        </button>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            className="ms-auto btn-secondary text-xs">
            <CheckCheck className="w-4 h-4" /> علامت‌گذاری همه
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">هیچ اعلانی وجود ندارد</p>
          <p className="text-xs text-slate-400">
            {filter === 'unread' ? 'همه اعلان‌ها خوانده شده‌اند' : 'برای ساخت اعلان جدید، «اسکن الان» را بزنید'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const meta = SEVERITY_META[n.severity] || SEVERITY_META.INFO;
            const Icon = meta.icon;
            return (
              <div key={n.id}
                className={clsx(
                  'card p-4 border-s-4 transition-all group',
                  meta.border,
                  !n.isRead && 'bg-brand-50/20',
                )}>
                <div className="flex items-start gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', meta.bg)}>
                    <Icon className={clsx('w-5 h-5', meta.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{n.title}</span>
                          {!n.isRead && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-600 text-white font-bold">
                              جدید
                            </span>
                          )}
                          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-bold', meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">{n.message}</div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 num">
                          <span>ساخته: {formatJalaliDate(n.createdAt)}</span>
                          {n.dueDate && <span>سررسید: {formatJalaliDate(n.dueDate)}</span>}
                          {n.daysLeft !== null && (
                            <span className={clsx('font-bold',
                              n.daysLeft <= 3 ? 'text-red-600' : n.daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500')}>
                              {n.daysLeft <= 0 ? 'امروز' : toPersianDigits(n.daysLeft) + ' روز دیگر'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!n.isRead && (
                          <button onClick={() => handleMarkRead(n.id)}
                            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            title="خوانده شد">
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        {n.link && (
                          <Link to={n.link}
                            className="p-2 rounded-lg hover:bg-brand-50 text-brand-600"
                            title="مشاهده">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button onClick={() => handleDelete(n.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
