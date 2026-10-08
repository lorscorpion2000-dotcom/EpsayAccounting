import { useEffect, useState } from 'react';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { toast } from 'sonner';
import {
  BarChart3, Loader2, RefreshCw, Clock, Fuel, CircleDollarSign, TrendingDown,
} from 'lucide-react';
import { equipmentApi } from '../services/equipment.api';
import type { EquipmentReport, Equipment } from '@/types/equipment';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import { toPersianDigits } from '@/utils/format';

export default function EquipmentReportPage() {
  const [report, setReport] = useState<EquipmentReport | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [data, eq, prj] = await Promise.all([
        equipmentApi.reports.usage({
          equipmentId: equipmentFilter || undefined,
          projectId: projectFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        equipmentApi.equipment.list().catch(() => []),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setReport(data);
      setEquipments(eq);
      setProjects(prj);
    } catch {
      toast.error('خطا در بارگذاری گزارش');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [equipmentFilter, projectFilter, fromDate, toDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            گزارش کارکرد ماشین‌آلات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تحلیل ساعت کار، مصرف سوخت و هزینه به تفکیک ماشین
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="input">
            <option value="">همه ماشین‌ها</option>
            {equipments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <PersianDatePicker value={fromDate} onChange={setFromDate} />
          <PersianDatePicker value={toDate} onChange={setToDate} />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !report ? null : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-emerald-600" /> ساعت کارکرد
              </div>
              <div className="text-2xl font-bold num mt-1">
                {toPersianDigits(report.summary.totalWorkHours.toFixed(1))}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Fuel className="w-4 h-4 text-blue-600" /> مصرف سوخت (ل)
              </div>
              <div className="text-2xl font-bold num mt-1">
                {toPersianDigits(report.summary.totalFuelLiters.toFixed(1))}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingDown className="w-4 h-4 text-amber-600" /> توقف/خرابی
              </div>
              <div className="text-2xl font-bold num mt-1">
                {toPersianDigits((report.summary.totalStopHours + report.summary.totalBreakdownHours).toFixed(1))}
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CircleDollarSign className="w-4 h-4 text-red-600" /> هزینه کل
              </div>
              <div className="text-xl font-bold num mt-1">
                {toPersianDigits(Math.round(report.summary.totalCost).toLocaleString())}
              </div>
            </div>
          </div>

          {/* By equipment table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-800">تفکیک به ماشین</h2>
            </div>
            {report.byEquipment.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">کد</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">ماشین</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">ساعت کار</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">درجا</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">توقف</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">خرابی</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">سوخت (ل)</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">هزینه</th>
                      <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">رکورد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.byEquipment.map((item) => (
                      <tr key={item.equipmentId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">
                            {item.equipmentCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-800">{item.equipmentName}</td>
                        <td className="px-4 py-3 text-center num font-bold">{toPersianDigits(item.workHours.toFixed(1))}</td>
                        <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(item.idleHours.toFixed(1))}</td>
                        <td className="px-4 py-3 text-center num text-xs text-amber-700">{toPersianDigits(item.stopHours.toFixed(1))}</td>
                        <td className="px-4 py-3 text-center num text-xs text-red-700">{toPersianDigits(item.breakdownHours.toFixed(1))}</td>
                        <td className="px-4 py-3 text-center num text-xs">{toPersianDigits(item.fuelLiters.toFixed(1))}</td>
                        <td className="px-4 py-3 text-left num text-xs font-bold">
                          {toPersianDigits(Math.round(item.cost).toLocaleString())}
                        </td>
                        <td className="px-4 py-3 text-center num text-xs text-slate-500">
                          {toPersianDigits(item.logCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-slate-700">جمع کل</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalWorkHours.toFixed(1))}</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalIdleHours.toFixed(1))}</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalStopHours.toFixed(1))}</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalBreakdownHours.toFixed(1))}</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalFuelLiters.toFixed(1))}</td>
                      <td className="px-4 py-3 text-left num">{toPersianDigits(Math.round(report.summary.totalCost).toLocaleString())}</td>
                      <td className="px-4 py-3 text-center num">{toPersianDigits(report.summary.totalLogs)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
