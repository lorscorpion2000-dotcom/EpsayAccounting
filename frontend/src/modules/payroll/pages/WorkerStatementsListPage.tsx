import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Loader2, Users, RefreshCw, Eye, Edit, Send, CheckCircle2, DollarSign, Search, Archive } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغوشده',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function WorkerStatementsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [actionItem, setActionItem] = useState<{ item: any; action: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        (payrollApi as any).workerStatements.list({
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
      const ws = (payrollApi as any).workerStatements;
      const a = actionItem.action;
      if (a === 'delete') { await ws.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await ws.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await ws.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'pay') { await ws.pay(actionItem.item.id); toast.success('پرداخت شد'); }
      setActionItem(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const filtered = search
    ? items.filter((s) =>
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.partner?.name?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            صورت‌وضعیت پرسنل
          </h1>
          <p className="text-sm text-slate-500 mt-1">محاسبه‌ی حقوق پرسنل از حضور و غیاب + قرارداد کارگری</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/payroll/worker-statements/new')}>
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
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ صورت‌وضعیتی ثبت نشده</p>
            <button className="btn-primary" onClick={() => navigate('/payroll/worker-statements/new')}>
              <Plus className="w-4 h-4" /> اولین صورت‌وضعیت
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پرسنل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">دوره</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">ناخالص</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">خالص</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{s.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.partner?.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 num">
                      {formatJalaliDate(s.periodStart)}<br/>
                      <span className="text-slate-400">تا</span> {formatJalaliDate(s.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-left num" dir="ltr">{formatNumber(Number(s.totalEarnings))}</td>
                    <td className="px-4 py-3 text-left num font-bold text-emerald-700" dir="ltr">{formatNumber(Number(s.netPayable))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[s.status])}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/payroll/worker-statements"
                          id={s.id}
                          itemLabel={(s as any).code || (s as any).name || (s as any).title || (s as any).fullName || (s as any).username || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => navigate('/payroll/worker-statements/' + s.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.status === 'DRAFT' && (
                          <>
                            <button onClick={() => navigate('/payroll/worker-statements/' + s.id + '/edit')} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: s, action: 'submit' })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: s, action: 'delete' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Archive className="w-4 h-4" />
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
        title="تایید عملیات"
        message="آیا مطمئن هستید؟"
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
