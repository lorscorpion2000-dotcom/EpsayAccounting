import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, FileText, Printer, Send, CheckCircle2, DollarSign,
  FileSpreadsheet, User, FolderOpen, Calendar, Calculator,
} from 'lucide-react';
import clsx from 'clsx';
import { payrollApi } from '../services/payroll.api';
import type { SubcontractorStatement } from '@/types/payroll';
import { STATEMENT_STATUS_LABELS, STATEMENT_STATUS_COLORS } from '@/types/payroll';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statement, setStatement] = useState<SubcontractorStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState<{ action: 'submit' | 'approve' | 'pay' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await payrollApi.statements.get(id);
      setStatement(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async () => {
    if (!actionItem || !statement) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'submit') {
        await payrollApi.statements.submit(statement.id);
        toast.success('به کارتابل ارسال شد');
        setActionItem(null);
        setTimeout(() => navigate('/approvals'), 500);
        return;
      }
      if (actionItem.action === 'approve') { await payrollApi.statements.approve(statement.id); toast.success('تایید شد'); }
      else if (actionItem.action === 'pay') { await payrollApi.statements.pay(statement.id); toast.success('پرداخت ثبت شد'); }
      setActionItem(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!statement?.items?.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = statement.items.map((it, i) => ({
      'ردیف': i + 1,
      'کد WBS': it.wbsItem?.code || '',
      'شرح': it.description,
      'واحد': it.unit || '',
      'مقدار': Number(it.quantity),
      'بهای واحد': Number(it.unitPrice),
      'جمع': Number(it.totalPrice),
    }));
    void exportToExcel({
      filename: 'Statement-' + statement.code + '.xlsx',
      sheets: [{
        name: 'Statement',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!statement) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/payroll/subcontractor-statements')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> صورت‌وضعیت‌ها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{statement.code}</span>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-end gap-2 no-print">
        <button className="btn-secondary" onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </button>
        <button className="btn-secondary" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> چاپ / PDF
        </button>
        {statement.status === 'DRAFT' && (
          <button className="btn-primary" onClick={() => setActionItem({ action: 'submit' })}>
            <Send className="w-4 h-4" /> ارسال به کارتابل
          </button>
        )}
        {statement.status === 'SUBMITTED' && (
          <button className="btn-primary" onClick={() => setActionItem({ action: 'approve' })}>
            <CheckCircle2 className="w-4 h-4" /> تایید
          </button>
        )}
        {statement.status === 'APPROVED' && (
          <button className="btn-primary" onClick={() => setActionItem({ action: 'pay' })}>
            <DollarSign className="w-4 h-4" /> ثبت پرداخت
          </button>
        )}
      </div>

      {/* Document (for print) */}
      <div className="bg-white border border-slate-200 rounded-lg p-8" id="statement-doc">
        {/* Header */}
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
            <div className="num font-bold text-slate-800">{formatJalaliDate(new Date().toISOString())}</div>
          </div>
        </div>

        <h1 className="text-center text-xl font-bold text-brand-700 mb-2">
          صورت‌وضعیت پیمانکار
        </h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          شماره <span className="num font-bold">{toPersianDigits(statement.statementNumber)}</span>
        </p>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">کد:</span>
              <span className="num font-bold">{statement.code}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">پیمانکار:</span>
              <span className="font-medium">{statement.contractor?.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">پروژه:</span>
              <span className="font-medium">{statement.project?.name}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">دوره:</span>
              <span className="num">{formatJalaliDate(statement.periodStart)} تا {formatJalaliDate(statement.periodEnd)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-24">وضعیت:</span>
              <span className={clsx('text-xs px-2 py-0.5 rounded-md', STATEMENT_STATUS_COLORS[statement.status])}>
                {STATEMENT_STATUS_LABELS[statement.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="border border-brand-700 px-2 py-2 text-center w-10">#</th>
              <th className="border border-brand-700 px-2 py-2 text-right w-24">کد WBS</th>
              <th className="border border-brand-700 px-2 py-2 text-right">شرح عملیات</th>
              <th className="border border-brand-700 px-2 py-2 text-center w-16">واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-center w-20">مقدار</th>
              <th className="border border-brand-700 px-2 py-2 text-left w-32">بهای واحد</th>
              <th className="border border-brand-700 px-2 py-2 text-left w-32">جمع</th>
            </tr>
          </thead>
          <tbody>
            {statement.items?.map((it) => (
              <tr key={it.id}>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(it.rowNumber)}</td>
                <td className="border border-slate-300 px-2 py-2 num text-xs" dir="ltr">{it.wbsItem?.code || '—'}</td>
                <td className="border border-slate-300 px-2 py-2">{it.description}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">{it.unit || '—'}</td>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(it.quantity)}</td>
                <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(it.unitPrice))}</td>
                <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(it.totalPrice))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100">
              <td colSpan={6} className="border border-slate-300 px-2 py-2 text-right font-medium">جمع کل اقلام</td>
              <td className="border border-slate-300 px-2 py-2 text-left num font-bold" dir="ltr">{formatNumber(Number(statement.totalAmount))}</td>
            </tr>
          </tfoot>
        </table>

        {/* Deductions */}
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-2">کسورات</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-2 text-right">عنوان</th>
                <th className="border border-slate-300 px-2 py-2 text-center w-24">درصد</th>
                <th className="border border-slate-300 px-2 py-2 text-left w-40">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-2">بیمه سهم کارفرما</td>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(Number(statement.insurancePercent).toFixed(2))}٪</td>
                <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(statement.insuranceAmount))}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-2">مالیات تکلیفی</td>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(Number(statement.taxPercent).toFixed(2))}٪</td>
                <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(statement.taxAmount))}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-2 py-2">حسن انجام کار</td>
                <td className="border border-slate-300 px-2 py-2 text-center num">{toPersianDigits(Number(statement.retentionPercent).toFixed(2))}٪</td>
                <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(statement.retentionAmount))}</td>
              </tr>
              {Number(statement.prepaymentDepreciation) > 0 && (
                <tr>
                  <td className="border border-slate-300 px-2 py-2">استهلاک پیش‌پرداخت</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(statement.prepaymentDepreciation))}</td>
                </tr>
              )}
              {Number(statement.otherDeduction) > 0 && (
                <tr>
                  <td className="border border-slate-300 px-2 py-2">سایر کسورات</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">—</td>
                  <td className="border border-slate-300 px-2 py-2 text-left num" dir="ltr">{formatNumber(Number(statement.otherDeduction))}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100">
                <td colSpan={2} className="border border-slate-300 px-2 py-2 text-right font-medium">جمع کسورات</td>
                <td className="border border-slate-300 px-2 py-2 text-left num font-bold text-rose-700" dir="ltr">
                  {formatNumber(Number(statement.totalDeduction))}
                </td>
              </tr>
              <tr className="bg-emerald-50">
                <td colSpan={2} className="border border-emerald-300 px-2 py-3 text-right font-bold text-emerald-800 text-base">
                  خالص قابل پرداخت
                </td>
                <td className="border border-emerald-300 px-2 py-3 text-left num font-bold text-emerald-800 text-lg" dir="ltr">
                  {formatNumber(Number(statement.netPayable))} ریال
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {statement.description && (
          <div className="p-3 bg-slate-50 rounded-lg mb-6">
            <div className="text-xs text-slate-500 mb-1">توضیحات</div>
            <div className="text-sm">{statement.description}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-4 mt-12 pt-6 border-t border-slate-200 text-xs">
          <div className="text-center">
            <div className="text-slate-500 mb-8">پیمانکار</div>
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

        <div className="mt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
          <span>وضعیت: {STATEMENT_STATUS_LABELS[statement.status]}</span>
          <span>سیستم حسابداری اپسای</span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!actionItem}
        title={
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' :
          actionItem?.action === 'approve' ? 'تایید صورت‌وضعیت' :
          'ثبت پرداخت'
        }
        message={
          actionItem?.action === 'submit' ? 'به کارتابل مدیر ارسال می‌شود.' :
          actionItem?.action === 'approve' ? 'آیا صورت‌وضعیت تایید می‌شود؟' :
          'آیا پرداخت ثبت می‌شود؟'
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
