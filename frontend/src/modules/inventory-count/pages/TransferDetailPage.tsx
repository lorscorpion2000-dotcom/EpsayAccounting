import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, ArrowRightLeft, Send, CheckCircle2, XCircle, Edit, Package, Truck } from 'lucide-react';
import clsx from 'clsx';
import { warehouseTransferApi } from '../services/inventory-count.api';
import type { WarehouseTransfer } from '@/types/inventory-count';
import {
  TRANSFER_STATUS_LABELS, TRANSFER_STATUS_COLORS,
} from '@/types/inventory-count';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import SignatureBlock from '@/components/SignatureBlock';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<WarehouseTransfer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await warehouseTransferApi.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = async () => {
    if (!id) return;
    if (!confirm('ارسال شود؟ موجودی از انبار مبدأ کسر می‌شود.')) return;
    try { await warehouseTransferApi.send(id); toast.success('ارسال شد'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  const handleReceive = async () => {
    if (!id) return;
    if (!confirm('دریافت شود؟ موجودی به انبار مقصد اضافه می‌شود.')) return;
    try { await warehouseTransferApi.receive(id); toast.success('دریافت شد'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('لغو شود؟ در صورت در راه بودن، به مبدأ برگردانده می‌شود.')) return;
    try { await warehouseTransferApi.cancel(id); toast.success('لغو شد'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!data) return null;

  const totalQty = (data.items || []).reduce((s, it) => s + Number(it.quantity), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/warehouse-transfers')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> انتقالات
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{data.code}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <ArrowRightLeft className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{data.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', TRANSFER_STATUS_COLORS[data.status])}>
                  {TRANSFER_STATUS_LABELS[data.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{data.fromWarehouse?.name}</span>
                <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                <span>{data.toWarehouse?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(data.transferDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <PagePrintButton documentTitle="انتقال انبار" />
            {data.status === 'DRAFT' && (
              <>
                <button className="btn-secondary" onClick={() => navigate('/warehouse-transfers/' + data.id + '/edit')}>
                  <Edit className="w-4 h-4" /> ویرایش
                </button>
                <button className="btn-primary" onClick={handleSend}>
                  <Send className="w-4 h-4" /> ارسال
                </button>
              </>
            )}
            {data.status === 'IN_TRANSIT' && (
              <button className="btn-primary" onClick={handleReceive}>
                <CheckCircle2 className="w-4 h-4" /> دریافت
              </button>
            )}
            {['DRAFT', 'IN_TRANSIT'].includes(data.status) && (
              <button className="btn-secondary" onClick={handleCancel}>
                <XCircle className="w-4 h-4" /> لغو
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">تعداد اقلام</div>
            <div className="text-xl font-bold num">{toPersianDigits(data.items?.length || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">جمع مقدار</div>
            <div className="text-xl font-bold num">{toPersianDigits(totalQty.toFixed(2))}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">ارزش کل</div>
            <div className="text-xl font-bold num text-brand-700">
              {toPersianDigits(Math.round(Number(data.totalValue)).toLocaleString())} ریال
            </div>
          </div>
        </div>

        {(data.driverName || data.vehiclePlate) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-sm text-slate-600">
            <Truck className="w-4 h-4" />
            {data.driverName && <span>راننده: {data.driverName}</span>}
            {data.vehiclePlate && <span className="num" dir="ltr">پلاک: {data.vehiclePlate}</span>}
          </div>
        )}

        {data.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-700">
            <span className="font-bold">توضیحات: </span>{data.notes}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-slate-800">اقلام انتقالی</h2>
        </div>
        {(data.items || []).length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            هیچ کالایی ثبت نشده است
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 w-10">#</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">کالا</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">واحد</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">مقدار</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-28">بهای واحد</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">جمع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items!.map((it, i) => (
                  <tr key={it.id || i}>
                    <td className="px-3 py-3 text-center text-slate-400 num text-xs">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-3">
                      <span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">{it.item?.code}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-800 text-xs">{it.item?.name}</td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500">{it.item?.unit}</td>
                    <td className="px-3 py-3 text-center num font-bold">{toPersianDigits(Number(it.quantity).toFixed(2))}</td>
                    <td className="px-3 py-3 text-left num text-xs">{toPersianDigits(Math.round(Number(it.unitCost)).toLocaleString())}</td>
                    <td className="px-3 py-3 text-left num text-xs font-bold">{toPersianDigits(Math.round(Number(it.totalCost)).toLocaleString())}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right font-bold text-slate-700">جمع کل:</td>
                  <td className="px-3 py-3 text-left num font-bold text-brand-700">
                    {toPersianDigits(Math.round(Number(data.totalValue)).toLocaleString())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Guide */}
      {data.status === 'DRAFT' && (
        <div className="card p-4 border-s-4 border-s-amber-400 bg-amber-50/40">
          <div className="text-sm text-amber-900">
            <div className="font-bold mb-1">راهنمای گردش کار</div>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>پیش‌نویس:</strong> قابل ویرایش اقلام و مقادیر.</li>
              <li><strong>ارسال:</strong> موجودی از انبار مبدأ کسر می‌شود، وضعیت «در راه».</li>
              <li><strong>دریافت:</strong> موجودی به انبار مقصد اضافه می‌شود.</li>
              <li>در صورت لغو در حال «در راه»، موجودی به مبدأ برمی‌گردد.</li>
            </ul>
          </div>
        </div>
      )}

        <div className="card p-6 mt-6">
          <SignatureBlock slots={[
            { title: 'انباردار مبدأ', type: 'current-user', caption: 'نام و امضا' },
            { title: 'انباردار مقصد', type: 'empty', caption: 'نام و امضا' },
            { title: 'مهر شرکت', type: 'company-stamp', caption: 'مهر و امضا' },
          ]} />
        </div>
    </div>
  );
}
