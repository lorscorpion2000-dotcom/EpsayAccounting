import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, CheckSquare, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { timelineApi, PhaseChecklist, ChecklistType, ChecklistStatus } from '../services/timeline.api';
import { formatJalaliDate } from '@/utils/format';
import ChecklistFormModal from '../components/ChecklistFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const TYPE_LABELS: Record<ChecklistType, string> = {
  REBAR_BEFORE_CONCRETE: 'آرماتوربندی قبل از بتن‌ریزی',
  FORMWORK: 'قالب‌بندی', ELECTRICAL: 'تاسیسات برقی',
  PLUMBING: 'لوله‌کشی آب و فاضلاب', WATERPROOFING: 'ایزولاسیون و عایق‌کاری',
  OTHER: 'سایر',
};
const STATUS_LABELS: Record<ChecklistStatus, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده',
  APPROVED: 'تاییدشده', REJECTED: 'رد‌شده',
};
const STATUS_COLORS: Record<ChecklistStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export default function ChecklistsPage() {
  const [items, setItems] = useState<PhaseChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PhaseChecklist | null>(null);
  const [actionItem, setActionItem] = useState<{ item: PhaseChecklist; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.checklists.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await timelineApi.checklists.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await timelineApi.checklists.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await timelineApi.checklists.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await timelineApi.checklists.reject(actionItem.item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null); setReason(''); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => {
      const checked = c.items.filter((x) => x.isChecked).length;
      return {
        'ردیف': i + 1, 'کد': c.code, 'پروژه': c.project.name,
        'نوع': TYPE_LABELS[c.type], 'عنوان': c.title,
        'تاریخ': new Date(c.checklistDate).toLocaleDateString('fa-IR'),
        'تعداد آیتم': c.items.length,
        'تاییدشده': checked,
        'وضعیت': STATUS_LABELS[c.status],
        'بازرس': c.inspectorName || '',
        'ناظر': c.supervisorName || '',
      };
    });
    void exportToExcel({
      filename: 'Checklists-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Checklists',
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
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            چک‌لیست‌های پیش‌نیاز مهندسی
          </h1>
          <p className="text-sm text-slate-500 mt-1">تاییدیه‌های مهندسی قبل از شروع هر فاز اجرایی</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> چک‌لیست جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ چک‌لیستی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین چک‌لیست
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">آیتم‌ها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => {
                  const checked = c.items.filter((x) => x.isChecked).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[c.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{c.project.name}</td>
                      <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(c.checklistDate)}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className="num text-xs">
                          {checked}/{c.items.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[c.status])}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/timeline/checklists"
                          id={c.id}
                          itemLabel={(c as any).code || (c as any).name || (c as any).title || (c as any).fullName || (c as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
                            <>
                              <button onClick={() => { setEditing(c); setShowModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: c, action: 'submit' })}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                                <Send className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: c, action: 'delete' })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {c.status === 'SUBMITTED' && (
                            <>
                              <button onClick={() => setActionItem({ item: c, action: 'approve' })}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setActionItem({ item: c, action: 'reject' })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {c.status === 'APPROVED' && (
                            <span className="text-xs text-emerald-600 font-medium">تاییدشده</span>
                          )}
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

      <ChecklistFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف چک‌لیست' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید چک‌لیست'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'چک‌لیست به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، امکان ویرایش وجود ندارد. ادامه؟'
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد چک‌لیست</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
