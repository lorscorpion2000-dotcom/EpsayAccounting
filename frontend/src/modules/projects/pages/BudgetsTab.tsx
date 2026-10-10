import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, DollarSign, Lock, Unlock, Edit, Trash2,
  FileSpreadsheet, RefreshCw, TrendingUp, AlertTriangle, BarChart3,
} from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import type { Project, ProjectBudget, WbsItem } from '@/types/project';
import { formatNumber, toPersianDigits, formatJalaliDate } from '@/utils/format';
import BudgetFormModal from '../components/BudgetFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function BudgetsTab() {
  const { project } = useOutletContext<{ project: Project }>();
  const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ProjectBudget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<ProjectBudget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wbsTotal, setWbsTotal] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, wbsTree] = await Promise.all([
        projectsApi.budgets.list(project.id),
        projectsApi.wbs.tree(project.id).catch(() => []),
      ]);
      setBudgets(budgetsData);
      setWbsTotal(sumWbs(wbsTree));
    } catch {
      toast.error('خطا در بارگذاری بودجه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const handleAdd = () => {
    setEditingBudget(null);
    setModalOpen(true);
  };

  const handleEdit = (b: ProjectBudget) => {
    setEditingBudget(b);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    setDeleting(true);
    try {
      await projectsApi.budgets.remove(deletingBudget.id);
      toast.success('ردیف بودجه حذف شد');
      setDeletingBudget(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (budgets.length === 0) {
      toast.info('هیچ داده‌ای برای خروجی وجود ندارد');
      return;
    }
    const rows = budgets.map((b, i) => ({
      'ردیف': i + 1,
      'ردیف WBS': b.wbsItem ? `${b.wbsItem.code} - ${b.wbsItem.title}` : 'بودجه کل پروژه',
      'مبلغ بودجه (ریال)': Number(b.amount),
      'تاریخ تصویب': b.approvedAt ? new Date(b.approvedAt).toLocaleDateString('fa-IR') : '',
      'وضعیت': b.isLocked ? 'قفل‌شده' : 'آزاد',
      'توضیحات': b.description || '',
    }));
    void exportToExcel({
      filename: `Budgets-${project.code}-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'Budgets',
        rows,
        cols: [
      { wch: 8 }, { wch: 45 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
    ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const lockedCount = budgets.filter((b) => b.isLocked).length;
  const freeCount = budgets.length - lockedCount;
  const difference = totalBudget - wbsTotal;
  const overBudget = difference > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            بودجه‌بندی مصوب
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تخصیص سقف بودجه مجاز به ردیف‌های WBS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={loadData} title="بارگذاری مجدد">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button className="btn-primary" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
            ردیف جدید
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <div className="text-xs text-slate-600">مجموع بودجه مصوب</div>
            </div>
            <div className="text-xl font-bold text-emerald-700 num">
              {formatNumber(totalBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-1">ریال</div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              <div className="text-xs text-slate-600">جمع مبالغ WBS</div>
            </div>
            <div className="text-xl font-bold text-slate-800 num">
              {formatNumber(wbsTotal)}
            </div>
            <div className="text-xs text-slate-500 mt-1">ریال</div>
          </div>

          <div className={`card p-4 ${overBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {overBudget ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <BarChart3 className="w-4 h-4 text-blue-600" />
              )}
              <div className="text-xs text-slate-600">
                {overBudget ? 'مازاد بودجه' : 'کسری بودجه'}
              </div>
            </div>
            <div className={`text-xl font-bold num ${overBudget ? 'text-red-700' : 'text-blue-700'}`}>
              {formatNumber(Math.abs(difference))}
            </div>
            <div className="text-xs text-slate-500 mt-1">ریال</div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-600" />
              <div className="text-xs text-slate-600">قفل‌شده / آزاد</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-600 num">
                {toPersianDigits(lockedCount)}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-xl font-bold text-emerald-600 num">
                {toPersianDigits(freeCount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : budgets.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ ردیف بودجه‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              ثبت اولین ردیف
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-16">ردیف</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">ردیف WBS</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-48">مبلغ بودجه (ریال)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">تاریخ تصویب</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgets.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center num text-slate-500">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="px-4 py-3">
                      {b.wbsItem ? (
                        <div className="flex items-center gap-2">
                          <span className="num text-xs text-slate-500 font-mono" dir="ltr">
                            {b.wbsItem.code}
                          </span>
                          <span className="text-slate-700">{b.wbsItem.title}</span>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-700">
                          بودجه کل پروژه
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-medium text-slate-800" dir="ltr">
                        {formatNumber(Number(b.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-600">
                        {formatJalaliDate(b.approvedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                          <Lock className="w-3 h-3" />
                          قفل‌شده
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          <Unlock className="w-3 h-3" />
                          آزاد
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                          title="ویرایش"
                          disabled={b.isLocked}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingBudget(b)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={b.isLocked ? 'ابتدا قفل را باز کنید' : 'حذف'}
                          disabled={b.isLocked}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-700">
                    مجموع کل
                  </td>
                  <td className="px-4 py-3 text-left">
                    <span className="num font-bold text-slate-800" dir="ltr">
                      {formatNumber(totalBudget)}
                    </span>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <BudgetFormModal
        isOpen={modalOpen}
        projectId={project.id}
        editingBudget={editingBudget}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        isOpen={!!deletingBudget}
        title="حذف ردیف بودجه"
        message={
          deletingBudget?.wbsItem
            ? `آیا از حذف بودجه «${deletingBudget.wbsItem.code} - ${deletingBudget.wbsItem.title}» اطمینان دارید؟`
            : 'آیا از حذف «بودجه کل پروژه» اطمینان دارید؟'
        }
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingBudget(null)}
      />
    </div>
  );
}

// ============ Helper ============
function sumWbs(items: WbsItem[]): number {
  let sum = 0;
  items.forEach((item) => {
    sum += Number(item.totalPrice || 0);
    if (item.children?.length) sum += sumWbs(item.children);
  });
  return sum;
}
