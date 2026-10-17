import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Calendar, CheckCircle2, DollarSign, FileSpreadsheet, Users } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { PayrollPeriod } from '@/types/payroll';
import { PERIOD_STATUS_LABELS, PERIOD_STATUS_COLORS } from '@/types/payroll';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import SignatureBlock from '@/components/SignatureBlock';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED
export default function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'approve' | 'pay' | 'calculateFromAttendance' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await payrollApi.periods.get(id);
      setPeriod(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async () => {
    if (!actionItem || !period) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'calculateFromAttendance') {
        await payrollApi.periods.calculateFromAttendance(period.id);
        toast.success('محاسبه از حاضری انجام شد');
      } else if (actionItem.action === 'approve') {
        await payrollApi.periods.approve(period.id);
        toast.success('دوره تایید شد');
      } else {
        await payrollApi.periods.pay(period.id);
        toast.success('پرداخت ثبت شد');
      }
      setActionItem(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!period?.records?.length) { toast.info('رکوردی وجود ندارد'); return; }
    const rows = period.records.map((r, i) => ({
      'ردیف': i + 1,
      'نام': r.employee?.name || '',
      'روز کارکرد': Number(r.workDays),
      'اضافه‌کار': Number(r.overtimeHours),
      'پایه': Number(r.baseSalary),
      'جمع ناخالص': Number(r.grossSalary),
      'بیمه': Number(r.insuranceAmount),
      'مالیات': Number(r.taxAmount),
      'جمع کسورات': Number(r.totalDeductions),
      'خالص': Number(r.netSalary),
    }));
    void exportToExcel({
      filename: 'Payroll-' + period.code + '.xlsx',
      sheets: [{
        name: 'Payroll',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!period) return null;


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/payroll/periods')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> دوره‌های حقوق
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{period.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{period.title}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', PERIOD_STATUS_COLORS[period.status])}>
                  {PERIOD_STATUS_LABELS[period.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num">{formatJalaliDate(period.startDate)} تا {formatJalaliDate(period.endDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <PagePrintButton documentTitle="دوره حقوق" />
            {(period.status === 'DRAFT' || period.status === 'CALCULATED') && (
              <button className="btn-secondary" onClick={() => setActionItem({ action: 'calculateFromAttendance' })}>
                <FileSpreadsheet className="w-4 h-4" /> محاسبه از حاضری
              </button>
            )}
            {period.status === 'CALCULATED' && (
              <button className="btn-primary" onClick={() => setActionItem({ action: 'approve' })}>
                <CheckCircle2 className="w-4 h-4" /> تایید
              </button>
            )}
            {period.status === 'APPROVED' && (
              <button className="btn-primary" onClick={() => setActionItem({ action: 'pay' })}>
                <DollarSign className="w-4 h-4" /> ثبت پرداخت
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <StatBox label="جمع ناخالص" value={Number(period.totalGross)} color="brand" />
          <StatBox label="جمع خالص" value={Number(period.totalNet)} color="emerald" />
          <StatBox label="جمع مالیات" value={Number(period.totalTax)} color="rose" />
          <StatBox label="جمع بیمه" value={Number(period.totalInsurance)} color="amber" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" /> لیست حقوق پرسنل
          </h2>
        </div>
        {!period.records?.length ? (
          <div className="p-12 text-center text-slate-400">هنوز محاسبه‌ای انجام نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-2 py-3 w-10">#</th>
                  <th className="text-right px-2 py-3">نام</th>
                  <th className="text-center px-2 py-3">روز</th>
                  <th className="text-center px-2 py-3">اضافه‌کار</th>
                  <th className="text-left px-2 py-3">پایه</th>
                  <th className="text-left px-2 py-3">جمع ناخالص</th>
                  <th className="text-left px-2 py-3">بیمه</th>
                  <th className="text-left px-2 py-3">مالیات</th>
                  <th className="text-left px-2 py-3">جمع کسور</th>
                  <th className="text-left px-2 py-3 font-bold">خالص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {period.records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-2 py-2 text-center num">{toPersianDigits(r.rowNumber)}</td>
                    <td className="px-2 py-2 text-slate-800 font-medium">{r.employee?.name}</td>
                    <td className="px-2 py-2 text-center num">{toPersianDigits(Number(r.workDays).toFixed(1))}</td>
                    <td className="px-2 py-2 text-center num">{toPersianDigits(Number(r.overtimeHours).toFixed(1))}</td>
                    <td className="px-2 py-2 text-left num">{formatNumber(Number(r.baseSalary))}</td>
                    <td className="px-2 py-2 text-left num text-brand-700">{formatNumber(Number(r.grossSalary))}</td>
                    <td className="px-2 py-2 text-left num text-rose-700">{formatNumber(Number(r.insuranceAmount))}</td>
                    <td className="px-2 py-2 text-left num text-rose-700">{formatNumber(Number(r.taxAmount))}</td>
                    <td className="px-2 py-2 text-left num text-rose-800">{formatNumber(Number(r.totalDeductions))}</td>
                    <td className="px-2 py-2 text-left num font-bold text-emerald-700">{formatNumber(Number(r.netSalary))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionItem}
        title={actionItem?.action === 'approve' ? 'تایید دوره حقوق' : 'ثبت پرداخت'}
        message={actionItem?.action === 'approve' ? 'آیا این دوره تایید می‌شود؟' : 'آیا پرداخت ثبت می‌شود؟'}
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      <div className="card p-6 mt-6">
        <SignatureBlock slots={[
          { title: 'تهیه‌کننده', type: 'current-user', caption: 'نام و امضا' },
          { title: 'مدیر مالی', type: 'empty', caption: 'نام و امضا' },
          { title: 'مهر شرکت', type: 'company-stamp', caption: 'مهر و امضا' },
        ]} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: any) {
  const colors: any = {
    brand: 'from-brand-50 to-white border-brand-200 text-brand-700',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
    rose: 'from-rose-50 to-white border-rose-200 text-rose-700',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
  };
  return (
    <div className={'p-4 rounded-lg bg-gradient-to-bl border ' + colors[color]}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={'text-lg font-bold num ' + colors[color].split(' ')[3]}>{formatNumber(value)}</div>
      <div className="text-xs text-slate-500">ریال</div>
    </div>
  );
}
