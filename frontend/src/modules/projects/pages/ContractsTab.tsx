import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, FileText, Printer, Edit, Trash2,
  CheckCircle2, XCircle, PauseCircle, PlayCircle,
} from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import type { Project, Contract } from '@/types/project';
import { CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/types/project';
import { formatNumber, toPersianDigits, formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  TERMINATED: 'bg-red-50 text-red-700',
};

export default function ContractsTab() {
  const { project } = useOutletContext<{ project: Project }>();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.contracts.list(project.id);
      setContracts(data);
    } catch {
      toast.error('خطا در بارگذاری قراردادها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const handleStatusChange = async (contract: Contract, action: 'complete' | 'suspend' | 'terminate' | 'reactivate') => {
    setStatusChanging(true);
    setStatusMenuFor(null);
    try {
      const apiMethod = (projectsApi.contracts as any)[action];
      await apiMethod(contract.id);
      toast.success('وضعیت قرارداد تغییر کرد');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در تغییر وضعیت');
    } finally {
      setStatusChanging(false);
    }
  };
  const handleDelete = async () => {
    if (!deletingContract) return;
    setDeleting(true);
    try {
      await projectsApi.contracts.remove(deletingContract.id);
      toast.success('قرارداد با موفقیت حذف شد');
      setDeletingContract(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-slate-800">قراردادهای این پروژه</h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            چاپ لیست
          </button>
          <button
            onClick={() => navigate('/projects/' + project.id + '/contracts/new')}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            قرارداد جدید
          </button>
        </div>
      </div>

      {contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد قراردادها</div>
            <div className="text-xl font-bold text-slate-800 num">
              {toPersianDigits(contracts.length)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">مجموع مبالغ پایه</div>
            <div className="text-xl font-bold text-slate-800 num">
              {formatNumber(contracts.reduce((s, c) => s + Number(c.baseAmount), 0))}
            </div>
            <div className="text-xs text-slate-400">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">قراردادهای فعال</div>
            <div className="text-xl font-bold text-emerald-600 num">
              {toPersianDigits(contracts.filter((c) => c.status === 'ACTIVE').length)}
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ قراردادی برای این پروژه ثبت نشده است</p>
            <button
              onClick={() => navigate('/projects/' + project.id + '/contracts/new')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              ثبت اولین قرارداد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">نوع</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">مبلغ پایه (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">ضریب</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">تاریخ انعقاد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-600 font-mono" dir="ltr">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">
                        {CONTRACT_TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-medium text-slate-800" dir="ltr">
                        {formatNumber(Number(c.baseAmount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="num text-slate-700" dir="ltr">
                        {toPersianDigits(c.coefficient)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-700">
                        {c.signDate ? formatJalaliDate(c.signDate) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-md ${STATUS_COLORS[c.status] || 'bg-slate-100'}`}>
                        {CONTRACT_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 relative">
                        <button
                          onClick={() => navigate('/projects/' + project.id + '/contracts/' + c.id + '/edit')}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {c.status === 'ACTIVE' && (
                          <div className="relative">
                            <button
                              onClick={() => setStatusMenuFor(statusMenuFor === c.id ? null : c.id)}
                              disabled={statusChanging}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="تغییر وضعیت"
                            >
                              <PauseCircle className="w-4 h-4" />
                            </button>
                            {statusMenuFor === c.id && (
                              <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[160px] text-right">
                                <button onClick={() => handleStatusChange(c, 'complete')} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> خاتمه یافته
                                </button>
                                <button onClick={() => handleStatusChange(c, 'suspend')} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> تعلیق
                                </button>
                                <button onClick={() => handleStatusChange(c, 'terminate')} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs flex items-center gap-2 text-red-600">
                                  <XCircle className="w-3.5 h-3.5" /> فسخ
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {(c.status === 'COMPLETED' || c.status === 'SUSPENDED' || c.status === 'TERMINATED') && (
                          <button
                            onClick={() => handleStatusChange(c, 'reactivate')}
                            disabled={statusChanging}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                            title="بازگشت به فعال"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        <AdminDeleteButton
                          endpoint="/project-contracts"
                          id={c.id}
                          itemLabel={c.code || c.description || ''}
                          onSuccess={loadData}
                          size="sm"
                        />
                        <button
                          onClick={() => setDeletingContract(c)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="حذف (به سطل زباله)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors"
                          title="چاپ قرارداد"
                          onClick={() => toast.info('قابلیت چاپ در مرحله بعد اضافه می‌شود')}
                        >
                          <Printer className="w-4 h-4" />
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

      <ConfirmDialog
        isOpen={!!deletingContract}
        title="حذف قرارداد"
        message={`آیا از حذف قرارداد «${deletingContract?.code}» اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingContract(null)}
      />
    </div>
  );
}
