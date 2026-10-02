import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, CheckCircle2, XCircle, Package } from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';
import { useRef } from 'react';

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
  const total = items.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0);

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
          <div><span className="text-slate-500">تأمینکننده: </span>{data.supplier?.name || '—'}</div>
          <div><span className="text-slate-500">وضعیت: </span>{data.status}</div>
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-2">اقلام</div>
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2 text-right w-12">#</th>
                  <th className="border p-2 text-right">کالا</th>
                  <th className="border p-2 text-center w-20">تعداد</th>
                  <th className="border p-2 text-left w-32">قیمت</th>
                  <th className="border p-2 text-left w-32">جمع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={it.id || i}>
                    <td className="border p-2 text-center num">{i + 1}</td>
                    <td className="border p-2">{it.item?.name || it.description || '—'}</td>
                    <td className="border p-2 text-center num">{it.quantity}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.unitPrice || 0))}</td>
                    <td className="border p-2 text-left num" dir="ltr">{formatNumber(Number(it.totalPrice || 0))}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="border p-2 text-left">جمع کل (ریال)</td>
                  <td className="border p-2 text-left num" dir="ltr">{formatNumber(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}