import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Database, Play, Trash2, HardDrive,
  Clock, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import clsx from 'clsx';
import { backupApi } from '../services/backup.api';
import type { BackupFile, BackupStats } from '@/types/backup';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function BackupPage() {
  const [items, setItems] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actionItem, setActionItem] = useState<BackupFile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([backupApi.list(), backupApi.stats()]);
      setItems(list);
      setStats(st);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRun = async () => {
    if (!confirm('پشتیبان‌گیری جدید شروع شود؟ این عملیات ممکن است تا ۱ دقیقه طول بکشد.')) return;
    setRunning(true);
    try {
      const r = await backupApi.run();
      toast.success('پشتیبان با موفقیت ساخته شد: ' + r.filename);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در پشتیبان‌گیری');
    } finally { setRunning(false); }
  };

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await backupApi.remove(actionItem.filename);
      toast.success('پشتیبان حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-600" />
            پشتیبان‌گیری دیتابیس
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت پشتیبان‌های دیتابیس (دستی، خودکار روزانه ساعت ۲ صبح)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'در حال پشتیبان‌گیری...' : 'پشتیبان‌گیری جدید'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card p-4 border-s-4 border-s-blue-500 bg-blue-50/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-bold mb-1">برنامه خودکار</div>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>پشتیبان‌گیری خودکار <strong>هر روز ساعت ۲:۰۰ صبح</strong></li>
              <li>پشتیبان‌گیری هفتگی <strong>هر جمعه ساعت ۳:۰۰ صبح</strong></li>
              <li>پاک‌سازی خودکار پشتیبان‌های قدیمی‌تر از <strong>۳۰ روز</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> تعداد پشتیبان
            </div>
            <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.total)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">حجم کل</div>
            <div className="text-lg font-bold num mt-1 text-brand-700">
              {toPersianDigits((stats.totalSizeBytes / 1024 / 1024).toFixed(2))} MB
            </div>
          </div>
          <div className="card p-4 border-s-4 border-s-emerald-500">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> آخرین پشتیبان
            </div>
            <div className="text-xs font-bold num mt-1">
              {stats.latest ? new Date(stats.latest.createdAt).toLocaleString('fa-IR') : '—'}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500">مسیر</div>
            <div className="text-[10px] font-mono text-slate-600 mt-1 break-all" dir="ltr">
              {stats.backupDir}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-brand-600" />
            پشتیبان‌های موجود ({toPersianDigits(items.length)})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ پشتیبانی یافت نشد</p>
            <button className="btn-primary" onClick={handleRun} disabled={running}>
              <Play className="w-4 h-4" /> ایجاد اولین پشتیبان
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">نام فایل</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">حجم</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-48">تاریخ ساخت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={it.filename} className={clsx('hover:bg-slate-50/50', i === 0 && 'bg-emerald-50/30')}>
                    <td className="px-3 py-3 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            آخرین
                          </span>
                        )}
                        <span className="num text-xs font-mono text-slate-700" dir="ltr">{it.filename}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center num text-xs font-bold">{it.sizeFormatted}</td>
                    <td className="px-3 py-3 text-center num text-xs">
                      {new Date(it.createdAt).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setActionItem(it)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionItem}
        title="حذف پشتیبان"
        message={actionItem ? `فایل «${actionItem.filename}» حذف شود؟ این عمل برگشت‌پذیر نیست.` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
