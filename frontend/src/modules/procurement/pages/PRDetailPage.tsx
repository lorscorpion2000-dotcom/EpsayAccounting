import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, ShoppingCart, FileText, Plus, Send,
  CheckCircle2, XCircle, Printer, User, Calendar, Hash,
  TrendingDown, Layers, Eye,
} from 'lucide-react';
import clsx from 'clsx';
import { procurementApi } from '../services/procurement.api';

import type { PurchaseRequest } from '@/types/procurement';
import {
  PR_STATUS_LABELS, PR_STATUS_COLORS, PR_PRIORITY_LABELS,
  PR_PRIORITY_COLORS, PR_UNIT_LABELS,
} from '@/types/procurement';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function PRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pr, setPr] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await procurementApi.pr.get(id);
      setPr(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleAction = async () => {
    if (!actionItem || !pr) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'submit') {
        await procurementApi.pr.submit(pr.id);
        toast.success('درخواست به کارتابل مدیر ارسال شد');
        setActionItem(null);
        navigate('/approvals');
        return;
      }
      else if (actionItem.action === 'approve') await procurementApi.pr.approve(pr.id);
      else {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await procurementApi.pr.reject(pr.id, reason);
      }
      toast.success('انجام شد');
      setActionItem(null);
      setReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>;
  if (!pr) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/procurement/requests')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> درخواست‌های خرید
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{pr.code}</span>
      </div>

      {/* Print header */}
      <div className="print-only">
        <div className="text-center mb-6 pb-3 border-b-2 border-brand-600">
          <h1 className="text-xl font-bold">استودیو معماری اپسای</h1>
          <h2 className="text-lg mt-1">فرم درخواست خرید</h2>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{pr.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', PR_STATUS_COLORS[pr.status])}>
                  {PR_STATUS_LABELS[pr.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{pr.project?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num">تاریخ: {formatJalaliDate(pr.requestDate)}</span>
                {pr.requiredDate && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="num">نیاز: {formatJalaliDate(pr.requiredDate)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> چاپ
            </button>
            <AdminDeleteButton endpoint="/procurement/requests" id={pr.id} itemLabel={(pr as any).code} onSuccess={() => navigate('/procurement/requests')} variant="button" />
            {pr.status === 'DRAFT' && (
              <>
                <button className="btn-secondary" onClick={() => navigate('/procurement/requests/' + pr.id + '/edit')}>
                  ویرایش
                </button>
                <button className="btn-primary" onClick={() => setActionItem({ action: 'submit' })}>
                  <Send className="w-4 h-4" /> ارسال به کارتابل
                </button>
              </>
            )}
            {pr.status === 'SUBMITTED' && (
              <>
                <button className="btn-danger" onClick={() => setActionItem({ action: 'reject' })}>
                  <XCircle className="w-4 h-4" /> رد
                </button>
                <button className="btn-primary" onClick={() => setActionItem({ action: 'approve' })}>
                  <CheckCircle2 className="w-4 h-4" /> تایید
                </button>
              </>
            )}
            {pr.status === 'APPROVED' && (
              <button
                className="btn-primary"
                onClick={() => navigate('/procurement/rfqs/new?prId=' + pr.id)}
              >
                <Plus className="w-4 h-4" /> ثبت استعلام
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <InfoBox icon={User} label="درخواست‌کننده" value={pr.requester?.fullName || '—'} />
          <InfoBox icon={Layers} label="ردیف WBS" value={pr.wbsItem ? `${pr.wbsItem.code} - ${pr.wbsItem.title}` : '—'} />
          <InfoBox icon={Hash} label="واحد درخواست‌کننده" value={pr.department || '—'} />
          <InfoBox icon={FileText} label="محل تحویل" value={pr.deliveryLocation || '—'} />
          <InfoBox icon={Calendar} label="تاریخ ثبت" value={formatJalaliDate(pr.createdAt)} />
          <InfoBox icon={FileText} label="تعداد اقلام" value={toPersianDigits(pr.items?.length || 0)} />
        </div>

        {pr.reason && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">دلیل خرید</div>
            <div className="text-sm text-slate-800">{pr.reason}</div>
          </div>
        )}

        {pr.rejectedReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-xs text-red-600 mb-1">دلیل رد</div>
            <div className="text-sm text-red-800">{pr.rejectedReason}</div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">اقلام درخواستی</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-12">#</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">شرح کالا/خدمت</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">مقدار</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">واحد</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">اولویت</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pr.items?.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 text-center text-slate-500 num">{toPersianDigits(it.rowNumber)}</td>
                  <td className="px-4 py-3 text-slate-800">{it.description}</td>
                  <td className="px-4 py-3"><span className="num">{toPersianDigits(it.quantity)}</span></td>
                  <td className="px-4 py-3 text-xs">{PR_UNIT_LABELS[it.unit]}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', PR_PRIORITY_COLORS[it.priority])}>
                      {PR_PRIORITY_LABELS[it.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{it.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RFQs */}
      {pr.rfqs && pr.rfqs.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-600" />
              استعلام‌های انجام‌شده
            </h2>
          </div>
          <div className="space-y-2">
            {pr.rfqs.map((rfq: any) => (
              <div
                key={rfq.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
                onClick={() => navigate('/procurement/rfqs/' + rfq.id)}
              >
                <div>
                  <span className="num font-bold text-brand-700 font-mono me-3" dir="ltr">{rfq.code}</span>
                  <span className="text-xs text-slate-500">
                    {rfq._count?.responses || 0} پاسخ
                  </span>
                </div>
                <Eye className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action === 'submit'}
        title="ارسال به کارتابل"
        message="پس از ارسال، امکان ویرایش وجود ندارد. ادامه؟"
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action === 'approve'}
        title="تایید درخواست"
        message="آیا درخواست تایید می‌شود؟"
        confirmLabel="بله، تایید"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem && actionItem.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد درخواست</h3>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4"
              placeholder="دلیل رد..."
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">
                {actionLoading ? '...' : 'رد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-medium text-slate-800 truncate num">{value}</div>
      </div>
    </div>
  );
}
