import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, CheckCircle2, Send, Pencil, X, Save, Trash2 } from 'lucide-react';

import { procurementApi } from '../services/procurement.api';
import type { PurchaseOrder } from '@/types/procurement';
import { PO_STATUS_LABELS, PR_UNIT_LABELS } from '@/types/procurement';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { printHtml, standardHeader, standardSignatures, escapeHtml, getTodayJalali } from '@/utils/print-document'; // STANDALONE_PRINT_V3
import SignatureBlock from '@/components/SignatureBlock';

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 10mm 10mm 12mm 10mm; }
  .print-table {
    table-layout: fixed !important;
    width: 100% !important;
    border-collapse: collapse !important;
  }
  .print-table th,
  .print-table td {
    padding: 5px 6px !important;
    font-size: 10pt !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    vertical-align: middle !important;
    line-height: 1.35 !important;
    white-space: normal !important;
  }
  .print-table .print-center { text-align: center !important; }
  .print-table .print-right  { text-align: right  !important; }
  .print-table .print-left   { text-align: left   !important; }
  .print-table .print-num {
    font-family: 'Courier New', monospace !important;
    direction: ltr !important;
    unicode-bidi: embed !important;
    white-space: nowrap !important;
  }
}
`;

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'approve' | 'send' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Inline Edit ───
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    notes: string;
  } | null>(null);
  const [savingItem, setSavingItem] = useState(false);

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

  const handleStartEdit = (it: any) => {
    setEditingId(it.id);
    setEditForm({
      description: it.description || '',
      quantity: it.quantity != null ? String(it.quantity) : '',
      unit: it.unit || 'NUMBER',
      unitPrice: it.unitPrice != null ? String(it.unitPrice) : '',
      notes: it.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveItem = async () => {
    if (!editingId || !editForm) return;
    const q = Number(editForm.quantity);
    const up = Number(editForm.unitPrice);
    if (!editForm.description.trim()) { toast.error('شرح ردیف الزامی است'); return; }
    if (!Number.isFinite(q) || q <= 0) { toast.error('مقدار باید بزرگ‌تر از صفر باشد'); return; }
    if (!Number.isFinite(up) || up < 0) { toast.error('قیمت واحد معتبر نیست'); return; }
    if (!editForm.unit) { toast.error('واحد الزامی است'); return; }
    setSavingItem(true);
    try {
      await procurementApi.po.updateItem(editingId, {
        description: editForm.description.trim(),
        quantity: q,
        unit: editForm.unit,
        unitPrice: up,
        notes: editForm.notes || undefined,
      });
      toast.success('ردیف به‌روزرسانی شد');
      setEditingId(null);
      setEditForm(null);
      if (po) {
        const fresh = await procurementApi.po.get(po.id);
        setPo(fresh);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('این ردیف حذف شود؟')) return;
    try {
      await procurementApi.po.deleteItem(itemId);
      toast.success('ردیف حذف شد');
      if (po) {
        const fresh = await procurementApi.po.get(po.id);
        setPo(fresh);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    }
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>;
  if (!po) return null;

  const handleStandalonePrint = () => {
    if (!po) return;
    const meta = `<div>شماره: <span class="val num">${po.code}</span></div>
                  <div>تاریخ چاپ: <span class="val">${getTodayJalali()}</span></div>`;

    const itemsHtml = (po.items || []).map((it) => `
      <tr>
        <td class="c num">${it.rowNumber}</td>
        <td class="r">${escapeHtml(it.description || '')}</td>
        <td class="c num">${it.quantity}</td>
        <td class="c">${escapeHtml(PR_UNIT_LABELS[it.unit] || '')}</td>
        <td class="l num">${formatNumber(Number(it.unitPrice))}</td>
        <td class="l num">${formatNumber(Number(it.totalPrice))}</td>
      </tr>`).join('');

    const body = `
      ${standardHeader({ title: 'دستور خرید', subtitle: 'Purchase Order', meta })}
      <div class="meta-grid">
        <div class="meta-row"><span class="lbl">کد دستور:</span><span class="val num">${escapeHtml(po.code)}</span></div>
        <div class="meta-row"><span class="lbl">تأمین‌کننده:</span><span class="val">${escapeHtml(po.supplier?.name || '—')}</span></div>
        <div class="meta-row"><span class="lbl">تاریخ صدور:</span><span class="val num">${formatJalaliDate(po.poDate)}</span></div>
        <div class="meta-row"><span class="lbl">تلفن:</span><span class="val num">${escapeHtml(po.supplier?.phone || '—')}</span></div>
        ${po.deliveryDate ? `<div class="meta-row"><span class="lbl">تاریخ تحویل:</span><span class="val num">${formatJalaliDate(po.deliveryDate)}</span></div>` : ''}
        <div class="meta-row"><span class="lbl">آدرس:</span><span class="val">${escapeHtml(po.supplier?.address || '—')}</span></div>
        <div class="meta-row"><span class="lbl">پروژه:</span><span class="val">${escapeHtml(po.project?.name || '—')}</span></div>
        ${po.pr ? `<div class="meta-row"><span class="lbl">مرجع PR:</span><span class="val num">${escapeHtml(po.pr.code)}</span></div>` : ''}
      </div>
      <table class="print-table">
        <colgroup>
          <col style="width:6%"><col style="width:30%"><col style="width:10%">
          <col style="width:10%"><col style="width:22%"><col style="width:22%">
        </colgroup>
        <thead>
          <tr>
            <th class="c">#</th>
            <th class="r">شرح کالا / خدمات</th>
            <th class="c">مقدار</th>
            <th class="c">واحد</th>
            <th class="l">قیمت واحد</th>
            <th class="l">مبلغ کل</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="5" class="r">جمع اقلام</td><td class="l num">${formatNumber(Number(po.subtotal || 0))}</td></tr>
          <tr><td colspan="5" class="r">مالیات (${po.taxPercent || 0}٪)</td><td class="l num">${formatNumber(Number(po.taxAmount || 0))}</td></tr>
          <tr><td colspan="5" class="r">مبلغ نهایی</td><td class="l num">${formatNumber(Number(po.totalAmount || 0))} ریال</td></tr>
        </tfoot>
      </table>
      ${po.notes ? `<div class="notes-box"><div class="lbl">توضیحات</div><div>${escapeHtml(po.notes)}</div></div>` : ''}
      ${standardSignatures(['تهیه‌کننده', 'مدیر فنی', 'مدیر پروژه'])}
      <div class="status-bar">
        <span>وضعیت: ${escapeHtml(PO_STATUS_LABELS[po.status] || po.status)}</span>
        <span>سیستم حسابداری اپسای</span>
      </div>`;

    printHtml(body, {
      title: 'دستور خرید ' + po.code,
      orientation: 'portrait',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
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
        <button className="btn-secondary" onClick={handleStandalonePrint}>
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
        <table className="print-table w-full border-collapse mb-4 text-sm">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '23%' }} />
          </colgroup>
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="border border-brand-700 px-2 py-2 text-center print-center">#</th>
              <th className="border border-brand-700 px-2 py-2 text-right print-right">شرح کالا / خدمات</th>
              <th className="border border-brand-700 px-2 py-2 text-center print-center">مقدار</th>
              <th className="border border-brand-700 px-2 py-2 text-center print-center">واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-left print-left">قیمت واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-left print-left">مبلغ کل</th>
              {po.status === 'DRAFT' && (
                <th className="border border-brand-700 px-2 py-2 text-center no-print">عملیات</th>
              )}
            </tr>
          </thead>
          <tbody>
            {po.items?.map((it) => {
              const isEditing = editingId === it.id && !!editForm;
              if (isEditing) {
                return (
                  <tr key={it.id} className="bg-amber-50">
                    <td className="border border-slate-300 px-2 py-2 text-center num print-center">{toPersianDigits(it.rowNumber)}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      <input type="text" value={editForm!.description}
                        onChange={(e) => setEditForm({ ...editForm!, description: e.target.value })}
                        className="input text-xs py-1 px-2 w-full" placeholder="شرح ردیف" />
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      <input type="number" step="0.01" value={editForm!.quantity}
                        onChange={(e) => setEditForm({ ...editForm!, quantity: e.target.value })}
                        className="input text-xs py-1 px-2 w-20 text-center num" dir="ltr" />
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      <select value={editForm!.unit}
                        onChange={(e) => setEditForm({ ...editForm!, unit: e.target.value })}
                        className="input text-xs py-1 px-2 w-full">
                        {Object.entries(PR_UNIT_LABELS).map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      <input type="number" value={editForm!.unitPrice}
                        onChange={(e) => setEditForm({ ...editForm!, unitPrice: e.target.value })}
                        className="input text-xs py-1 px-2 w-28 text-left num" dir="ltr" />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-left num text-xs font-bold text-emerald-700">
                      {formatNumber(Number(editForm!.quantity || 0) * Number(editForm!.unitPrice || 0))}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center no-print whitespace-nowrap">
                      <button onClick={handleSaveItem} disabled={savingItem}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="ذخیره">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancelEdit} disabled={savingItem}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="انصراف">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={it.id}>
                  <td className="border border-slate-300 px-2 py-2 text-center num print-center">{toPersianDigits(it.rowNumber)}</td>
                  <td className="border border-slate-300 px-2 py-2">{it.description}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center num print-center">{toPersianDigits(it.quantity)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center print-center">{PR_UNIT_LABELS[it.unit]}</td>
                  <td className="border border-slate-300 px-2 py-2 text-left num print-left print-num">{formatNumber(Number(it.unitPrice))}</td>
                  <td className="border border-slate-300 px-2 py-2 text-left num print-left print-num">{formatNumber(Number(it.totalPrice))}</td>
                  {po.status === 'DRAFT' && (
                    <td className="border border-slate-300 px-2 py-1 text-center no-print whitespace-nowrap">
                      <button onClick={() => handleStartEdit(it)} className="p-1 text-sky-600 hover:bg-sky-50 rounded" title="ویرایش">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(it.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
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

        <SignatureBlock slots={[
          { title: 'تهیه‌کننده', type: 'current-user', caption: 'نام و امضا' },
          { title: 'مدیر فنی', type: 'empty', caption: 'نام و امضا' },
          { title: 'مدیر پروژه', type: 'empty', caption: 'نام و امضا' },
        ]} />

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
