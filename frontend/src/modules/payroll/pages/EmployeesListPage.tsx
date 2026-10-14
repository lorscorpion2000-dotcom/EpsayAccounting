import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, User, Users, Edit, RefreshCw, FileSpreadsheet, Briefcase, Award, Eye, Archive } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { Employee } from '@/types/payroll';
import { EMPLOYEE_TYPE_LABELS } from '@/types/payroll';
import { formatNumber, toPersianDigits } from '@/utils/format';
import EmployeeFormModal from '../components/EmployeeFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const TYPE_COLORS: Record<string, string> = {
  FULL_TIME: 'bg-emerald-50 text-emerald-700',
  PART_TIME: 'bg-blue-50 text-blue-700',
  CONTRACTOR: 'bg-purple-50 text-purple-700',
  DAILY_WAGE: 'bg-amber-50 text-amber-700',
  HOURLY: 'bg-cyan-50 text-cyan-700',
};

export default function EmployeesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, st] = await Promise.all([
        payrollApi.employees.list({
          search: search || undefined,
          type: typeFilter || undefined,
        }),
        payrollApi.employees.stats().catch(() => null),
      ]);
      setItems(data);
      setStats(st);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {
      await payrollApi.employees.remove(deleting.id, force);
      toast.success(force ? 'پرسنل بهطور کامل حذف شد' : 'پرسنل غیرفعال شد');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'EMPLOYEE_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
      }
    }
  };

  const handleExportExcel = () => {
    if (!items.length) return;
    const rows = items.map((e, i) => ({
      'ردیف': i + 1,
      'کد پرسنلی': e.employeeCode,
      'نام': e.partner?.name || '',
      'نوع همکاری': EMPLOYEE_TYPE_LABELS[e.employeeType],
      'سمت': e.position || '',
      'واحد': e.department || '',
      'حقوق پایه': Number(e.baseSalary),
      'مجموع مزایا': Number(e.housingAllow) + Number(e.foodAllow) + Number(e.childAllow) + Number(e.otherAllow),
      'تلفن': e.partner?.phone || '',
      'وضعیت': e.isActive ? 'فعال' : 'غیرفعال',
    }));
    void exportToExcel({
      filename: `Employees-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'Employees',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            پرسنل
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت پرسنل و اطلاعات حقوق</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> پرسنل جدید
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-5 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">کل پرسنل</div>
                <div className="text-2xl font-bold text-brand-700 num">{toPersianDigits(stats.total)}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">فعال</div>
                <div className="text-2xl font-bold text-emerald-700 num">{toPersianDigits(stats.active)}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">غیرفعال</div>
                <div className="text-2xl font-bold text-slate-700 num">{toPersianDigits(stats.inactive)}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">تمام‌وقت</div>
                <div className="text-2xl font-bold text-amber-700 num">
                  {toPersianDigits(stats.byType?.FULL_TIME || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">همه انواع</option>
            {Object.entries(EMPLOYEE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ پرسنلی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> اولین پرسنل
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">سمت / واحد</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-44">حقوق پایه</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-44">کل دریافتی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((e) => {
                  const total = Number(e.baseSalary) + Number(e.housingAllow) + Number(e.foodAllow) + Number(e.childAllow) + Number(e.otherAllow);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{e.employeeCode}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs',
                            e.isActive ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-gradient-to-br from-slate-400 to-slate-600',
                          )}>
                            {e.partner?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{e.partner?.name}</div>
                            {e.partner?.phone && (
                              <div className="text-xs text-slate-500 num" dir="ltr">{e.partner.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-md', TYPE_COLORS[e.employeeType] || 'bg-slate-100')}>
                          {EMPLOYEE_TYPE_LABELS[e.employeeType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700">{e.position || '—'}</div>
                        <div className="text-xs text-slate-500">{e.department || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-slate-700 font-medium" dir="ltr">{formatNumber(Number(e.baseSalary))}</span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-emerald-700 font-bold" dir="ltr">{formatNumber(total)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/payroll/employees"
                          id={e.id}
                          itemLabel={(e as any).code || (e as any).name || (e as any).title || (e as any).fullName || (e as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button
                            onClick={() => navigate('/payroll/employees/' + e.id)}
                            className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                            title="مشاهده"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditing(e); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(e)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="حذف"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EmployeeFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting && !forceConfirm}
        title="غیرفعالسازی پرسنل"
        message={deleting ? "پرسنل «" + (deleting.partner?.name || "") + "» غیرفعال شود این عمل قابل بازگشت است." : ""}
        confirmLabel="بله غیرفعال شود"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل پرسنل (مدیر سیستم)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <p className="text-xs text-slate-500">با حذف کامل تمام سوابق مرتبط (حضور کارکرد مرخصی مساعده) پاک میشود.</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setDeleting(null); }} className="btn-secondary">انصراف</button>
                <button onClick={() => handleDelete(true)} className="btn-danger">حذف کامل (خطرناک)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
