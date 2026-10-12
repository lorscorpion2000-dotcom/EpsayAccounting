import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { warehouseApi } from '../services/warehouse.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await (warehouseApi.receipts as any).get(id);
      setData(r);
    } catch { toast.error('خطا در بارگذاری رسید'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">رسید پیدا نشد</div>;

  const items = data.items || [];

  // جمع‌ها: از دیتابیس اگر موجود، وگرنه از ردیف‌ها محاسبه کن
  const sum = (key: string) => items.reduce((s: number, it: any) => s + Number(it[key] || 0), 0);
  const subtotal       = Number(data.subtotal)       || sum('totalCost');
  const totalDiscount  = Number(data.totalDiscount)  || sum('discountAmount');
  const totalAddition  = Number(data.totalAddition)  || sum('additionAmount');
  const totalDeduction = Number(data.totalDeduction) || sum('deductionAmount');
  const totalTax       = Number(data.totalTax)       || sum('taxAmount');
  const totalShipping  = Number(data.totalShipping)  || sum('shippingCost');
  const totalLoading   = Number(data.totalLoading)   || sum('loadingCost');
  const grandTotal     = Number(data.grandTotal)     || sum('lineTotal');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/warehouse/receipts')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">رسید انبار</h1>
            <p className="text-sm text-slate-500 num" dir="ltr">{data.code}</p>
          </div>
        </div>
        <PrintButton contentRef={printRef} documentTitle={'رسید انبار ' + data.code} />
      </div>

      <div ref={printRef} className="card p-8 bg-white">
        <PrintHeader title="رسید انبار" subtitle={data.warehouse?.name || ''} />
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div><span className="text-slate-500">کد: </span><span className="num" dir="ltr">{data.code}</span></div>
          <div><span className="text-slate-500">تاریخ: </span><span className="num">{data.receiptDate ? formatJalaliDate(data.receiptDate) : '—'}</span></div>
          <div><span className="text-slate-500">انبار: </span>{data.warehouse?.name || '—'}</div>
          <div><span className="text-slate-500">پروژه: </span>{data.project?.name || '—'}</div>
          <div><span className="text-slate-500">تأمین‌کننده: </span>{data.supplier?.name || '—'}</div>
          <div><span className="text-slate-500">وضعیت: </span>{data.status}</div>
          {data.reference && <div><span className="text-slate-500">شماره فاکتور: </span><span className="num" dir="ltr">{data.reference}</span></div>}
          {data.driverName && <div><span className="text-slate-500">راننده: </span>{data.driverName}</div>}
          {data.vehiclePlate && <div><span className="text-slate-500">شماره ماشین: </span><span className="num" dir="ltr">{data.vehiclePlate}</span></div>}
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-2">اقلام</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border p-1.5 text-center w-8">#</th>
                    <th className="border p-1.5 text-right min-w-[140px]">کالا</th>
                    <th className="border p-1.5 text-center w-16">مقدار</th>
                    <th className="border p-1.5 text-left w-24">بهای واحد</th>
                    <th className="border p-1.5 text-left w-24">مبلغ پایه</th>
                    <th className="border p-1.5 text-left w-20">تخفیف</th>
                    <th className="border p-1.5 text-left w-20">اضافات</th>
                    <th className="border p-1.5 text-left w-20">کسورات</th>
                    <th className="border p-1.5 text-left w-20">مالیات</th>
                    <th className="border p-1.5 text-left w-20">حمل</th>
                    <th className="border p-1.5 text-left w-20">بارگیری</th>
                    <th className="border p-1.5 text-left w-24 bg-emerald-50">جمع ردیف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any, i: number) => (
                    <tr key={it.id || i}>
                      <td className="border p-1.5 text-center num">{i + 1}</td>
                      <td className="border p-1.5">{it.item?.name || it.description || '—'}</td>
                      <td className="border p-1.5 text-center num">{it.quantity}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.unitCost || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.totalCost || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.discountAmount || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.additionAmount || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.deductionAmount || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.taxAmount || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.shippingCost || 0))}</td>
                      <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(Number(it.loadingCost || 0))}</td>
                      <td className="border p-1.5 text-left num font-bold bg-emerald-50" dir="ltr">{formatNumber(Number(it.lineTotal || 0))}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border p-1.5 text-left">جمع کل (ریال)</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(subtotal)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalDiscount)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalAddition)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalDeduction)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalTax)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalShipping)}</td>
                    <td className="border p-1.5 text-left num" dir="ltr">{formatNumber(totalLoading)}</td>
                    <td className="border p-1.5 text-left num bg-emerald-100" dir="ltr">{formatNumber(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-md bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">جمع پایه:</span>
              <span className="num font-medium" dir="ltr">{formatNumber(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">تخفیف:</span>
              <span className="num font-medium text-rose-600" dir="ltr">− {formatNumber(totalDiscount)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">اضافات:</span>
              <span className="num font-medium text-blue-600" dir="ltr">+ {formatNumber(totalAddition)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">کسورات:</span>
              <span className="num font-medium text-rose-600" dir="ltr">− {formatNumber(totalDeduction)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">مالیات:</span>
              <span className="num font-medium text-amber-600" dir="ltr">+ {formatNumber(totalTax)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">هزینه حمل:</span>
              <span className="num font-medium" dir="ltr">+ {formatNumber(totalShipping)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-600">هزینه بارگیری:</span>
              <span className="num font-medium" dir="ltr">+ {formatNumber(totalLoading)}</span>
            </div>
            <div className="border-t border-emerald-300 mt-2 pt-2 flex justify-between font-bold text-emerald-800 text-lg">
              <span>جمع نهایی:</span>
              <span className="num" dir="ltr">{formatNumber(grandTotal)} ریال</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
