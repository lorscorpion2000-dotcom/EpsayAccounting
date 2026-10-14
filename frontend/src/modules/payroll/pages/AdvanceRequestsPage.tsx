import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Wallet, RefreshCw, CheckCircle2, XCircle, DollarSign, Archive } from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { AdvanceRequest, Employee } from '@/types/payroll';
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '@/types/payroll';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import AdvanceFormModal from '../components/AdvanceFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function AdvanceRequestsPage() {
  const [items, setItems] = useState<AdvanceRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionItem, setActionItem] = useState<{ item: AdvanceRequest; action: 'approve' | 'reject' | 'delete' | 'pay' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        payrollApi.advanceRequests.list(),
        payrollApi.employees.list({ active: true }).catch(() => []),
      ]);
      setItems(data); setEmployees(emps);
    } catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'approve') await payrollApi.advanceRequests.approve(actionItem.item.id);
      else if (actionItem.action === 'pay') await payrollApi.advanceRequests.pay(actionItem.item.id);
      else if (actionItem.action === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await payrollApi.advanceRequests.reject(actionItem.item.id, reason);
      }
      else await payrollApi.advanceRequests.remove(actionItem.item.id);
      toast.success('انجام شد');
      setActionItem(null); setReason(''); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" /> درخواست‌های مساعده
          </h1>
          <p className="text-sm text-slate-500 mt-1">مساعده پرسنل از محل حقوق</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> درخواست جدید
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ درخواستی ثبت نشده</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین درخواست
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پرسنل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">دلیل</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{a.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.employee?.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(a.requestDate)}</span></td>
                    <td className="px-4 py-3 text-left num font-bold text-emerald-700" dir="ltr">{formatNumber(Number(a.amount))}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-xs">{a.reason || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', REQUEST_STATUS_COLORS[a.status])}>
                        {REQUEST_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/payroll/advance-requests"
                          id={a.id}
                          itemLabel={(a as any).code || (a as any).name || (a as any).title || (a as any).fullName || (a as any).username || ''}
                          onSuccess={load}
                        />
                        {a.status === 'PENDING' && (
                          <>
                            <button onClick={() => setActionItem({ item: a, action: 'approve' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: a, action: 'reject' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: a, action: 'delete' })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {a.status === 'APPROVED' && (
                          <button onClick={() => setActionItem({ item: a, action: 'pay' })} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="پرداخت">
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

      <AdvanceFormModal isOpen={showModal} employees={employees}
        onClose={() => setShowModal(false)} onSaved={load} />

      <ConfirmDialog isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'approve' ? 'تایید مساعده' :
          actionItem?.action === 'pay' ? 'ثبت پرداخت' :
          'حذف درخواست'
        }
        message="آیا از انجام این عملیات اطمینان دارید؟"
        confirmLabel="بله" variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading} onConfirm={handleAction} onCancel={() => setActionItem(null)} />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد مساعده</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
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
