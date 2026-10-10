import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, TrendingDown, Save, CheckCircle2, Trophy,
  Plus, User, Calendar, X,
} from 'lucide-react';
import clsx from 'clsx';
import { procurementApi } from '../services/procurement.api';
import type { RFQ } from '@/types/procurement';
import { PR_UNIT_LABELS } from '@/types/procurement';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseModal, setResponseModal] = useState<{ supplierId: string; supplierName: string } | null>(null);
  const [responseData, setResponseData] = useState<Record<string, { unitPrice: number; deliveryDays?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState<any>(null);
  const [selectLoading, setSelectLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await procurementApi.rfq.get(id);
      setRfq(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const openResponseModal = (supplierId: string, supplierName: string) => {
    setResponseModal({ supplierId, supplierName });
    // پر کردن اولیه
    const init: any = {};
    rfq?.pr?.items?.forEach((item) => {
      const existing = rfq.responses?.find((r) => r.supplierId === supplierId)
        ?.items?.find((it) => it.prItemId === item.id);
      init[item.id] = {
        unitPrice: existing ? Number(existing.unitPrice) : 0,
        deliveryDays: existing?.deliveryDays || undefined,
      };
    });
    setResponseData(init);
  };

  const handleSaveResponse = async () => {
    if (!rfq || !responseModal) return;
    const items = Object.entries(responseData)
      .filter(([_, v]) => v.unitPrice > 0)
      .map(([prItemId, v]) => ({
        prItemId,
        unitPrice: v.unitPrice,
        deliveryDays: v.deliveryDays,
      }));

    if (items.length === 0) {
      toast.error('حداقل قیمت یک قلم را وارد کنید');
      return;
    }

    setSaving(true);
    try {
      await procurementApi.rfq.addResponse({
        rfqId: rfq.id,
        supplierId: responseModal.supplierId,
        items,
      });
      toast.success('پاسخ ذخیره شد');
      setResponseModal(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSupplier = async () => {
    if (!selecting) return;
    setSelectLoading(true);
    try {
      await procurementApi.rfq.selectSupplier(selecting.id);
      toast.success('تأمین‌کننده انتخاب شد و استعلام بسته گردید');
      setSelecting(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setSelectLoading(false);
    }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>;
  if (!rfq) return null;

  const prItems = rfq.pr?.items || [];
  const responses = rfq.responses || [];

  // پیدا کردن کمترین قیمت برای هر آیتم
  const lowestPrices: Record<string, number> = {};
  prItems.forEach((item) => {
    const prices = responses.map((r) => {
      const it = r.items?.find((x) => x.prItemId === item.id);
      return it ? Number(it.unitPrice) : Infinity;
    }).filter((x) => x > 0);
    if (prices.length) lowestPrices[item.id] = Math.min(...prices);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/procurement/requests/' + rfq.prId)} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> {rfq.pr?.code}
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{rfq.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg">
              <TrendingDown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{rfq.code}</h1>
                <span className={clsx(
                  'text-xs px-2.5 py-1 rounded-md',
                  rfq.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700',
                )}>
                  {rfq.status === 'OPEN' ? 'در جریان' : 'بسته'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num">تاریخ: {formatJalaliDate(rfq.rfqDate)}</span>
                {rfq.validUntil && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="num">اعتبار: {formatJalaliDate(rfq.validUntil)}</span>
                  </>
                )}
                <span className="text-slate-300">•</span>
                <span>{toPersianDigits(responses.length)} تأمین‌کننده</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin delete (super admin only) */}
      <div className="flex justify-end no-print">
        <AdminDeleteButton endpoint="/procurement/rfqs" id={rfq.id} itemLabel={(rfq as any).code} onSuccess={() => navigate('/procurement/rfqs')} variant="button" />
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">جدول مقایسه قیمت</h2>
          <p className="text-xs text-slate-500 mt-1">
            مقایسه قیمت اقلام از تأمین‌کنندگان مختلف (کمترین قیمت با رنگ سبز)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right px-3 py-3 font-medium text-slate-600 min-w-[200px]">شرح کالا</th>
                <th className="text-center px-2 py-3 font-medium text-slate-600 w-20">مقدار</th>
                {responses.map((r) => (
                  <th key={r.id} className="text-center px-3 py-3 font-medium text-slate-600 min-w-[180px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{r.supplier?.name}</span>
                      {!r.respondedAt ? (
                        <button
                          type="button"
                          onClick={() => openResponseModal(r.supplierId, r.supplier?.name || '')}
                          className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> ثبت پاسخ
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> پاسخ داده
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-slate-800">{item.description}</td>
                  <td className="px-2 py-3 text-center text-xs text-slate-500">
                    <span className="num">{toPersianDigits(item.quantity)}</span>
                    <span className="ms-1">{PR_UNIT_LABELS[item.unit]}</span>
                  </td>
                  {responses.map((r) => {
                    const resItem = r.items?.find((x) => x.prItemId === item.id);
                    const price = resItem ? Number(resItem.unitPrice) : 0;
                    const isLowest = price > 0 && price === lowestPrices[item.id];
                    return (
                      <td key={r.id} className="px-3 py-3 text-center">
                        {price > 0 ? (
                          <div className={clsx(
                            'inline-block px-2 py-0.5 rounded',
                            isLowest ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-700',
                          )}>
                            <span className="num" dir="ltr">{formatNumber(price)}</span>
                            {resItem?.deliveryDays && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {toPersianDigits(resItem.deliveryDays)} روز
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={2} className="px-3 py-3 text-right text-slate-800">جمع کل</td>
                {responses.map((r) => (
                  <td key={r.id} className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="num text-brand-700 text-base" dir="ltr">
                        {formatNumber(Number(r.totalAmount))}
                      </span>
                      {!r.isSelected && rfq.status === 'OPEN' && r.respondedAt && (
                        <button
                          onClick={() => setSelecting(r)}
                          className="text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center gap-1"
                        >
                          <Trophy className="w-3 h-3" /> انتخاب
                        </button>
                      )}
                      {r.isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> انتخاب‌شده
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Modal */}
      {responseModal && rfq.pr?.items && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                ثبت پاسخ از: {responseModal.supplierName}
              </h3>
              <button onClick={() => setResponseModal(null)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 font-medium text-slate-600">شرح</th>
                    <th className="text-center py-2 font-medium text-slate-600 w-20">مقدار</th>
                    <th className="text-center py-2 font-medium text-slate-600 w-40">قیمت واحد</th>
                    <th className="text-center py-2 font-medium text-slate-600 w-24">روز تحویل</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.pr.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-800">{item.description}</td>
                      <td className="py-2 text-center text-xs num">
                        {toPersianDigits(item.quantity)} {PR_UNIT_LABELS[item.unit]}
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          step="1"
                          value={responseData[item.id]?.unitPrice || ''}
                          onChange={(e) => setResponseData({
                            ...responseData,
                            [item.id]: { ...responseData[item.id], unitPrice: Number(e.target.value) },
                          })}
                          className="input num text-xs py-1.5 text-left"
                          dir="ltr"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          step="1"
                          value={responseData[item.id]?.deliveryDays || ''}
                          onChange={(e) => setResponseData({
                            ...responseData,
                            [item.id]: { ...responseData[item.id], deliveryDays: Number(e.target.value) || undefined },
                          })}
                          className="input num text-xs py-1.5 text-left"
                          dir="ltr"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setResponseModal(null)} className="btn-secondary">انصراف</button>
              <button onClick={handleSaveResponse} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره پاسخ
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!selecting}
        title="انتخاب تأمین‌کننده"
        message={`آیا «${selecting?.supplier?.name}» با مبلغ ${formatNumber(Number(selecting?.totalAmount || 0))} ریال انتخاب می‌شود؟ این باعث بسته شدن استعلام می‌گردد.`}
        confirmLabel="بله، انتخاب کن"
        variant="info"
        loading={selectLoading}
        onConfirm={handleSelectSupplier}
        onCancel={() => setSelecting(null)}
      />
    </div>
  );
}
