import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, RefreshCw, Calendar, Users, Building2, FileSpreadsheet, Printer } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import { api } from '@/services/api';
import { toPersianDigits } from '@/utils/format';
import { exportToExcel } from '@/utils/export-excel';

const STATUS_META: Record<string, { label: string; short: string; color: string }> = {
  PRESENT: { label: 'حاضر', short: 'ح', color: 'bg-emerald-500 text-white' },
  ABSENT: { label: 'غایب', short: 'غ', color: 'bg-red-500 text-white' },
  LEAVE: { label: 'مرخصی', short: 'م', color: 'bg-amber-500 text-white' },
  SICK: { label: 'استعلاجی', short: 'ا', color: 'bg-purple-500 text-white' },
  MISSION: { label: 'مأموریت', short: 'مأ', color: 'bg-blue-500 text-white' },
  HOLIDAY: { label: 'تعطیل', short: 'ت', color: 'bg-slate-400 text-white' },
};

const STATUS_CYCLE = [null, 'PRESENT', 'ABSENT', 'LEAVE', 'SICK', 'MISSION', 'HOLIDAY'];

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * استخراج سال و ماه شمسی امروز از Intl (بدون وابستگی)
 */
function getTodayJalali(): { year: number; month: number } {
  try {
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      timeZone: 'Asia/Tehran',
    });
    const parts = fmt.formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    const y = get('year');
    const m = get('month');
    return { year: y, month: m };
  } catch {
    // fallback تقریبی
    const now = new Date();
    return { year: now.getFullYear() - 579, month: 1 };
  }
}


interface GridCell {
  day: number;
  gregorian: string;
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number;
  overtimeHours: number;
  notes: string | null;
}

interface GridEmployee {
  profileId: string;
  partnerId: string;
  employeeCode: string;
  name: string;
  position: string;
  employeeType: string;
  projectId: string | null;
  projectName: string | null;
  days: GridCell[];
  totals: { present: number; workHours: number; overtimeHours: number };
}

interface GridResponse {
  year: number;
  month: number;
  daysInMonth: number;
  days: Array<{ jalali: number; gregorian: string; weekday: number }>;
  employees: GridEmployee[];
}

const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

export default function AttendanceGridPage() {
  const today = getTodayJalali();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState<{ empId: string; dayIdx: number } | null>(null);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data || [])).catch(() => []);
  }, []);

  const load = async () => {
    setLoading(true);
    setDirty(false);
    try {
      const res = await payrollApi.attendance.getGrid({ year, month, projectId: projectId || undefined });
      setData(res);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, [year, month, projectId]);

  const yearOptions = useMemo(() => {
    const y = today.year;
    return [y - 2, y - 1, y, y + 1];
  }, [today.year]);

  const updateCell = (empIdx: number, dayIdx: number, patch: Partial<GridCell>) => {
    if (!data) return;
    const next = { ...data };
    next.employees = [...next.employees];
    const emp = { ...next.employees[empIdx] };
    emp.days = [...emp.days];
    emp.days[dayIdx] = { ...emp.days[dayIdx], ...patch };
    // محاسبه مجدد totals
    emp.totals = {
      present: emp.days.filter((d) => d.status === 'PRESENT').length,
      workHours: emp.days.reduce((s, d) => s + (d.workHours || 0), 0),
      overtimeHours: emp.days.reduce((s, d) => s + (d.overtimeHours || 0), 0),
    };
    next.employees[empIdx] = emp;
    setData(next);
    setDirty(true);
  };

  const cycleStatus = (empIdx: number, dayIdx: number, shift: boolean = false) => {
    if (!data) return;
    const cell = data.employees[empIdx].days[dayIdx];
    if (shift) {
      // Shift+Click → خالی کردن
      updateCell(empIdx, dayIdx, {
        status: null, checkIn: null, checkOut: null, workHours: 0, overtimeHours: 0, notes: null,
      });
      return;
    }
    const idx = STATUS_CYCLE.indexOf(cell.status as any);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateCell(empIdx, dayIdx, {
      status: nextStatus,
      // اگه از حالت خالی خارج شد و PRESENT شد، ساعت پیش‌فرض
      checkIn: nextStatus === 'PRESENT' ? (cell.checkIn || '07:30') : null,
      checkOut: nextStatus === 'PRESENT' ? (cell.checkOut || '17:00') : null,
      workHours: nextStatus === 'PRESENT' ? (cell.workHours || 8) : 0,
    });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const items: any[] = [];
      for (const emp of data.employees) {
        for (const d of emp.days) {
          if (d.status === null && !d.checkIn) continue;
          items.push({
            employeeId: emp.partnerId,
            attendanceDate: d.gregorian,
            status: d.status,
            checkIn: d.checkIn,
            checkOut: d.checkOut,
            workHours: d.workHours || 0,
            overtimeHours: d.overtimeHours || 0,
            notes: d.notes,
          });
        }
      }
      await payrollApi.attendance.bulkUpsert({ projectId: projectId || undefined, items });
      toast.success('ذخیره شد (' + items.length + ' مورد)');
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (!data || !data.employees.length) {
      toast.info('داده‌ای برای خروجی وجود ندارد');
      return;
    }

    // ردیف هدر: شماره روزها
    const headerRow: any = {
      'ردیف': '',
      'نام': 'نام و نام خانوادگی',
      'سمت': 'سمت',
    };
    for (const d of data.days) {
      headerRow['d' + d.jalali] = String(d.jalali);
    }
    headerRow['حاضر'] = 'حاضر';
    headerRow['کارکرد'] = 'کارکرد';
    headerRow['اضافه‌کار'] = 'اضافه‌کار';
    headerRow['توضیحات'] = 'توضیحات';

    const rows = [headerRow];
    data.employees.forEach((emp, i) => {
      const row: any = {
        'ردیف': i + 1,
        'نام': emp.name,
        'سمت': emp.position,
      };
      emp.days.forEach((d) => {
        row['d' + d.day] = d.status ? (STATUS_META[d.status]?.short || '') : '';
      });
      row['حاضر'] = emp.totals.present;
      row['کارکرد'] = Number(emp.totals.workHours.toFixed(1));
      row['اضافه‌کار'] = Number(emp.totals.overtimeHours.toFixed(1));
      row['توضیحات'] = '';
      rows.push(row);
    });

    void exportToExcel({
      filename: 'Attendance-Grid-' + data.year + '-' + String(data.month).padStart(2, '0') + '.xlsx',
      sheets: [{ name: 'حضور و غیاب', rows }],
    });
    toast.success('Excel دانلود شد');
  };

  const handlePrint = () => {
    if (!data || !data.employees.length) {
      toast.info('داده‌ای برای چاپ وجود ندارد');
      return;
    }

    const monthName = MONTHS[data.month - 1] || data.month;
    const projectName = projectId
      ? (projects.find((p: any) => p.id === projectId)?.name || '')
      : 'همه پرسنل';

    // رندر HTML چاپ
    const tableHtml = `
      <table class="grid-table">
        <thead>
          <tr>
            <th rowspan="2">#</th>
            <th rowspan="2">نام و نام خانوادگی</th>
            <th rowspan="2">سمت</th>
            ${data.days.map((d) => `
              <th class="day ${d.weekday === 6 ? 'fri' : ''}" title="${d.gregorian}">
                <div class="num">${d.jalali}</div>
                <div class="wd">${WEEKDAYS[d.weekday]}</div>
              </th>`).join('')}
            <th rowspan="2" class="total-present">حاضر</th>
            <th rowspan="2" class="total-work">کارکرد</th>
            <th rowspan="2" class="total-ot">اضافه‌کار</th>
            <th rowspan="2" class="notes">توضیحات</th>
          </tr>
        </thead>
        <tbody>
          ${data.employees.map((emp, i) => `
            <tr>
              <td class="c">${i + 1}</td>
              <td>${emp.name}</td>
              <td class="sm">${emp.position || ''}</td>
              ${emp.days.map((d) => {
                const m = d.status ? STATUS_META[d.status] : null;
                const cls = m ? m.short === 'ح' ? 'present'
                  : m.short === 'غ' ? 'absent'
                  : m.short === 'م' ? 'leave'
                  : m.short === 'ا' ? 'sick'
                  : m.short === 'مأ' ? 'mission'
                  : 'holiday' : '';
                return `<td class="c ${cls}">${m ? m.short : ''}</td>`;
              }).join('')}
              <td class="c present-total">${emp.totals.present}</td>
              <td class="c work-total">${emp.totals.workHours.toFixed(1)}</td>
              <td class="c ot-total">${emp.totals.overtimeHours.toFixed(1)}</td>
              <td class="notes-col"></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>لیست حضور و غیاب - ${monthName} ${data.year}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 6mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; margin: 0; padding: 0; color: #0f172a; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4mm; padding-bottom: 2mm; border-bottom: 1px solid #cbd5e1; }
  .header .title { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
  .header .sub { font-size: 10pt; color: #475569; margin-top: 2pt; }
  .header .logo { height: 15mm; width: auto; }
  .grid-table { width: 100%; border-collapse: collapse; font-size: 7pt; table-layout: fixed; }
  .grid-table th, .grid-table td { border: 1px solid #94a3b8; padding: 1pt 1pt; text-align: center; }
  .grid-table th { background: #f1f5f9; font-weight: bold; font-size: 7pt; }
  .grid-table th.day { width: 12pt; padding: 0.5pt 0; }
  .grid-table th.day .wd { font-size: 5pt; color: #64748b; }
  .grid-table th.day.fri { background: #fee2e2; }
  .grid-table td { font-size: 7pt; }
  .grid-table td.c { text-align: center; }
  .grid-table td.sm { font-size: 6pt; color: #475569; }
  .grid-table td.present { background: #dcfce7; color: #166534; font-weight: bold; }
  .grid-table td.absent { background: #fee2e2; color: #991b1b; font-weight: bold; }
  .grid-table td.leave { background: #fef3c7; color: #92400e; font-weight: bold; }
  .grid-table td.sick { background: #f3e8ff; color: #6b21a8; font-weight: bold; }
  .grid-table td.mission { background: #dbeafe; color: #1e40af; font-weight: bold; }
  .grid-table td.holiday { background: #e2e8f0; color: #475569; font-weight: bold; }
  .grid-table td.present-total { background: #dcfce7; font-weight: bold; }
  .grid-table td.work-total { background: #dbeafe; font-weight: bold; }
  .grid-table td.ot-total { background: #fef3c7; font-weight: bold; }
  .grid-table td.notes-col { background: #f8fafc; }
  .legend { margin-top: 3mm; font-size: 8pt; display: flex; gap: 10pt; flex-wrap: wrap; }
  .legend span { display: inline-flex; align-items: center; gap: 3pt; }
  .legend .box { display: inline-block; width: 12pt; height: 12pt; text-align: center; line-height: 12pt; font-weight: bold; font-size: 7pt; border: 1px solid #94a3b8; }
  .signatures { margin-top: 8mm; display: flex; justify-content: space-around; font-size: 9pt; }
  .signatures > div { text-align: center; }
  .signatures .line { border-top: 1px solid #94a3b8; min-width: 40mm; margin-top: 12mm; padding-top: 2pt; font-weight: bold; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">لیست حضور و غیاب پرسنل</div>
      <div class="sub">${monthName} ${data.year} | ${projectName}</div>
    </div>
    <img class="logo" src="${window.location.origin}/images/logo.png" alt="لوگو" />
  </div>
  ${tableHtml}
  <div class="legend">
    <span><span class="box" style="background:#dcfce7;color:#166534">ح</span> حاضر</span>
    <span><span class="box" style="background:#fee2e2;color:#991b1b">غ</span> غایب</span>
    <span><span class="box" style="background:#fef3c7;color:#92400e">م</span> مرخصی</span>
    <span><span class="box" style="background:#f3e8ff;color:#6b21a8">ا</span> استعلاجی</span>
    <span><span class="box" style="background:#dbeafe;color:#1e40af">مأ</span> مأموریت</span>
    <span><span class="box" style="background:#e2e8f0;color:#475569">ت</span> تعطیل</span>
  </div>
  <div class="signatures">
    <div>
      <div>امضای سرپرست کارگاه</div>
      <div class="line">&nbsp;</div>
    </div>
    <div>
      <div>امضای مدیر منابع انسانی</div>
      <div class="line">&nbsp;</div>
    </div>
    <div>
      <div>تایید مدیریت</div>
      <div class="line">&nbsp;</div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) {
      toast.error('پنجره چاپ باز نشد — پاپ‌آپ‌ها را اجازه بده');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> گرید ماهانه حضور و غیاب
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت حاضری روزانه پرسنل به‌صورت جدول ماهانه</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load} disabled={loading} title="به‌روزرسانی">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel} disabled={!data || loading} title="خروجی Excel">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="btn-secondary" onClick={handlePrint} disabled={!data || loading} title="چاپ / PDF">
            <Printer className="w-4 h-4" /> چاپ
          </button>
          <button
            className={clsx('btn-primary', dirty && 'ring-2 ring-amber-400')}
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره تغییرات {dirty && <span className="ms-1 text-xs bg-amber-500 text-white px-1.5 rounded">●</span>}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> پروژه / ستاد
            </label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input w-full">
              <option value="">— همه پرسنل —</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">سال شمسی</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-full">
              {yearOptions.map((y) => <option key={y} value={y}>{toPersianDigits(y)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">ماه</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input w-full">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !data || data.employees.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p>پرسنلی برای نمایش وجود ندارد</p>
          <p className="text-xs mt-2">ابتدا پرسنل بسازید یا پروژه دیگری انتخاب کنید</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" dir="rtl">
                <thead className="bg-slate-50 border-b-2 border-slate-300">
                  <tr>
                    <th rowSpan={2} className="border-e p-2 w-8 text-center">#</th>
                    <th rowSpan={2} className="border-e p-2 min-w-[140px] text-right">نام و خانوادگی</th>
                    <th rowSpan={2} className="border-e p-2 min-w-[90px] text-right">سمت</th>
                    {data.days.map((d) => (
                      <th
                        key={d.jalali}
                        className={clsx(
                          'border-e p-1 text-center w-8',
                          d.weekday === 6 && 'bg-red-50', // جمعه
                        )}
                        title={d.gregorian}
                      >
                        <div className="num">{toPersianDigits(d.jalali)}</div>
                        <div className="text-[9px] text-slate-400">{WEEKDAYS[d.weekday]}</div>
                      </th>
                    ))}
                    <th rowSpan={2} className="border-e p-1 text-center bg-emerald-50 w-12">
                      حاضر
                    </th>
                    <th rowSpan={2} className="border-e p-1 text-center bg-blue-50 w-16">
                      کارکرد
                    </th>
                    <th rowSpan={2} className="border-e p-1 text-center bg-amber-50 w-16">
                      اضافه‌کار
                    </th>
                    <th rowSpan={2} className="p-1 text-right bg-slate-50 w-40">
                      توضیحات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((emp, empIdx) => (
                    <tr key={emp.profileId} className="border-b hover:bg-slate-50/40">
                      <td className="border-e p-1 text-center num text-slate-500">{empIdx + 1}</td>
                      <td className="border-e p-1 font-medium text-slate-800">
                        {emp.name}
                        {emp.employeeCode && (
                          <span className="text-[9px] text-slate-400 ms-1 num" dir="ltr">{emp.employeeCode}</span>
                        )}
                      </td>
                      <td className="border-e p-1 text-slate-600 text-[10px]">{emp.position}</td>
                      {emp.days.map((d, dayIdx) => {
                        const meta = d.status ? STATUS_META[d.status] : null;
                        return (
                          <td
                            key={dayIdx}
                            className={clsx(
                              'border-e p-0 text-center cursor-pointer select-none',
                              data.days[dayIdx].weekday === 6 && 'bg-red-50/40',
                              meta ? meta.color : 'bg-white hover:bg-slate-100',
                            )}
                            onClick={(e) => cycleStatus(empIdx, dayIdx, e.shiftKey)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setEditCell({ empId: emp.profileId, dayIdx });
                            }}
                            title={
                              meta
                                ? meta.label + (d.checkIn ? ' | ' + d.checkIn + '-' + d.checkOut : '')
                                : 'کلیک: تغییر وضعیت | Shift+کلیک: پاک | راست‌کلیک: ویرایش'
                            }
                          >
                            <div className="text-[11px] font-bold num">{meta ? meta.short : ''}</div>
                            {d.checkIn && (
                              <div className="text-[8px] num" dir="ltr">{d.checkIn}</div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-e p-1 text-center num font-bold bg-emerald-50">
                        {toPersianDigits(emp.totals.present)}
                      </td>
                      <td className="border-e p-1 text-center num bg-blue-50">
                        {toPersianDigits(emp.totals.workHours.toFixed(1))}
                      </td>
                      <td className="border-e p-1 text-center num bg-amber-50">
                        {toPersianDigits(emp.totals.overtimeHours.toFixed(1))}
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          className="input text-[10px] py-0.5 w-full"
                          placeholder="—"
                          onChange={(e) => {
                            // فقط اولین یادداشت روز
                            const dayIdx = emp.days.findIndex((d) => d.status !== null);
                            if (dayIdx >= 0) updateCell(empIdx, dayIdx, { notes: e.target.value });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold">راهنما:</span>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={clsx('w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]', v.color)}>
                  {v.short}
                </span>
                {v.label}
              </span>
            ))}
            <span className="text-slate-500 mr-auto">
              💡 کلیک = تغییر وضعیت | Shift+کلیک = پاک | راست‌کلیک = ویرایش ساعت
            </span>
          </div>
        </>
      )}

      {editCell && data && (
        <CellEditModal
          cell={
            data.employees.find((e) => e.profileId === editCell.empId)?.days[editCell.dayIdx] || null
          }
          onSave={(patch: Partial<GridCell>) => {
            const empIdx = data.employees.findIndex((e) => e.profileId === editCell.empId);
            if (empIdx >= 0) updateCell(empIdx, editCell.dayIdx, patch);
            setEditCell(null);
          }}
          onClose={() => setEditCell(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// مودال ویرایش سلول (ساعت ورود/خروج + وضعیت)
// ═══════════════════════════════════════════════════════════
function CellEditModal({ cell, onSave, onClose }: {
  cell: GridCell | null;
  onSave: (patch: Partial<GridCell>) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<string | null>(cell?.status || 'PRESENT');
  const [checkIn, setCheckIn] = useState(cell?.checkIn || '07:30');
  const [checkOut, setCheckOut] = useState(cell?.checkOut || '17:00');
  const [workHours, setWorkHours] = useState(cell?.workHours || 8);
  const [overtimeHours, setOvertimeHours] = useState(cell?.overtimeHours || 0);

  // محاسبه خودکار ساعت کار از checkIn/checkOut
  const recalc = (ci: string, co: string) => {
    if (!ci || !co) return;
    const [h1, m1] = ci.split(':').map(Number);
    const [h2, m2] = co.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins > 0) setWorkHours(Math.round(mins / 6) / 10);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">ویرایش سلول</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">وضعیت</label>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(STATUS_META).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatus(k)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-xs font-bold transition',
                    status === k ? v.color : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {v.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStatus(null)}
                className={clsx(
                  'px-3 py-1.5 rounded text-xs font-bold',
                  status === null ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                خالی
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ساعت ورود</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  recalc(e.target.value, checkOut);
                }}
                className="input w-full num"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ساعت خروج</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  recalc(checkIn, e.target.value);
                }}
                className="input w-full num"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ساعت کارکرد</label>
              <input
                type="number"
                step="0.5"
                value={workHours}
                onChange={(e) => setWorkHours(Number(e.target.value))}
                className="input w-full num"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">اضافه‌کار</label>
              <input
                type="number"
                step="0.5"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                className="input w-full num"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button
            onClick={() => onSave({ status, checkIn, checkOut, workHours, overtimeHours })}
            className="btn-primary"
          >
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}
