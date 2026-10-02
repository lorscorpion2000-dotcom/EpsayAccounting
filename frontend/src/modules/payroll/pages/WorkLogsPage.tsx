import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Briefcase, RefreshCw, Edit, Trash2, FileSpreadsheet, Search } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { WorkLog, Employee } from '@/types/payroll';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '@/types/payroll';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import WorkLogFormModal from '../components/WorkLogFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PersianDatePicker } from '@/components/PersianDatePicker';

import { exportToExcel } from '@/utils/export-excel';
export default function WorkLogsPage() {
  const [items, setItems] = useState<WorkLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [deleting, setDeleting] = useState<WorkLog | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        payrollApi.workLogs.list({
          employeeId: employeeFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        payrollApi.employees.list({ active: true }).catch(() => []),
      ]);
      setItems(data);
      setEmployees(emps);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeFilter, fromDate, toDate]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await payrollApi.workLogs.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!items.length) return;
    const rows = items.map((w, i) => ({
      'ردیف': i + 1,
      'نام': w.employee?.name || '',
      'تاریخ': new Date(w.workDate).toLocaleDateString('fa-IR'),
      'ساعت عادی': Number(w.regularHours),
      'اضافه‌کار': Number(w.overtimeHours),
      'تعطیلات': Number(w.holidayHours),
      'شرح': w.description || '',
      'وضعیت': ATTENDANCE_LABELS[w.status],
    }));
    void exportToExcel({
      filename: 'WorkLogs-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'WorkLogs',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((w) => w.employee?.name?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-600" /> کارکرد روزانه
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت ساعات کار و اضافه‌کار پرسنل</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> ثبت کارکرد
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی نام..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="input">
            <option value="">همه پرسنل</option>
            {employees.map((e) => <option key={e.id} value={e.partnerId}>{e.partner?.name}</option>)}
          </select>
          <PersianDatePicker value={fromDate} onChange={(v) => setFromDate(v || '')} placeholder="از تاریخ" />
          <PersianDatePicker value={toDate} onChange={(v) => setToDate(v || '')} placeholder="تا تاریخ" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ کارکردی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> ثبت کارکرد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">عادی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">اضافه‌کار</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">تعطیلات</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شرح</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{w.employee?.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(w.workDate)}</span></td>
                    <td className="px-4 py-3 text-center num">{toPersianDigits(Number(w.regularHours).toFixed(1))}</td>
                    <td className="px-4 py-3 text-center num text-amber-700">{toPersianDigits(Number(w.overtimeHours).toFixed(1))}</td>
                    <td className="px-4 py-3 text-center num text-blue-700">{toPersianDigits(Number(w.holidayHours).toFixed(1))}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{w.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', ATTENDANCE_COLORS[w.status])}>
                        {ATTENDANCE_LABELS[w.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(w); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(w)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WorkLogFormModal isOpen={showModal} editing={editing} employees={employees}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف کارکرد"
        message="آیا از حذف این رکورد کارکرد اطمینان دارید؟"
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
