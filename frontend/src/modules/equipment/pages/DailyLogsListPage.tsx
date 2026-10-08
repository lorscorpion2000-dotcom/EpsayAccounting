import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { toast } from 'sonner';
import {
  Plus, Loader2, Clock, Trash2, RefreshCw, CheckCircle2, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { equipmentApi } from '../services/equipment.api';
import type { EquipmentDailyLog, Equipment } from '@/types/equipment';
import {
  EQUIPMENT_LOG_STATUS_LABELS, EQUIPMENT_LOG_STATUS_COLORS,
} from '@/types/equipment';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DailyLogsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EquipmentDailyLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actionItem, setActionItem] = useState<EquipmentDailyLog | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj, eq] = await Promise.all([
        equipmentApi.logs.list({
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
          equipmentId: equipmentFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
        equipmentApi.equipment.list().catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
      setEquipments(eq);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, projectFilter, equipmentFilter, fromDate, toDate]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await equipmentApi.logs.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const totalWork = items.reduce((s, l) => s + Number(l.workHours), 0);
  const totalCost = items.reduce((s, l) => s + Number(l.computedCost), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-600" />
            کارکرد روزانه ماشین‌آلات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت و پیگیری ساعت کار، سوخت و هزینه ماشین‌آلات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={() => navigate('/equipment/logs/new')}>
            <Plus className="w-4 h-4" /> ثبت کارکرد
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">تعداد رکورد</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(items.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">جمع ساعت کارکرد</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(totalWork.toFixed(1))}</div>
        </div>
        <div className="card p-4 md:col-span-2">
          <div className="text-xs text-slate-500">جمع هزینه</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(Math.round(totalCost).toLocaleString())}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="input">
            <option value="">همه ماشین‌ها</option>
            {equipments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(EQUIPMENT_LOG_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <PersianDatePicker value={fromDate} onChange={setFromDate} />
          <PersianDatePicker value={toDate} onChange={setToDate} />
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ کارکردی یافت نشد</p>
            <button className="btn-primary" onClick={() => navigate('/equipment/logs/new')}>
              <Plus className="w-4 h-4" /> ثبت اولین کارکرد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">ماشین</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">تاریخ</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">شیفت</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">ساعت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">سوخت</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-28">هزینه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">وضعیت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">
                        {log.code}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-800">{log.equipment?.name}</td>
                    <td className="px-3 py-3 text-center num text-xs">{formatJalaliDate(log.logDate)}</td>
                    <td className="px-3 py-3 text-center text-xs">{log.shift || '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{log.project?.name || '—'}</td>
                    <td className="px-3 py-3 text-center num">{toPersianDigits(Number(log.workHours))}</td>
                    <td className="px-3 py-3 text-center num">{toPersianDigits(Number(log.fuelLiters))}</td>
                    <td className="px-3 py-3 text-left num text-xs">{toPersianDigits(Math.round(Number(log.computedCost)).toLocaleString())}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', EQUIPMENT_LOG_STATUS_COLORS[log.status])}>
                        {EQUIPMENT_LOG_STATUS_LABELS[log.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {log.status === 'DRAFT' && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await equipmentApi.logs.confirm(log.id);
                                toast.success('تأیید شد');
                                load();
                              } catch (e: any) {
                                toast.error(e?.response?.data?.message || 'خطا');
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            title="تأیید"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActionItem(log)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
        title="حذف کارکرد"
        message={actionItem ? `آیا از حذف «${actionItem.code}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
