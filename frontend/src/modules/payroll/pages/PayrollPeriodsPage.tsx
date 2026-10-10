import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, Calendar, RefreshCw, Eye, Calculator, Trash2, Users } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { PayrollPeriod } from '@/types/payroll';
import { PERIOD_STATUS_LABELS, PERIOD_STATUS_COLORS } from '@/types/payroll';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import PayrollPeriodFormModal from '../components/PayrollPeriodFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function PayrollPeriodsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<PayrollPeriod | null>(null);
  const [calculating, setCalculating] = useState<PayrollPeriod | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await payrollApi.periods.list();
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await payrollApi.periods.remove(deleting.id);
      toast.success('دوره حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!calculating) return;
    setActionLoading(true);
    try {
      await payrollApi.periods.calculate(calculating.id);
      toast.success('حقوق محاسبه شد');
      setCalculating(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            دوره‌های حقوق
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت دوره‌های ماهانه حقوق و دستمزد</p>
        </div>
        <div className="flex items-center gap-2">
                        <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> دوره جدید
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ دوره حقوقی ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین دوره
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{p.title}</div>
                    <div className="text-xs text-slate-500 num" dir="ltr">{p.code}</div>
                  </div>
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-md', PERIOD_STATUS_COLORS[p.status])}>
                  {PERIOD_STATUS_LABELS[p.status]}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="num">{formatJalaliDate(p.startDate)} تا {formatJalaliDate(p.endDate)}</span>
                </div>
                {p.project && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.project.name}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-slate-400">جمع ناخالص</div>
                  <div className="font-bold text-slate-800 num">{formatNumber(Number(p.totalGross))}</div>
                </div>
                <div>
                  <div className="text-slate-400">جمع خالص</div>
                  <div className="font-bold text-emerald-700 num">{formatNumber(Number(p.totalNet))}</div>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                <AdminDeleteButton
                  endpoint="/payroll/periods"
                  id={p.id}
                  itemLabel={p.code || p.title}
                  onSuccess={load}
                />
                <button onClick={() => navigate('/payroll/periods/' + p.id)} className="btn-secondary text-xs py-1.5 px-3 flex-1">
                  <Eye className="w-3.5 h-3.5" /> مشاهده
                </button>
                {p.status === 'DRAFT' && (
                  <>
                    <button onClick={() => setCalculating(p)} className="btn-primary text-xs py-1.5 px-3 flex-1">
                      <Calculator className="w-3.5 h-3.5" /> محاسبه
                    </button>
                    <button onClick={() => setDeleting(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PayrollPeriodFormModal isOpen={showModal} onClose={() => setShowModal(false)} onSaved={load} />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف دوره حقوق"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        isOpen={!!calculating}
        title="محاسبه حقوق"
        message={'آیا محاسبه حقوق دوره «' + (calculating?.title || '') + '» انجام شود؟'}
        confirmLabel="بله، محاسبه کن"
        variant="info"
        loading={actionLoading}
        onConfirm={handleCalculate}
        onCancel={() => setCalculating(null)}
      />
    </div>
  );
}
