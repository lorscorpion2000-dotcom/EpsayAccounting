import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, Plus, Play, Ban, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesContract } from '../services/sales.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';
import PaymentFormModal from '../components/PaymentFormModal';
import CancelDialog from '@/modules/contracts/components/CancelDialog';

export default function SalesContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SalesContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await salesApi.contracts.get(id)); }
    catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleActivate = async () => {
    if (!id) return;
    try { await salesApi.contracts.activate(id); toast.success('فعال شد'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await salesApi.contracts.cancel(id, reason);
      toast.success('ابطال شد'); setCancelling(false); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">قرارداد پیدا نشد</div>;

  const totalPaid = (data.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(data.finalPrice) - totalPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/sales/contracts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{data.customer?.fullName}</h1>
            <p className="text-sm text-slate-500 num" dir="ltr">{data.code} — واحد {data.unit?.unitNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton contentRef={printRef} documentTitle={'قرارداد فروش ' + data.code} />
          {data.status === 'DRAFT' && (
            <button onClick={handleActivate} className="btn-primary"><Play className="w-4 h-4" /> فعال</button>
          )}
          {data.status === 'ACTIVE' && (
            <button onClick={() => setShowPay(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> پرداخت
            </button>
          )}
          {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (
            <button onClick={() => setCancelling(true)} className="btn-danger"><Ban className="w-4 h-4" /> ابطال</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">مبلغ نهایی</div>
          <div className="text-xl font-bold num" dir="ltr">{formatNumber(Number(data.finalPrice))}</div>
          <div className="text-xs text-slate-500">ریال</div>
        </div>
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-emerald-700 mb-1">پرداخت‌شده</div>
          <div className="text-xl font-bold num text-emerald-700" dir="ltr">{formatNumber(totalPaid)}</div>
        </div>
        <div className={clsx('card p-4', remaining > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200')}>
          <div className={clsx('text-xs mb-1', remaining > 0 ? 'text-amber-700' : 'text-emerald-700')}>باقیمانده</div>
          <div className={clsx('text-xl font-bold num', remaining > 0 ? 'text-amber-700' : 'text-emerald-700')} dir="ltr">
            {formatNumber(remaining)}
          </div>
        </div>
      </div>

      <div ref={printRef} className="card p-8 bg-white">
        <PrintHeader title={'قرارداد فروش واحد ' + data.unit?.unitNumber}
          subtitle={data.unit?.project?.name || ''} />

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <div className="text-slate-500">مشتری:</div>
            <div className="font-bold">{data.customer?.fullName}</div>
            {data.customer?.nationalId && <div className="text-xs num" dir="ltr">کد ملی: {data.customer.nationalId}</div>}
          </div>
          <div>
            <div className="text-slate-500">واحد:</div>
            <div className="font-bold">واحد {data.unit?.unitNumber}{data.unit?.block ? ' / بلوک ' + data.unit.block : ''}</div>
          </div>
          <div>
            <div className="text-slate-500">تاریخ قرارداد:</div>
            <div className="num">{formatJalaliDate(data.contractDate)}</div>
          </div>
          {data.deliveryDate && (
            <div>
              <div className="text-slate-500">تاریخ تحویل:</div>
              <div className="num">{formatJalaliDate(data.deliveryDate)}</div>
            </div>
          )}
        </div>

        {(data.installments || []).length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-3">اقساط</div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2 w-12">#</th>
                  <th className="border p-2 w-32">سررسید</th>
                  <th className="border p-2 text-left">مبلغ</th>
                  <th className="border p-2 text-left">پرداخت‌شده</th>
                  <th className="border p-2 w-24">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {(data.installments || []).map((it) => (
                  <tr key={it.id} className={it.status === 'PAID' ? 'bg-emerald-50/40' : ''}>
                    <td className="border p-2 text-center num">{it.sequence}</td>
                    <td className="border p-2 text-center num">{formatJalaliDate(it.dueDate)}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.amount))}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.paidAmount))}</td>
                    <td className="border p-2 text-center text-xs">
                      {it.status === 'PAID' ? 'پرداخت‌شده' : it.status === 'PENDING' ? 'در انتظار' : it.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data.payments || []).length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-3">پرداخت‌های انجام‌شده</div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2 w-32">تاریخ</th>
                  <th className="border p-2 text-left">مبلغ</th>
                  <th className="border p-2">روش</th>
                  <th className="border p-2">مرجع</th>
                </tr>
              </thead>
              <tbody>
                {(data.payments || []).map((p) => (
                  <tr key={p.id}>
                    <td className="border p-2 text-center num">{formatJalaliDate(p.paidAt)}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(p.amount))}</td>
                    <td className="border p-2 text-center">{p.paymentMethod || '—'}</td>
                    <td className="border p-2 text-center num" dir="ltr">{p.referenceNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای شرکت</div>
            <div className="border-t border-slate-400 pt-2"></div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-8">امضای مشتری</div>
            <div className="border-t border-slate-400 pt-2">{data.customer?.fullName}</div>
          </div>
        </div>

        {data.status === 'CANCELLED' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="font-bold text-red-700 mb-1">این قرارداد ابطال شده است</div>
            <div className="text-sm text-red-600">{data.cancellationReason}</div>
          </div>
        )}
      </div>

      <PaymentFormModal isOpen={showPay} contractId={data.id}
        remaining={remaining} onClose={() => setShowPay(false)} onSaved={load} />

      <CancelDialog isOpen={cancelling} title="ابطال قرارداد فروش"
        message="دلیل ابطال را وارد کنید. واحد آزاد خواهد شد." loading={actionLoading}
        onConfirm={handleCancel} onCancel={() => setCancelling(false)} />
    </div>
  );
}
