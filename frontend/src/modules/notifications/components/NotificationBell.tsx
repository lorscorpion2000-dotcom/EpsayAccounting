import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, CheckCheck, Loader2, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { notificationApi } from '../services/notification.api';
import type { NotificationItem } from '@/types/notification';

const SEVERITY_COLOR: Record<string, string> = {
  INFO: 'bg-blue-500',
  WARNING: 'bg-amber-500',
  DANGER: 'bg-red-500',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const loadCount = async () => {
    try {
      const r = await notificationApi.unreadCount();
      setCount(r.count);
    } catch { /* silent */ }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const r = await notificationApi.list({ limit: 8 });
      setItems(r);
    } catch (e: any) {
      toast.error('خطا در بارگذاری اعلان‌ها');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 60000); // هر دقیقه
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleMarkRead = async (n: NotificationItem) => {
    try {
      await notificationApi.markRead(n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setCount((c) => Math.max(0, c - 1));
      if (n.link) { nav(n.link); setOpen(false); }
    } catch { toast.error('خطا'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setCount(0);
      toast.success('همه خوانده شد');
    } catch { toast.error('خطا'); }
  };

  const handleDelete = async (id: string, wasUnread: boolean) => {
    try {
      await notificationApi.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (wasUnread) setCount((c) => Math.max(0, c - 1));
    } catch { toast.error('خطا'); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
        title="اعلان‌ها"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center num">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" /> اعلان‌ها
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={handleMarkAllRead} title="همه خوانده"
                  className="p-1.5 rounded hover:bg-slate-200 text-emerald-600">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                اعلان جدیدی وجود ندارد
              </div>
            ) : (
              items.map((n) => (
                <div key={n.id}
                  className={clsx(
                    'group px-4 py-3 border-b last:border-b-0 hover:bg-slate-50 flex items-start gap-2 cursor-pointer transition-colors',
                    !n.isRead && 'bg-brand-50/30',
                  )}
                  onClick={() => handleMarkRead(n)}
                >
                  <span className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0',
                    SEVERITY_COLOR[n.severity] || 'bg-slate-400')} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{n.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                    {n.daysLeft !== null && (
                      <div className="text-[10px] text-slate-400 mt-1 num">
                        {n.daysLeft <= 0 ? 'امروز' : n.daysLeft + ' روز دیگر'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(n.id, !n.isRead); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-500 shrink-0"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-brand-50 border-t bg-slate-50"
          >
            مشاهده همه اعلان‌ها
          </Link>
        </div>
      )}
    </div>
  );
}
