import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Wallet, Plus, TrendingUp, TrendingDown,
  FileSpreadsheet, Printer, RefreshCw, Send, CheckCircle2, XCircle,
  Edit, Trash2, FileText, ChevronDown, ChevronLeft, Image as ImageIcon,
  MessageSquare, User, Calendar, Hash, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { pettyCashApi } from '../services/petty-cash.api';
import type {
  PettyCashAccount, PettyCashTransaction, PettyCashTxStatus,
} from '@/types/petty-cash';
import {
  TX_TYPE_LABELS, TX_TYPE_COLORS, TX_STATUS_LABELS, TX_STATUS_COLORS,
} from '@/types/petty-cash';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import TransactionFormModal from '../components/TransactionFormModal';
import RequestFormModal from '../components/RequestFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';

import { exportToExcel } from '@/utils/export-excel';
export default function PettyCashDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<PettyCashAccount | null>(null);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [deletingTx, setDeletingTx] = useState<PettyCashTransaction | null>(null);
  const [submittingTx, setSubmittingTx] = useState<PettyCashTransaction | null>(null);
  const [rejectingTx, setRejectingTx] = useState<PettyCashTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [acc, txs] = await Promise.all([
        pettyCashApi.accounts.get(id),
        pettyCashApi.transactions.list({ accountId: id }),
      ]);
      setAccount(acc);
      setTransactions(txs);
    } catch {
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSubmitTx = async () => {
    if (!submittingTx) return;
    setActionLoading(true);
    try {
      await pettyCashApi.transactions.submit(submittingTx.id);
      toast.success('تراکنش به کارتابل مدیر ارسال شد');
      setSubmittingTx(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTx = async () => {
    if (!deletingTx) return;
    setActionLoading(true);
    try {
      await pettyCashApi.transactions.remove(deletingTx.id);
      toast.success('تراکنش حذف شد');
      setDeletingTx(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTx = async () => {
    if (!rejectingTx || !rejectReason.trim()) {
      toast.error('دلیل رد الزامی است');
      return;
    }
    setActionLoading(true);
    try {
      await pettyCashApi.transactions.reject(rejectingTx.id, rejectReason);
      toast.success('تراکنش رد شد');
      setRejectingTx(null);
      setRejectReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!account || transactions.length === 0) {
      toast.info('داده‌ای وجود ندارد');
      return;
    }
    const rows = transactions.map((t, i) => ({
      'ردیف': i + 1,
      'کد': t.code,
      'تاریخ': formatJalaliDate(t.txDate),
      'نوع': TX_TYPE_LABELS[t.type],
      'شرح': t.description,
      'دریافت‌کننده': t.recipient || '',
      'مبلغ': Number(t.amount),
      'وضعیت': TX_STATUS_LABELS[t.status],
    }));
    void exportToExcel({
      filename: `PettyCash-${account.code}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{
        name: 'Transactions',
        rows,
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!account) return null;

  const totalFunding = transactions
    .filter((t) => t.type === 'FUNDING' && t.status === 'APPROVED')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE' && ['APPROVED', 'SUBMITTED'].includes(t.status))
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/petty-cash')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          تنخواه
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium">{account.name}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg',
              account.isActive
                ? 'bg-gradient-to-br from-brand-500 to-brand-700'
                : 'bg-gradient-to-br from-slate-400 to-slate-600',
            )}>
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{account.name}</h1>
                <span className={clsx(
                  'text-xs px-2.5 py-1 rounded-md border',
                  account.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200',
                )}>
                  {account.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num" dir="ltr">{account.code}</span>
                <span className="text-slate-300">•</span>
                <span>تنخواه‌دار: {account.holder?.fullName}</span>
                {account.project && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{account.project.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button className="btn-secondary" onClick={loadData} title="به‌روزرسانی">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button className="btn-secondary" onClick={() => setShowRequestModal(true)}>
              <TrendingUp className="w-4 h-4" />
              درخواست شارژ
            </button>
            <button className="btn-primary" onClick={() => setShowTxModal(true)}>
              <Plus className="w-4 h-4" />
              تراکنش جدید
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <StatBox
            icon={Wallet}
            label="موجودی فعلی"
            value={formatNumber(Number(account.balance))}
            sub="ریال"
            color={Number(account.balance) > 0 ? 'emerald' : 'slate'}
          />
          <StatBox
            icon={TrendingUp}
            label="مجموع شارژ"
            value={formatNumber(totalFunding)}
            sub="ریال"
            color="brand"
          />
          <StatBox
            icon={TrendingDown}
            label="مجموع هزینه"
            value={formatNumber(totalExpense)}
            sub="ریال"
            color="rose"
          />
          <StatBox
            icon={FileText}
            label="تعداد تراکنش‌ها"
            value={toPersianDigits(transactions.length)}
            sub=""
            color="slate"
          />
        </div>

        {/* Limits */}
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500 mb-1">سقف هر خرید</div>
              <div className="text-sm font-bold text-slate-800 num">
                {formatNumber(Number(account.ceilingPerTx))} <span className="text-xs font-normal text-slate-500">ریال</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">سقف هفتگی</div>
              <div className="text-sm font-bold text-slate-800 num">
                {formatNumber(Number(account.weeklyLimit))} <span className="text-xs font-normal text-slate-500">ریال</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">تراکنش‌ها</h2>
          <div className="text-xs text-slate-500">
            <span className="num">{toPersianDigits(transactions.length)}</span> تراکنش
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ تراکنشی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowTxModal(true)}>
              <Plus className="w-4 h-4" />
              ثبت اولین تراکنش
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شرح</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">نوع</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-slate-600" dir="ltr">
                        {t.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-700">
                        {formatJalaliDate(t.txDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 text-xs">{t.description}</div>
                      {t.recipient && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          <User className="w-3 h-3 inline me-1" />
                          {t.recipient}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-md border',
                        TX_TYPE_COLORS[t.type],
                      )}>
                        {TX_TYPE_LABELS[t.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={clsx(
                        'num font-medium',
                        t.type === 'EXPENSE' ? 'text-rose-700' : 'text-emerald-700',
                      )} dir="ltr">
                        {t.type === 'EXPENSE' ? '-' : '+'}
                        {formatNumber(Number(t.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'inline-block text-xs px-2 py-0.5 rounded-md',
                        TX_STATUS_COLORS[t.status],
                      )}>
                        {TX_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {t.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => setSubmittingTx(t)}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                              title="ارسال به کارتابل"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <AdminDeleteButton endpoint="/petty-cash/transactions" id={t.id} itemLabel={t.description || t.id} />
                          </>
                        )}
                        {t.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await pettyCashApi.transactions.approve(t.id);
                                  toast.success('تراکنش تایید شد');
                                  loadData();
                                } catch (e: any) {
                                  const msg = e?.response?.data?.message;
                                  toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                              title="تایید"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRejectingTx(t)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="رد"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(t.status === 'APPROVED' || t.status === 'REJECTED') && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionFormModal
        isOpen={showTxModal}
        accountId={account.id}
        onClose={() => setShowTxModal(false)}
        onSaved={loadData}
      />

      <RequestFormModal
        isOpen={showRequestModal}
        accountId={account.id}
        onClose={() => setShowRequestModal(false)}
        onSaved={() => {
          toast.success('درخواست شارژ ثبت شد. برای تایید به کارتابل مدیر مراجعه کنید.');
          setShowRequestModal(false);
        }}
      />

      <ConfirmDialog
        isOpen={!!deletingTx}
        title="حذف تراکنش"
        message={`آیا از حذف تراکنش «${deletingTx?.code}» اطمینان دارید؟`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteTx}
        onCancel={() => setDeletingTx(null)}
      />

      <ConfirmDialog
        isOpen={!!submittingTx}
        title="ارسال به کارتابل"
        message={`آیا از ارسال تراکنش «${submittingTx?.code}» به کارتابل مدیر اطمینان دارید؟ پس از ارسال، امکان ویرایش وجود ندارد.`}
        confirmLabel="بله، ارسال شود"
        variant="info"
        loading={actionLoading}
        onConfirm={handleSubmitTx}
        onCancel={() => setSubmittingTx(null)}
      />

      {/* Reject Modal */}
      {rejectingTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">رد تراکنش</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    تراکنش «<span className="font-medium num">{rejectingTx.code}</span>» رد می‌شود.
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="label">دلیل رد *</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input resize-none"
                  placeholder="مثال: مبلغ اشتباه، فاکتور نامعتبر..."
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setRejectingTx(null); setRejectReason(''); }}
                  className="btn-secondary"
                >
                  انصراف
                </button>
                <button
                  onClick={handleRejectTx}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="btn-danger"
                >
                  {actionLoading ? 'در حال رد...' : 'رد تراکنش'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sub, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    brand: 'bg-brand-50 text-brand-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  const textMap: any = {
    emerald: 'text-emerald-700',
    brand: 'text-brand-700',
    rose: 'text-rose-700',
    slate: 'text-slate-800',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={clsx('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className={clsx('text-lg font-bold num', textMap[color])}>
          {value}
          {sub && <span className="text-xs font-normal text-slate-500 ms-1">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
