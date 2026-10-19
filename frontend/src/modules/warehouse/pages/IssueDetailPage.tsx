import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Printer, Edit, Send, CheckCircle2,
  XCircle, Loader2, PackageMinus, Building2, Calendar, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { GoodsIssue } from '@/types/warehouse';
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_COLORS } from '@/types/warehouse';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<GoodsIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [action, setAction] = useState<'submit' | 'approve' | 'reject' | 'post' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await warehouseApi.issues.get(id);
      setIssue(data);
    } catch (err) {
      toast.error('خطا در دریافت اطلاعات حواله انبار');
      navigate('/warehouse/issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAction = async () => {
    if (!issue || !action) return;
    setActionLoading(true);
    try {
      if (action === 'submit') {
        await warehouseApi.issues.submit(issue.id);
        toast.success('حواله به کارتابل ارسال شد');
      } else if (action === 'approve') {
        await warehouseApi.issues.approve(issue.id);
        toast.success('حواله تأیید شد');
      } else if (action === 'reject') {
        if (!rejectReason.trim()) {
          toast.error('علت رد الزامی است');
          setActionLoading(false);
          return;
        }
        await warehouseApi.issues.reject(issue.id, rejectReason);
        toast.success('حواله رد شد');
      } else if (action === 'post') {
        if ((warehouseApi.issues as any).post) {
          await (warehouseApi.issues as any).post(issue.id);
          toast.success('ثبت نهایی شد و موجودی کسر گردید');
        }
      }
      setAction(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در انجام عملیات');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!issue) return null;

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0">
      {/* هدر اکشن‌ها */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/warehouse/issues')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                حواله خروج انبار: <span className="font-mono text-rose-600" dir="ltr">{issue.code}</span>
              </h1>
              <span className={clsx('text-xs px-2.5 py-1 rounded-md font-medium', ISSUE_STATUS_COLORS[issue.status])}>
                {ISSUE_STATUS_LABELS[issue.status]}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">مشاهده و چاپ جزئیات حواله انبار</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" /> چاپ حواله
          </button>

          {issue.status === 'DRAFT' && (
            <>
              <button
                onClick={() => navigate(`/warehouse/issues/${issue.id}/edit`)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit className="w-4 h-4" /> ویرایش
              </button>
              <button
                onClick={() => setAction('submit')}
                className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" /> ارسال به کارتابل
              </button>
            </>
          )}

          {issue.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => setAction('approve')}
                className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" /> تأیید حواله
              </button>
              <button
                onClick={() => setAction('reject')}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> رد حواله
              </button>
            </>
          )}

          {issue.status === 'APPROVED' && (
            <button
              onClick={() => setAction('post')}
              className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4" /> ثبت نهایی و کسر از انبار
            </button>
          )}
        </div>
      </div>

      {/* کارت خلاصه اطلاعات حواله */}
      <div className="card p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <PackageMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">مبدأ (انبار)</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{issue.warehouse?.name || '—'}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{issue.warehouse?.code}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">مقصد / پروژه</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{issue.project?.name || '—'}</div>
              {issue.wbsItem && (
                <div className="text-xs text-slate-500 mt-0.5">
                  WBS: {issue.wbsItem.code} — {issue.wbsItem.title}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">تاریخ خروج</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {formatJalaliDate(issue.issueDate)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">ارزش کل ریالی</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5" dir="ltr">
                {formatNumber(Number(issue.totalValue || 0))} ریال
              </div>
            </div>
          </div>
        </div>

        {issue.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">توضیحات: </span>
            {issue.description}
          </div>
        )}
      </div>

      {/* جدول اقلام */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">اقلام حواله انبار</h2>
          <span className="text-xs text-slate-500">
            تعداد ردیف: {toPersianDigits(issue.items?.length || 0)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-right">کد کالا</th>
                <th className="px-4 py-3 text-right">شرح کالا</th>
                <th className="px-4 py-3 text-center w-28">واحد سنجش</th>
                <th className="px-4 py-3 text-center w-28">تعداد / مقدار</th>
                <th className="px-4 py-3 text-left w-36">بهای واحد (ریال)</th>
                <th className="px-4 py-3 text-left w-40">ارزش کل (ریال)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issue.items?.map((item: any, idx: number) => {
                const unitTitle = item.item?.unitObj?.name || item.unitObj?.name || '—';
                const totalLine = Number(item.quantity || 0) * Number(item.unitCost || 0);

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700" dir="ltr">
                      {item.item?.code || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.item?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {unitTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {formatNumber(Number(item.quantity))}
                    </td>
                    <td className="px-4 py-3 text-left font-mono text-xs" dir="ltr">
                      {formatNumber(Number(item.unitCost || 0))}
                    </td>
                    <td className="px-4 py-3 text-left font-mono text-xs font-bold text-slate-900" dir="ltr">
                      {formatNumber(totalLine)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-left text-slate-700 text-xs">
                  مجموع ارزش حواله:
                </td>
                <td className="px-4 py-3 text-left font-mono text-rose-700 text-sm" dir="ltr">
                  {formatNumber(Number(issue.totalValue || 0))} ریال
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* دیالوگ تأیید عملیات */}
      <ConfirmDialog
        isOpen={!!action && action !== 'reject'}
        title={
          action === 'submit' ? 'ارسال حواله به کارتابل' :
          action === 'approve' ? 'تأیید حواله انبار' :
          'ثبت نهایی حواله انبار'
        }
        message={
          action === 'submit' ? `آیا از ارسال حواله «${issue.code}» به کارتابل اطمینان دارید؟` :
          action === 'approve' ? `حواله «${issue.code}» تأیید خواهد شد.` :
          'با ثبت نهایی، موجودی کالاها در انبار کسر شده و هزینه به پروژه الصاق می‌شود. ادامه می‌دهید؟'
        }
        confirmLabel="بله، ادامه بده"
        variant="info"
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
      />

      {/* مودال علت رد حواله */}
      {action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد حواله انبار</h3>
            <p className="text-xs text-slate-500 mb-2">لطفاً دلیل عدم تأیید این حواله را ذکر فرمایید:</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input resize-none mb-4 w-full"
              placeholder="توضیح دلیل رد..."
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setAction(null); setRejectReason(''); }}
                className="btn-secondary"
              >
                انصراف
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !rejectReason.trim()}
                className="btn-danger"
              >
                تأیید رد حواله
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
