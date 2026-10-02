import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, FileText, RefreshCw, Eye, Edit, Trash2,
  Send, CheckCircle2, DollarSign, Search, FileSpreadsheet,
} from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import { api } from '@/services/api';
import type { SubcontractorStatement, StatementStatus } from '@/types/payroll';
import { STATEMENT_STATUS_LABELS, STATEMENT_STATUS_COLORS } from '@/types/payroll';
import type { Project } from '@/types/project';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
export default function StatementsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SubcontractorStatement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: SubcontractorStatement; action: 'delete' | 'submit' | 'approve' | 'pay' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        payrollApi.statements.list({
          status: statusFilter || undefined,
          projectId: projectFilter || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, projectFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await payrollApi.statements.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') {
        await payrollApi.statements.submit(actionItem.item.id);
        toast.success('به کارتابل ارسال شد');
        setActionItem(null);
        setTimeout(() => navigate('/approvals'), 500);
        return;
      }
      else if (a === 'approve') { await payrollApi.statements.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'pay') { await payrollApi.statements.pay(actionItem.item.id); toast.success('پرداخت شد'); }
      setActionItem(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) return;
    const rows = items.map((s, i) => ({
      'ردیف': i + 1,
      'کد': s.code,
      'پروژه': s.project?.name || '',
      'پیمانکار': s.contractor?.name || '',
      'شماره صورت‌وضعیت': s.statementNumber,
      'از تاریخ': new Date(s.periodStart).toLocaleDateString('fa-IR'),
      'تا تاریخ': new Date(s.periodEnd).toLocaleDateString('fa-IR'),
      'مبلغ کل': Number(s.totalAmount),
      'جمع کسورات': Number(s.totalDeduction),
      'خالص پرداختی': Number(s.netPayable),
      'وضعیت': STATEMENT_STATUS_LABELS[s.status],
    }));
    void exportToExcel({
      filename: 'Statements-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'Statements',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((s) =>
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.contractor?.name?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" /> صورت‌وضعیت پیمانکاران
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت صورت‌وضعیت پیمانکاران جزء</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => navigate('/payroll/subcontractor-statements/new')}>
            <Plus className="w-4 h-4" /> صورت‌وضعیت جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATEMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ صورت‌وضعیتی ثبت نشده</p>
            <button className="btn-primary" onClick={() => navigate('/payroll/subcontractor-statements/new')}>
              <Plus className="w-4 h-4" /> اولین صورت‌وضعیت
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-20">شماره</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پیمانکار</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">دوره</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">مبلغ کل</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-36">خالص</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{s.code}</span></td>
                    <td className="px-4 py-3 text-center num font-bold text-brand-700">{toPersianDigits(s.statementNumber)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.contractor?.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.project?.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 num">
                      {formatJalaliDate(s.periodStart)}<br/>
                      <span className="text-slate-400">تا</span> {formatJalaliDate(s.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-left num font-medium" dir="ltr">{formatNumber(Number(s.totalAmount))}</td>
                    <td className="px-4 py-3 text-left num font-bold text-emerald-700" dir="ltr">{formatNumber(Number(s.netPayable))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATEMENT_STATUS_COLORS[s.status])}>
                        {STATEMENT_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate('/payroll/subcontractor-statements/' + s.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.status === 'DRAFT' && (
                          <>
                            <button onClick={() => navigate('/payroll/subcontractor-statements/' + s.id + '/edit')} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: s, action: 'submit' })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: s, action: 'delete' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {s.status === 'SUBMITTED' && (
                          <button onClick={() => setActionItem({ item: s, action: 'approve' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {s.status === 'APPROVED' && (
                          <button onClick={() => setActionItem({ item: s, action: 'pay' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="پرداخت">
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
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
        isOpen={!!actionItem}
        title={
          actionItem?.action === 'delete' ? 'حذف صورت‌وضعیت' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' :
          actionItem?.action === 'approve' ? 'تایید صورت‌وضعیت' :
          'ثبت پرداخت'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'به کارتابل مدیر ارسال می‌شود.' :
          actionItem?.action === 'approve' ? 'آیا تایید می‌شود؟' :
          'آیا پرداخت ثبت می‌شود؟'
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
