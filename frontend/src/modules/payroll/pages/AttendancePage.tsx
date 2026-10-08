import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Clock, RefreshCw, FileSpreadsheet, Edit, Trash2, Search } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { AttendanceRecord, Employee, AttendanceStatus } from '@/types/payroll';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '@/types/payroll';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import AttendanceFormModal from '../components/AttendanceFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { PersianDatePicker } from '@/components/PersianDatePicker';

import { exportToExcel } from '@/utils/export-excel';
export default function AttendancePage() {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        payrollApi.attendance.list({
          employeeId: employeeFilter || undefined,
          status: statusFilter || undefined,
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

  useEffect(() => { load(); }, [employeeFilter, statusFilter, fromDate, toDate]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await payrollApi.attendance.remove(deleting.id);
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
    const rows = items.map((a, i) => ({
      'ردیف': i + 1,
      'نام': a.employee?.name || '',
      'تاریخ': new Date(a.attendanceDate).toLocaleDateString('fa-IR'),
      'ورود': a.checkIn || '',
      'خروج': a.checkOut || '',
      'ساعت کار': Number(a.workHours),
      'اضافه‌کار': Number(a.overtimeHours),
      'وضعیت': ATTENDANCE_LABELS[a.status],
    }));
    void exportToExcel({
      filename: 'Attendance-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'Attendance',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((a) => a.employee?.name?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" /> حضور و غیاب
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت ورود، خروج و کارکرد روزانه پرسنل</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> ثبت حضور
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ رکورد حضوری ثبت نشده است</p>
            <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> ثبت اولین حضور
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">ورود</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">خروج</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">ساعت کار</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">اضافه‌کار</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.employee?.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(a.attendanceDate)}</span></td>
                    <td className="px-4 py-3 text-center num text-xs">{a.checkIn || '—'}</td>
                    <td className="px-4 py-3 text-center num text-xs">{a.checkOut || '—'}</td>
                    <td className="px-4 py-3 text-center num">{toPersianDigits(Number(a.workHours).toFixed(1))}</td>
                    <td className="px-4 py-3 text-center num text-amber-700">{toPersianDigits(Number(a.overtimeHours).toFixed(1))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', ATTENDANCE_COLORS[a.status])}>
                        {ATTENDANCE_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(a); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <AdminDeleteButton endpoint="/payroll/attendance" id={a.id} itemLabel={a.id} onSuccess={load} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AttendanceFormModal isOpen={showModal} editing={editing} employees={employees}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف رکورد حضور"
        message={'آیا از حذف رکورد «' + (deleting?.employee?.name || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
