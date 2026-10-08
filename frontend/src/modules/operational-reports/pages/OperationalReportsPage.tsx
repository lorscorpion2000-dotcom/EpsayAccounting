import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, Truck, Users, Package, Download, Filter, Info,
  TrendingUp, TrendingDown, Fuel, Clock, Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { operationalReportsApi } from '../services/operational-reports.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type {
  EquipmentEfficiencyReport, SubcontractorPerformanceReport, WarehouseDiscrepancyReport,
} from '@/types/operational-reports';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import { PR_UNIT_LABELS, PRItemUnit } from '@/types/procurement';

type Tab = 'equipment' | 'subcontractor' | 'warehouse';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function startOfYearISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(y, 2, 21);
  if (start > d) start.setFullYear(y - 1);
  return start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
}

export default function OperationalReportsPage() {
  const [tab, setTab] = useState<Tab>('equipment');
  const [projects, setProjects] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Equipment
  const [eqFrom, setEqFrom] = useState(startOfYearISO());
  const [eqTo, setEqTo] = useState(todayISO());
  const [eqProject, setEqProject] = useState('');
  const [eqId, setEqId] = useState('');
  const [eqData, setEqData] = useState<EquipmentEfficiencyReport | null>(null);

  // Subcontractor
  const [subProject, setSubProject] = useState('');
  const [subFrom, setSubFrom] = useState('');
  const [subTo, setSubTo] = useState('');
  const [subData, setSubData] = useState<SubcontractorPerformanceReport | null>(null);

  // Warehouse
  const [whFrom, setWhFrom] = useState(startOfYearISO());
  const [whTo, setWhTo] = useState(todayISO());
  const [whWarehouse, setWhWarehouse] = useState('');
  const [whData, setWhData] = useState<WarehouseDiscrepancyReport | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/warehouses').then((r) => r.data).catch(() => []),
      api.get('/equipment').then((r) => r.data).catch(() => []),
    ]).then(([prj, whs, eq]) => {
      setProjects(prj);
      setWarehouses(whs);
      setEquipments(eq);
    });
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      setEqData(await operationalReportsApi.equipmentEfficiency({
        fromDate: eqFrom, toDate: eqTo,
        projectId: eqProject || undefined,
        equipmentId: eqId || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const loadSubcontractor = async () => {
    setLoading(true);
    try {
      setSubData(await operationalReportsApi.subcontractorPerformance({
        projectId: subProject || undefined,
        fromDate: subFrom || undefined,
        toDate: subTo || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const loadWarehouse = async () => {
    setLoading(true);
    try {
      setWhData(await operationalReportsApi.warehouseDiscrepancy({
        fromDate: whFrom, toDate: whTo,
        warehouseId: whWarehouse || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const exportToExcel = (rows: any[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, name + '-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand-600" />
            گزارش‌های عملیاتی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            راندمان ماشین‌آلات، عملکرد پیمانکاران و مغایرت انبار
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {[
            { key: 'equipment' as Tab, label: 'راندمان ماشین‌آلات', icon: Truck },
            { key: 'subcontractor' as Tab, label: 'عملکرد پیمانکاران', icon: Users },
            { key: 'warehouse' as Tab, label: 'مغایرت انبار', icon: Package },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 1: Equipment */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'equipment' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="label">از تاریخ</label>
                <PersianDatePicker value={eqFrom} onChange={setEqFrom} />
              </div>
              <div>
                <label className="label">تا تاریخ</label>
                <PersianDatePicker value={eqTo} onChange={setEqTo} />
              </div>
              <div>
                <label className="label">پروژه</label>
                <select value={eqProject} onChange={(e) => setEqProject(e.target.value)} className="input">
                  <option value="">همه</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ماشین</label>
                <select value={eqId} onChange={(e) => setEqId(e.target.value)} className="input">
                  <option value="">همه</option>
                  {equipments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadEquipment} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {eqData && (
                  <button onClick={() => exportToExcel(
                    eqData.items.map((it) => ({
                      'کد': it.code, 'نام': it.name, 'برند': it.brand || '', 'مدل': it.model || '',
                      'مالکیت': it.ownership === 'OWNED' ? 'ملکی' : 'اجاره‌ای',
                      'ساعت کار': it.totalWorkHours, 'درجا': it.totalIdleHours,
                      'توقف': it.totalStopHours, 'خرابی': it.totalBreakdownHours,
                      'سوخت (ل)': it.totalFuelLiters, 'نرخ مصرف': it.fuelPerHour,
                      'نُرم': it.fuelNormPerHour, 'انحراف٪': it.normDiffPct,
                      'هزینه کل': it.totalComputedCost, 'نرخ ساعتی': it.avgHourlyCost,
                      'درصد دسترسی': it.availabilityRate,
                    })), 'equipment-efficiency')} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {eqData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Truck className="w-3 h-3" /> تعداد ماشین</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(eqData.totals.totalEquipments)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> ساعت کار</div>
                  <div className="text-xl font-bold num mt-1 text-emerald-700">
                    {toPersianDigits(eqData.totals.totalWorkHours.toFixed(1))}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Fuel className="w-3 h-3" /> مصرف سوخت (ل)</div>
                  <div className="text-xl font-bold num mt-1 text-blue-700">
                    {toPersianDigits(eqData.totals.totalFuelLiters.toFixed(1))}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><Wrench className="w-3 h-3" /> توقف/خرابی</div>
                  <div className="text-xl font-bold num mt-1 text-amber-700">
                    {toPersianDigits((eqData.totals.totalStopHours + eqData.totals.totalBreakdownHours).toFixed(1))}
                  </div>
                </div>
                <div className="card p-4 border-s-4 border-s-brand-500">
                  <div className="text-xs text-slate-500">جمع هزینه (ریال)</div>
                  <div className="text-lg font-bold num mt-1 text-brand-700">
                    {toPersianDigits(eqData.totals.totalCost.toLocaleString())}
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm">
                    جزئیات راندمان ({toPersianDigits(eqData.items.length)} ماشین)
                  </span>
                </div>
                {eqData.items.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">داده‌ای یافت نشد</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1300px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2 w-24">کد</th>
                          <th className="text-right px-2 py-2">ماشین</th>
                          <th className="text-center px-2 py-2 w-20">مالکیت</th>
                          <th className="text-center px-2 py-2 w-20">ساعت کار</th>
                          <th className="text-center px-2 py-2 w-16">درجا</th>
                          <th className="text-center px-2 py-2 w-16">توقف</th>
                          <th className="text-center px-2 py-2 w-16">خرابی</th>
                          <th className="text-center px-2 py-2 w-20">سوخت (ل)</th>
                          <th className="text-center px-2 py-2 w-20">نرخ مصرف</th>
                          <th className="text-center px-2 py-2 w-20">نُرم</th>
                          <th className="text-center px-2 py-2 w-20">انحراف</th>
                          <th className="text-left px-2 py-2 w-28">هزینه کل</th>
                          <th className="text-center px-2 py-2 w-20">دسترسی٪</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eqData.items.map((it, i) => (
                          <tr key={it.equipmentId} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-right num font-mono" dir="ltr">{it.code}</td>
                            <td className="px-2 py-2 text-right text-slate-800">
                              <div>{it.name}</div>
                              {(it.brand || it.model) && (
                                <div className="text-[10px] text-slate-400">{it.brand} {it.model}</div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded',
                                it.ownership === 'OWNED' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}>
                                {it.ownership === 'OWNED' ? 'ملکی' : 'اجاره‌ای'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center num font-bold text-emerald-700">{toPersianDigits(it.totalWorkHours.toFixed(1))}</td>
                            <td className="px-2 py-2 text-center num text-xs text-slate-500">{toPersianDigits(it.totalIdleHours.toFixed(1))}</td>
                            <td className="px-2 py-2 text-center num text-xs text-amber-700">{toPersianDigits(it.totalStopHours.toFixed(1))}</td>
                            <td className="px-2 py-2 text-center num text-xs text-red-700">{toPersianDigits(it.totalBreakdownHours.toFixed(1))}</td>
                            <td className="px-2 py-2 text-center num text-xs">{toPersianDigits(it.totalFuelLiters.toFixed(1))}</td>
                            <td className="px-2 py-2 text-center num text-xs">{toPersianDigits(it.fuelPerHour.toFixed(2))}</td>
                            <td className="px-2 py-2 text-center num text-xs text-slate-500">
                              {it.fuelNormPerHour > 0 ? toPersianDigits(it.fuelNormPerHour) : '—'}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {it.fuelCompliance === 'N/A' ? (
                                <span className="text-slate-400 text-xs">—</span>
                              ) : (
                                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-bold',
                                  it.fuelCompliance === 'NORMAL' ? 'bg-emerald-50 text-emerald-700' :
                                  it.fuelCompliance === 'OVER' ? 'bg-red-50 text-red-700' :
                                  'bg-blue-50 text-blue-700')}>
                                  {it.normDiffPct > 0 ? '+' : ''}{toPersianDigits(it.normDiffPct.toFixed(1))}٪
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-left num text-xs font-bold text-brand-700">
                              {toPersianDigits(it.totalComputedCost.toLocaleString())}
                            </td>
                            <td className="px-2 py-2 text-center num text-xs">{toPersianDigits(it.availabilityRate.toFixed(1))}٪</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 2: Subcontractor */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'subcontractor' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="label">از تاریخ (اختیاری)</label>
                <PersianDatePicker value={subFrom} onChange={setSubFrom} />
              </div>
              <div>
                <label className="label">تا تاریخ (اختیاری)</label>
                <PersianDatePicker value={subTo} onChange={setSubTo} />
              </div>
              <div>
                <label className="label">پروژه</label>
                <select value={subProject} onChange={(e) => setSubProject(e.target.value)} className="input">
                  <option value="">همه</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadSubcontractor} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {subData && (
                  <button onClick={() => exportToExcel(
                    subData.items.map((it) => ({
                      'کد': it.code, 'نام': it.name, 'کد ملی': it.nationalId || '',
                      'تلفن': it.phone || '', 'تعداد صورت‌وضعیت': it.statementCount,
                      'تاییدشده': it.approvedCount, 'پرداخت‌شده': it.paidCount,
                      'جمع کارکرد': it.totalAmount, 'کسورات': it.totalDeduction,
                      'خالص پرداختی': it.netPayable, 'مبلغ پرداختی': it.paidAmount,
                      'مانده': it.unpaidAmount, 'پروژه‌ها': it.projects,
                    })), 'subcontractor-performance')} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {subData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">تعداد پیمانکار</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(subData.totals.totalContractors)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">جمع کارکرد</div>
                  <div className="text-lg font-bold num mt-1 text-blue-700">
                    {toPersianDigits(subData.totals.totalNetPayable.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> پرداخت‌شده</div>
                  <div className="text-lg font-bold num mt-1 text-emerald-700">
                    {toPersianDigits(subData.totals.totalPaid.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4 border-s-4 border-s-red-500">
                  <div className="text-xs text-slate-500">مانده پرداخت‌نشده</div>
                  <div className="text-lg font-bold num mt-1 text-red-700">
                    {toPersianDigits(subData.totals.totalUnpaid.toLocaleString())}
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm">
                    عملکرد ({toPersianDigits(subData.items.length)} پیمانکار)
                  </span>
                </div>
                {subData.items.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">داده‌ای یافت نشد</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1200px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2 w-24">کد</th>
                          <th className="text-right px-2 py-2">نام پیمانکار</th>
                          <th className="text-center px-2 py-2 w-24">کد ملی</th>
                          <th className="text-right px-2 py-2 w-32">پروژه‌ها</th>
                          <th className="text-center px-2 py-2 w-20">ت. صورت‌وضعیت</th>
                          <th className="text-center px-2 py-2 w-20">تاییدشده</th>
                          <th className="text-left px-2 py-2 w-28">جمع کارکرد</th>
                          <th className="text-left px-2 py-2 w-24">کسورات</th>
                          <th className="text-left px-2 py-2 w-28">خالص</th>
                          <th className="text-left px-2 py-2 w-28">پرداخت‌شده</th>
                          <th className="text-left px-2 py-2 w-28">مانده</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subData.items.map((it, i) => (
                          <tr key={it.contractorId} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-right num font-mono" dir="ltr">{it.code}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{it.name}</td>
                            <td className="px-2 py-2 text-center num text-xs" dir="ltr">{it.nationalId || '—'}</td>
                            <td className="px-2 py-2 text-right text-slate-500 text-[10px] truncate max-w-[200px]" title={it.projects}>
                              {it.projects || '—'}
                            </td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(it.statementCount)}</td>
                            <td className="px-2 py-2 text-center num text-emerald-700">{toPersianDigits(it.approvedCount)}</td>
                            <td className="px-2 py-2 text-left num">{toPersianDigits(Math.round(it.totalAmount).toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num text-red-700">{toPersianDigits(Math.round(it.totalDeduction).toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num font-bold text-brand-700">{toPersianDigits(Math.round(it.netPayable).toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num text-emerald-700">{toPersianDigits(Math.round(it.paidAmount).toLocaleString())}</td>
                            <td className={clsx('px-2 py-2 text-left num font-bold',
                              it.unpaidAmount > 0 ? 'text-red-700' : 'text-slate-400')}>
                              {toPersianDigits(Math.round(it.unpaidAmount).toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 font-bold">
                        <tr>
                          <td colSpan={7} className="px-2 py-3 text-right text-slate-700">جمع کل:</td>
                          <td className="px-2 py-3 text-left num">{toPersianDigits(subData.totals.totalAmount.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-red-700">{toPersianDigits(subData.totals.totalDeduction.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-brand-700">{toPersianDigits(subData.totals.totalNetPayable.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-emerald-700">{toPersianDigits(subData.totals.totalPaid.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-red-700">{toPersianDigits(subData.totals.totalUnpaid.toLocaleString())}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 3: Warehouse Discrepancy */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'warehouse' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="label">از تاریخ</label>
                <PersianDatePicker value={whFrom} onChange={setWhFrom} />
              </div>
              <div>
                <label className="label">تا تاریخ</label>
                <PersianDatePicker value={whTo} onChange={setWhTo} />
              </div>
              <div>
                <label className="label">انبار</label>
                <select value={whWarehouse} onChange={(e) => setWhWarehouse(e.target.value)} className="input">
                  <option value="">همه</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadWarehouse} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {whData && (
                  <button onClick={() => exportToExcel(
                    whData.rows.map((r) => ({
                      'کد انبارگردانی': r.countCode,
                      'تاریخ': formatJalaliDate(r.countDate),
                      'انبار': r.warehouseName || '',
                      'کد کالا': r.itemCode || '',
                      'نام کالا': r.itemName || '',
                      'واحد': r.unit || '',
                      'موجودی سیستم': r.systemQty,
                      'شمارش فیزیکی': r.physicalQty,
                      'اختلاف': r.difference,
                      'بهای واحد': r.unitCost,
                      'اختلاف ریالی': r.differenceCost,
                    })), 'warehouse-discrepancy')} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {whData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">تعداد انبارگردانی</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(whData.totals.totalCounts)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">تعداد ردیف اختلاف</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(whData.totals.totalRows)}</div>
                </div>
                <div className="card p-4 border-s-4 border-s-emerald-500">
                  <div className="text-xs text-slate-500">اختلاف مثبت (اضافه)</div>
                  <div className="text-lg font-bold num mt-1 text-emerald-700">
                    {toPersianDigits(whData.totals.positiveCostDiff.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4 border-s-4 border-s-red-500">
                  <div className="text-xs text-slate-500">اختلاف منفی (کسر)</div>
                  <div className="text-lg font-bold num mt-1 text-red-700">
                    {toPersianDigits(Math.abs(whData.totals.negativeCostDiff).toLocaleString())}
                  </div>
                </div>
                <div className={clsx('card p-4 border-s-4',
                  whData.totals.totalCostDiff >= 0 ? 'border-s-emerald-500' : 'border-s-red-500')}>
                  <div className="text-xs text-slate-500">خالص</div>
                  <div className={clsx('text-lg font-bold num mt-1',
                    whData.totals.totalCostDiff >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                    {toPersianDigits(Math.abs(whData.totals.totalCostDiff).toLocaleString())}
                  </div>
                </div>
              </div>

              {/* Item summary */}
              {whData.itemSummary.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 border-b bg-slate-50 flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-700 text-sm">
                      تحلیل به تفکیک کالا ({toPersianDigits(whData.itemSummary.length)} کالا)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2 w-24">کد کالا</th>
                          <th className="text-right px-2 py-2">نام</th>
                          <th className="text-center px-2 py-2 w-20">واحد</th>
                          <th className="text-center px-2 py-2 w-24">دفعات شمارش</th>
                          <th className="text-center px-2 py-2 w-24">+ (اضافه)</th>
                          <th className="text-center px-2 py-2 w-24">- (کسر)</th>
                          <th className="text-center px-2 py-2 w-24">خالص تعداد</th>
                          <th className="text-left px-2 py-2 w-32">خالص ریالی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {whData.itemSummary.map((it, i) => (
                          <tr key={it.itemId} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-right num font-mono" dir="ltr">{it.itemCode}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{it.itemName}</td>
                            <td className="px-2 py-2 text-center text-xs">{PR_UNIT_LABELS[it.unit as PRItemUnit] || it.unit}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(it.countOccurrences)}</td>
                            <td className="px-2 py-2 text-center num text-emerald-700">{toPersianDigits(it.positiveDiffCount)}</td>
                            <td className="px-2 py-2 text-center num text-red-700">{toPersianDigits(it.negativeDiffCount)}</td>
                            <td className={clsx('px-2 py-2 text-center num font-bold',
                              it.totalQtyDiff > 0 ? 'text-emerald-700' : 'text-red-700')}>
                              {it.totalQtyDiff > 0 ? '+' : ''}{toPersianDigits(it.totalQtyDiff.toFixed(2))}
                            </td>
                            <td className={clsx('px-2 py-2 text-left num font-bold',
                              it.totalCostDiff > 0 ? 'text-emerald-700' : 'text-red-700')}>
                              {it.totalCostDiff > 0 ? '+' : ''}{toPersianDigits(Math.round(it.totalCostDiff).toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detail rows */}
              {whData.rows.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 border-b bg-slate-50">
                    <span className="font-bold text-slate-700 text-sm">
                      ریز اختلافات ({toPersianDigits(whData.rows.length)} ردیف)
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-xs min-w-[1000px]">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-center px-2 py-2 w-24">تاریخ</th>
                          <th className="text-right px-2 py-2 w-28">کد انبارگردانی</th>
                          <th className="text-right px-2 py-2 w-32">انبار</th>
                          <th className="text-right px-2 py-2">کالا</th>
                          <th className="text-center px-2 py-2 w-16">سیستم</th>
                          <th className="text-center px-2 py-2 w-16">فیزیکی</th>
                          <th className="text-center px-2 py-2 w-20">اختلاف</th>
                          <th className="text-left px-2 py-2 w-28">ریالی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {whData.rows.slice(0, 300).map((r, i) => (
                          <tr key={`${r.countId}-${r.itemId}-${i}`} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-center num">{formatJalaliDate(r.countDate)}</td>
                            <td className="px-2 py-2 text-right num font-mono" dir="ltr">{r.countCode}</td>
                            <td className="px-2 py-2 text-right text-slate-600">{r.warehouseName}</td>
                            <td className="px-2 py-2 text-right text-slate-800">
                              <div>{r.itemName}</div>
                              <div className="text-[10px] text-slate-400 num" dir="ltr">{r.itemCode}</div>
                            </td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.systemQty.toFixed(2))}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.physicalQty.toFixed(2))}</td>
                            <td className={clsx('px-2 py-2 text-center num font-bold',
                              r.difference > 0 ? 'text-emerald-700' : 'text-red-700')}>
                              {r.difference > 0 ? '+' : ''}{toPersianDigits(r.difference.toFixed(2))}
                            </td>
                            <td className={clsx('px-2 py-2 text-left num text-xs',
                              r.differenceCost > 0 ? 'text-emerald-700' : 'text-red-700')}>
                              {r.differenceCost > 0 ? '+' : ''}{toPersianDigits(Math.round(r.differenceCost).toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {whData.rows.length > 300 && (
                      <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-500">
                        ... و {toPersianDigits(whData.rows.length - 300)} ردیف دیگر (خروجی اکسل بگیرید)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
