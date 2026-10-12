import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, User, Printer, Calendar, Download } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { payrollApi } from '../services/payroll.api';
import { PERSIAN_MONTHS_ADJ } from '@/types/adjustment';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';

type Tab = 'card' | 'monthly';

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'حاضر', ABSENT: 'غایب', LEAVE: 'مرخصی',
  SICK: 'استعلاجی', HOLIDAY: 'تعطیل', MISSION: 'مأموریت',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  ABSENT: 'bg-red-50 text-red-700',
  LEAVE: 'bg-amber-50 text-amber-700',
  SICK: 'bg-orange-50 text-orange-700',
  HOLIDAY: 'bg-slate-100 text-slate-600',
  MISSION: 'bg-blue-50 text-blue-700',
};

export default function EmployeeCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>('card');
  const [card, setCard] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const currentYear = new Date().getFullYear() - 621 + (new Date().getMonth() >= 2 ? 1 : 0);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(1);

  const loadCard = async () => {
    if (!id) return;
    setLoading(true);
    try { setCard(await payrollApi.employees.getCard(id)); }
    catch { toast.error('خطا در بارگذاری کارت پرسنل'); }
    finally { setLoading(false); }
  };

  const loadMonthly = async () => {
    if (!id) return;
    setLoadingMonthly(true);
    try {
      setMonthly(await payrollApi.employees.getMonthlyWork(id, year, month));
    } catch { toast.error('خطا در بارگذاری کارکرد'); }
    finally { setLoadingMonthly(false); }
  };

  useEffect(() => { loadCard(); }, [id]);

  useEffect(() => {
    if (tab === 'monthly') loadMonthly();
  }, [tab, year, month]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: card?.employee?.fullName || 'employee',
  });

  const handleExportExcel = () => {
    if (!monthly) return;
    const rows = monthly.days.map((d: any) => ({
      'روز': d.day,
      'تاریخ': formatJalaliDate(d.date),
      'روز هفته': d.dayOfWeekName,
      'وضعیت': STATUS_LABELS[d.status] || d.status,
      'ساعت ورود': d.checkIn || '',
      'ساعت خروج': d.checkOut || '',
      'ساعت کار': d.workHours,
      'اضافه‌کار': d.overtimeHours,
      'تعطیل‌کاری': d.holidayHours,
      'یادداشت': d.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work');
    XLSX.writeFile(wb, 'employee-work-' + year + '-' + month + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!card) return null;

  const emp = card.employee;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/payroll/employees')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> پرسنل
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium">{emp.fullName}</span>
      </div>

      <div className="card p-6 no-print">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg text-2xl font-bold">
              {emp.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{emp.fullName}</h1>
                {emp.isActive ? (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">فعال</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-700">غیرفعال</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num text-xs font-mono" dir="ltr">{emp.code}</span>
                {emp.position && <><span className="text-slate-300">•</span><span>{emp.position}</span></>}
                {emp.department && <><span className="text-slate-300">•</span><span>{emp.department}</span></>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> چاپ کارت
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">حضور</div>
            <div className="text-lg font-bold num">{toPersianDigits(card.stats.attendanceCount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">کارکرد روزانه</div>
            <div className="text-lg font-bold num">{toPersianDigits(card.stats.workLogsCount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">مرخصی تاییدشده</div>
            <div className="text-lg font-bold num">{toPersianDigits(card.stats.leaveCount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">مساعده</div>
            <div className="text-lg font-bold num">{toPersianDigits(card.stats.advanceCount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">جمع مساعده (ریال)</div>
            <div className="text-sm font-bold num text-amber-700">
              {toPersianDigits(Math.round(card.stats.totalAdvances).toLocaleString())}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden no-print">
        <div className="border-b border-slate-200 flex">
          <button type="button" onClick={() => setTab('card')}
            className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'card'
                ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <User className="w-4 h-4" /> کارت پرسنل
          </button>
          <button type="button" onClick={() => setTab('monthly')}
            className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'monthly'
                ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
            <Calendar className="w-4 h-4" /> ریز کارکرد ماهانه
          </button>
        </div>
      </div>

      {/* Print content */}
      <div ref={printRef}>
        {tab === 'card' && (
          <div className="card p-6 print:border-0 print:shadow-none">
            <h2 className="font-bold text-slate-800 border-b pb-2 mb-4 text-lg">اطلاعات پرسنلی</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <InfoRow label="نام و نام خانوادگی" value={emp.fullName} />
              <InfoRow label="کد پرسنلی" value={emp.code} mono />
              <InfoRow label="کد ملی" value={emp.nationalCode} mono />
              <InfoRow label="نام پدر" value={emp.fatherName} />
              <InfoRow label="موبایل" value={emp.mobile} mono />
              <InfoRow label="سمت" value={emp.position} />
              <InfoRow label="واحد" value={emp.department} />
              <InfoRow label="تاریخ استخدام" value={emp.hireDate ? formatJalaliDate(emp.hireDate) : null} />
              <InfoRow label="شماره بیمه" value={emp.insuranceNo} mono />
              <InfoRow label="شماره حساب" value={emp.bankAccount} mono />
              <InfoRow label="حقوق پایه (ریال)" value={Number(emp.baseSalary) > 0 ? toPersianDigits(Number(emp.baseSalary).toLocaleString()) : null} />
              <InfoRow label="دستمزد روزانه (ریال)" value={Number(emp.dailyWage) > 0 ? toPersianDigits(Number(emp.dailyWage).toLocaleString()) : null} />
              <InfoRow label="دستمزد ساعتی (ریال)" value={Number(emp.hourlyWage) > 0 ? toPersianDigits(Number(emp.hourlyWage).toLocaleString()) : null} />
              <InfoRow label="آدرس" value={emp.address} />
            </div>

            {emp.description && (
              <div className="mt-6 pt-4 border-t">
                <div className="text-xs text-slate-500 mb-1">توضیحات</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{emp.description}</p>
              </div>
            )}

            {card.lastPayroll && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-bold text-slate-800 mb-3">آخرین حقوق ماهانه</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoRow label="دوره" value={card.lastPayroll.period?.title} />
                  <InfoRow label="روز کارکرد" value={toPersianDigits(Number(card.lastPayroll.workDays))} />
                  <InfoRow label="حقوق ناخالص" value={toPersianDigits(Math.round(Number(card.lastPayroll.grossSalary)).toLocaleString())} />
                  <InfoRow label="حقوق خالص" value={toPersianDigits(Math.round(Number(card.lastPayroll.netSalary)).toLocaleString())} highlight />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'monthly' && (
          <div className="space-y-4">
            {/* Month picker */}
            <div className="card p-4 no-print flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">دوره:</label>
                <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
                  className="input num w-24" dir="ltr" />
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input w-40">
                  {PERSIAN_MONTHS_ADJ.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {monthly && (
                  <button className="btn-secondary text-sm" onClick={handleExportExcel}>
                    <Download className="w-4 h-4" /> اکسل
                  </button>
                )}
                <button className="btn-secondary text-sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> چاپ
                </button>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="card p-12 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !monthly ? null : (
              <>
                {/* Totals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">روزهای حاضر</div>
                    <div className="text-2xl font-bold num text-emerald-600 mt-1">
                      {toPersianDigits(monthly.totals.presentDays)}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">جمع ساعت کار</div>
                    <div className="text-2xl font-bold num mt-1">
                      {toPersianDigits(monthly.totals.totalWorkHours.toFixed(1))}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">اضافه‌کار</div>
                    <div className="text-2xl font-bold num text-amber-600 mt-1">
                      {toPersianDigits(monthly.totals.totalOvertime.toFixed(1))}
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="text-xs text-slate-500">مرخصی / غیبت</div>
                    <div className="text-2xl font-bold num mt-1">
                      {toPersianDigits(monthly.totals.leaveDays)} / {toPersianDigits(monthly.totals.absentDays)}
                    </div>
                  </div>
                </div>

                {/* Print header */}
                <div className="hidden print:block">
                  <h2 className="text-center font-bold text-lg mb-2">
                    ریز کارکرد {monthly.period.monthName} {year}
                  </h2>
                  <div className="text-center text-sm mb-4">{emp.fullName} — کد {emp.code}</div>
                </div>

                {/* Days table */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-12">روز</th>
                          <th className="text-center px-2 py-2 w-24">تاریخ</th>
                          <th className="text-right px-2 py-2 w-20">روز هفته</th>
                          <th className="text-center px-2 py-2 w-24">وضعیت</th>
                          <th className="text-center px-2 py-2 w-20">ورود</th>
                          <th className="text-center px-2 py-2 w-20">خروج</th>
                          <th className="text-center px-2 py-2 w-20">ساعت کار</th>
                          <th className="text-center px-2 py-2 w-20">اضافه‌کار</th>
                          <th className="text-right px-2 py-2">یادداشت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthly.days.map((d: any) => (
                          <tr key={d.day} className={clsx(
                            'hover:bg-slate-50/50',
                            d.isHoliday && 'bg-slate-50/40',
                          )}>
                            <td className="px-2 py-1.5 text-center num font-bold">{toPersianDigits(d.day)}</td>
                            <td className="px-2 py-1.5 text-center num text-slate-600">{formatJalaliDate(d.date)}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{d.dayOfWeekName}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={clsx('text-[10px] px-2 py-0.5 rounded-md', STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-600')}>
                                {STATUS_LABELS[d.status] || d.status}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-center num text-slate-600" dir="ltr">{d.checkIn || '—'}</td>
                            <td className="px-2 py-1.5 text-center num text-slate-600" dir="ltr">{d.checkOut || '—'}</td>
                            <td className="px-2 py-1.5 text-center num font-bold">{d.workHours > 0 ? toPersianDigits(d.workHours.toFixed(1)) : '—'}</td>
                            <td className="px-2 py-1.5 text-center num text-amber-700">{d.overtimeHours > 0 ? toPersianDigits(d.overtimeHours.toFixed(1)) : '—'}</td>
                            <td className="px-2 py-1.5 text-slate-500 truncate max-w-[200px]">{d.notes || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 font-bold">
                        <tr>
                          <td colSpan={6} className="px-2 py-2 text-right text-slate-700">جمع کل ماه:</td>
                          <td className="px-2 py-2 text-center num">{toPersianDigits(monthly.totals.totalWorkHours.toFixed(1))}</td>
                          <td className="px-2 py-2 text-center num text-amber-700">{toPersianDigits(monthly.totals.totalOvertime.toFixed(1))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: any) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={clsx('text-sm',
        highlight && 'font-bold text-brand-700',
        !value && 'text-slate-300')}>
        {value ? (
          <span className={mono ? 'num' : ''} dir={mono ? 'ltr' : undefined}>{value}</span>
        ) : '—'}
      </div>
    </div>
  );
}
