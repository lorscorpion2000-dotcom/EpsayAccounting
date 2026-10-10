import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Printer, ShoppingBag, CheckCircle2, Send, XCircle,
  FileText, User, Calendar, Hash, CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { procurementApi } from '../services/procurement.api';
import type { PurchaseOrder, POStatus } from '@/types/procurement';
import { PO_STATUS_LABELS, PO_STATUS_COLORS, PR_UNIT_LABELS } from '@/types/procurement';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'approve' | 'send' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await procurementApi.po.get(id);
      setPo(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleAction = async () => {
    if (!actionItem || !po) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'approve') await procurementApi.po.approve(po.id);
      else if (actionItem.action === 'send') await procurementApi.po.send(po.id);
      toast.success('انجام شد');
      setActionItem(null);
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
  if (!po) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/procurement/orders')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> دستورات خرید
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{po.code}</span>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-end gap-2 no-print">
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> چاپ / PDF
        </button>
        <AdminDeleteButton endpoint="/procurement/orders" id={po.id} itemLabel={(po as any).code} onSuccess={() => navigate('/procurement/orders')} variant="button" />
        {po.status === 'DRAFT' && (
          <button className="btn-primary" onClick={() => setActionItem({ action: 'approve' })}>
            <CheckCircle2 className="w-4 h-4" /> تایید
          </button>
        )}
        {po.status === 'APPROVED' && (
          <button className="btn-primary" onClick={() => setActionItem({ action: 'send' })}>
            <Send className="w-4 h-4" /> ارسال به کارپرداز
          </button>
        )}
      </div>

      {/* Document */}
      <div className="bg-white border border-slate-200 rounded-lg p-8" id="po-print">
        {/* Print Header */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-brand-600 mb-6">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="لوگو" className="w-16 h-16 object-contain" />
            <div>
              <div className="font-bold text-lg text-slate-800">حسابداری اپسای</div>
              <div className="text-xs text-slate-500">استودیو معماری اپسای</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-slate-500 mb-1">تاریخ چاپ</div>
            <div className="num font-bold text-slate-800">
              {formatJalaliDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-brand-700 mb-2">دستور خرید</h1>
        <p className="text-center text-sm text-slate-500 mb-6">Purchase Order</p>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">کد دستور:</span>
              <span className="num font-bold text-slate-800">{po.code}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">تاریخ صدور:</span>
              <span className="num font-medium">{formatJalaliDate(po.poDate)}</span>
            </div>
            {po.deliveryDate && (
              <div className="flex gap-2">
                <span className="text-slate-500 w-24">تاریخ تحویل:</span>
                <span className="num font-medium">{formatJalaliDate(po.deliveryDate)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">پروژه:</span>
              <span className="font-medium">{po.project?.name}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">تأمین‌کننده:</span>
              <span className="font-bold text-slate-800">{po.supplier?.name}</span>
            </div>
            {po.supplier?.phone && (
              <div className="flex gap-2">
                <span className="text-slate-500 w-24">تلفن:</span>
                <span className="num">{po.supplier.phone}</span>
              </div>
            )}
            {po.supplier?.address && (
              <div className="flex gap-2">
                <span className="text-slate-500 w-24">آدرس:</span>
                <span className="text-xs">{po.supplier.address}</span>
              </div>
            )}
            {po.pr && (
              <div className="flex gap-2">
                <span className="text-slate-500 w-24">مرجع PR:</span>
                <span className="num">{po.pr.code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="border border-brand-700 px-2 py-2 text-center w-10">#</th>
              <th className="border border-brand-700 px-2 py-2 text-right">شرح کالا / خدمات</th>
              <th className="border border-brand-700 px-2 py-2 text-center w-20">مقدار</th>
              <th className="border border-brand-700 px-2 py-2 text-center w-20">واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-left w-32">قیمت واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-left w-32">مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it) => (
              <tr key={it.id}>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(it.rowNumber)}</td>
                <td className="border border-slate-300 px-2 py-2">{it.description}</td>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(it.quantity)}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{PR_UNIT_LABELS[it.unit]}</td>
                <td className="border border-slate-300 px-2 py-2 text-left num">{formatNumber(Number(it.unitPrice))}</td>
                <td className="border border-slate-300 px-2 py-2 text-left num">{formatNumber(Number(it.totalPrice))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100">
              <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right font-medium">جمع اقلام</td>
              <td className="border border-slate-300 px-2 py-2 text-left num font-medium" dir="ltr">{formatNumber(Number(po?.subtotal || 0))}</td>
            </tr>
            <tr className="bg-slate-100">
              <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right font-medium">
                مالیات ({toPersianDigits(po?.taxPercent || 0)}٪)
              </td>
              <td className="border border-slate-300 px-2 py-2 text-left num font-medium" dir="ltr">{formatNumber(Number(po?.taxAmount || 0))}</td>
            </tr>
            <tr className="bg-brand-50">
              <td colSpan={5} className="border border-brand-300 px-2 py-3 text-right font-bold text-brand-700">مبلغ نهایی</td>
              <td className="border border-brand-300 px-2 py-3 text-left num font-bold text-brand-700 text-base" dir="ltr">
                {formatNumber(Number(po?.totalAmount || 0))} ریال
              </td>
            </tr>
          </tfoot>
        </table>

        {po.notes && (
          <div className="p-3 bg-slate-50 rounded-lg mb-6">
            <div className="text-xs text-slate-500 mb-1">توضیحات</div>
            <div className="text-sm">{po.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-4 mt-12 pt-6 border-t border-slate-200 text-xs">
          <div className="text-center">
            <div className="text-slate-500 mb-8">تهیه‌کننده</div>
            <div className="border-t border-slate-300 pt-1">امضاء</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 mb-8">مدیر فنی</div>
            <div className="border-t border-slate-300 pt-1">امضاء</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500 mb-8">مدیر پروژه</div>
            <div className="border-t border-slate-300 pt-1">امضاء</div>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
          <span>وضعیت: {PO_STATUS_LABELS[po.status]}</span>
          <span>سیستم حسابداری اپسای</span>
        </div>
      </div>

      {/* Confirm */}
      <ConfirmDialog
        isOpen={!!actionItem}
        title={actionItem?.action === 'approve' ? 'تایید دستور خرید' : 'ارسال دستور خرید'}
        message={
          actionItem?.action === 'approve'
            ? 'آیا این دستور خرید تایید می‌شود؟'
            : 'آیا دستور خرید برای کارپرداز ارسال می‌شود؟ (در نبود کارپرداز به تنخواه‌گردان)'
        }
        confirmLabel="بله"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
