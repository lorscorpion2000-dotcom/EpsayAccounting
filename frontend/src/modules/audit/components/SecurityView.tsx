import { Loader2, RefreshCw, Shield, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { AuditListResponse, SecurityStats, AuditLogItem } from '@/types/audit';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'ورود موفق',
  LOGIN_FAILED: 'ورود ناموفق',
  LOGIN_BLOCKED_LOCKED: 'ورود به حساب قفل',
  ACCOUNT_LOCKED: 'قفل شدن حساب',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'bg-emerald-50 text-emerald-700',
  LOGIN_FAILED: 'bg-red-50 text-red-700',
  LOGIN_BLOCKED_LOCKED: 'bg-orange-50 text-orange-700',
  ACCOUNT_LOCKED: 'bg-purple-50 text-purple-700',
};

interface Props {
  data: AuditListResponse | null;
  stats: SecurityStats | null;
  loading: boolean;
  action: string;
  setAction: (v: string) => void;
  ip: string;
  setIp: (v: string) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  onRefresh: () => void;
  onViewDetail: (item: AuditLogItem) => void;
}

export function SecurityView({
  data, stats, loading, action, setAction, ip, setIp, page, setPage, onRefresh, onViewDetail,
}: Props) {
  const successCount = stats?.byAction.find((a) => a.action === 'LOGIN_SUCCESS')?.count || 0;
  const failedCount = stats?.byAction.find((a) => a.action === 'LOGIN_FAILED')?.count || 0;
  const lockedCount = stats?.byAction.find((a) => a.action === 'ACCOUNT_LOCKED')?.count || 0;
  const blockedCount = stats?.byAction.find((a) => a.action === 'LOGIN_BLOCKED_LOCKED')?.count || 0;

  return (
    <>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 border-s-4 border-s-emerald-500">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ورود موفق (۲۴ ساعت)
            </div>
            <div className="text-2xl font-bold num mt-1 text-emerald-700">
              {toPersianDigits(successCount)}
            </div>
          </div>
          <div className="card p-4 border-s-4 border-s-red-500">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              ورود ناموفق
            </div>
            <div className="text-2xl font-bold num mt-1 text-red-700">
              {toPersianDigits(failedCount)}
            </div>
          </div>
          <div className="card p-4 border-s-4 border-s-purple-500">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-4 h-4 text-purple-600" />
              حساب‌های قفل‌شده
            </div>
            <div className="text-2xl font-bold num mt-1 text-purple-700">
              {toPersianDigits(lockedCount)}
            </div>
          </div>
          <div className="card p-4 border-s-4 border-s-orange-500">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4 text-orange-600" />
              تلاش روی قفل
            </div>
            <div className="text-2xl font-bold num mt-1 text-orange-700">
              {toPersianDigits(blockedCount)}
            </div>
          </div>
        </div>
      )}

      {stats && stats.topIps.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">IP های پرتلاش (رویدادهای مشکوک)</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topIps.map((item) => (
              <div key={item.ip || 'unknown'} className="bg-slate-50 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
                <span className="num text-slate-600" dir="ltr">{item.ip || '—'}</span>
                <span className="text-red-600 font-bold num">{toPersianDigits(item.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="input">
          <option value="">همه رویدادها</option>
          <option value="LOGIN_SUCCESS">ورود موفق</option>
          <option value="LOGIN_FAILED">ورود ناموفق</option>
          <option value="LOGIN_BLOCKED_LOCKED">ورود به حساب قفل</option>
          <option value="ACCOUNT_LOCKED">قفل شدن حساب</option>
        </select>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="فیلتر IP..."
          className="input"
          dir="ltr"
        />
        <button onClick={onRefresh} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> بازخوانی
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !data || !data.items || data.items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">هیچ رویداد امنیتی یافت نشد</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[800px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-center px-3 py-2 w-12">#</th>
                    <th className="text-center px-3 py-2 w-32">تاریخ</th>
                    <th className="text-center px-3 py-2 w-40">رویداد</th>
                    <th className="text-right px-3 py-2 w-40">کاربر</th>
                    <th className="text-center px-3 py-2 w-40">IP</th>
                    <th className="text-center px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((it, i) => (
                    <tr key={it.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-center text-slate-400 num">
                        {toPersianDigits((page - 1) * 50 + i + 1)}
                      </td>
                      <td className="px-3 py-2 text-center num">{formatJalaliDate(it.createdAt)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded font-bold', ACTION_COLORS[it.action] || 'bg-slate-100 text-slate-600')}>
                          {ACTION_LABELS[it.action] || it.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-800">
                        {it.user ? it.user.fullName : (it.entityId || '—')}
                      </td>
                      <td className="px-3 py-2 text-center num text-[10px]" dir="ltr">
                        {it.ipAddress || '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => onViewDetail(it)} className="text-brand-600 hover:text-brand-800 text-[10px] font-medium">
                          جزئیات
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  صفحه <span className="num font-bold">{toPersianDigits(page)}</span> از{' '}
                  <span className="num font-bold">{toPersianDigits(data.totalPages)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs disabled:opacity-40">قبلی</button>
                  <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary text-xs disabled:opacity-40">بعدی</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}