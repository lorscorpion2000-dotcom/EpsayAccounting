import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Lock, Unlock, Loader2, ShieldAlert, ShieldCheck,
  RefreshCw, Info,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/services/api';
import { toPersianDigits, formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

interface FiscalYear {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
  isCurrent: boolean;
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export default function PeriodLockPage() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [lockedMonths, setLockedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ key: string; action: 'lock' | 'unlock' } | null>(null);

  const selectedYear = years.find(y => y.id === selectedYearId);

  const monthSlots = useMemo(() => {
    if (!selectedYear) return [];
    const start = new Date(selectedYear.startDate);
    const slots: { name: string; key: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      slots.push({ name: PERSIAN_MONTHS[i], key });
    }
    return slots;
  }, [selectedYear]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fiscal-years').then(r => r.data);
      setYears(res);
      if (!selectedYearId && res.length > 0) {
        const current = res.find((y: FiscalYear) => y.isCurrent) || res[0];
        setSelectedYearId(current.id);
      }
    } catch {
      toast.error('خطا در بارگذاری سال‌های مالی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedYearId) return;
    api.get('/fiscal-years/' + selectedYearId + '/locked-months')
      .then(r => setLockedMonths(r.data || []))
      .catch(() => setLockedMonths([]));
  }, [selectedYearId]);

  const handleAction = async () => {
    if (!confirm || !selectedYearId) return;
    setActionLoading(true);
    try {
      const endpoint = confirm.action === 'lock' ? 'lock-month' : 'unlock-month';
      await api.post('/fiscal-years/' + selectedYearId + '/' + endpoint, {
        monthKey: confirm.key,
      });
      toast.success(confirm.action === 'lock' ? 'دوره قفل شد' : 'قفل دوره باز شد');
      const r = await api.get('/fiscal-years/' + selectedYearId + '/locked-months');
      setLockedMonths(r.data || []);
      setConfirm(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const lockedCount = lockedMonths.length;

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-brand-600" />
            قفل دوره‌های مالی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            قفل کردن ماه‌های سال مالی برای جلوگیری از ثبت یا ویرایش اسناد
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      <div className="card p-4 border-s-4 border-s-amber-400 bg-amber-50/40">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <div className="font-bold mb-1">قوانین قفل دوره</div>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>در ماه‌های قفل‌شده، <strong>ثبت سند جدید، ویرایش و ابطال</strong> امکان‌پذیر نیست.</li>
              <li>برای ثبت اصلاحات، ابتدا قفل ماه را باز کنید یا از سند اصلاحی در ماه بعد استفاده کنید.</li>
              <li>معمولاً پس از تسویه ماه و تهیه گزارش‌ها، ماه را قفل می‌کنند.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="label">سال مالی</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="input"
            >
              <option value="">— انتخاب کنید —</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(جاری)' : ''} {y.status === 'CLOSED' ? '— بسته' : ''}
                </option>
              ))}
            </select>
            {selectedYear && (
              <div className="text-xs text-slate-500 mt-2">
                از {formatJalaliDate(selectedYear.startDate)} تا {formatJalaliDate(selectedYear.endDate)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            <div className="text-center">
              <div className="text-xs text-slate-500">قفل‌شده</div>
              <div className="text-2xl font-bold num text-red-600">{toPersianDigits(lockedCount)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">باز</div>
              <div className="text-2xl font-bold num text-emerald-600">{toPersianDigits(12 - lockedCount)}</div>
            </div>
          </div>
        </div>
      </div>

      {!selectedYear ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          برای مشاهده دوره‌ها، یک سال مالی انتخاب کنید
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthSlots.map((slot) => {
            const isLocked = lockedMonths.includes(slot.key);
            return (
              <div
                key={slot.key}
                className={clsx(
                  'card p-4 transition-all',
                  isLocked ? 'border-s-4 border-s-red-500 bg-red-50/30' : 'border-s-4 border-s-emerald-500 bg-emerald-50/30',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      isLocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600',
                    )}>
                      {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{slot.name}</div>
                      <div className="text-[10px] text-slate-500 num" dir="ltr">{slot.key}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={clsx(
                    'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium',
                    isLocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
                  )}>
                    {isLocked ? <><ShieldAlert className="w-3 h-3" /> قفل</> : <><ShieldCheck className="w-3 h-3" /> باز</>}
                  </span>
                  <button
                    onClick={() => setConfirm({ key: slot.key, action: isLocked ? 'unlock' : 'lock' })}
                    disabled={selectedYear.status === 'CLOSED'}
                    className={clsx(
                      'text-xs px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                      isLocked
                        ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700',
                    )}
                  >
                    {isLocked ? 'بازکن' : 'قفل کن'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.action === 'lock' ? 'قفل کردن دوره' : 'باز کردن قفل دوره'}
        message={
          confirm
            ? confirm.action === 'lock'
              ? 'پس از قفل، امکان ثبت یا ویرایش اسناد در این دوره وجود نخواهد داشت. مطمئن هستید؟'
              : 'با باز کردن قفل، امکان ثبت و ویرایش اسناد در این دوره فعال می‌شود.'
            : ''
        }
        confirmLabel={confirm?.action === 'lock' ? 'بله، قفل کن' : 'بله، باز کن'}
        variant={confirm?.action === 'lock' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
