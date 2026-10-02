import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, Search, FileText, Edit, Trash2, CheckCircle2,
  XCircle, Printer, RefreshCw, BookOpen, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import type { JournalEntry, FiscalYear, JournalStatus } from '@/types/accounting';
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUS_COLORS } from '@/types/accounting';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PersianDatePicker } from '@/components/PersianDatePicker';

export default function JournalsListPage() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [currentFy, setCurrentFy] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingJournal, setDeletingJournal] = useState<JournalEntry | null>(null);
  const [postingJournal, setPostingJournal] = useState<JournalEntry | null>(null);
  const [reversingJournal, setReversingJournal] = useState<JournalEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [j, fys] = await Promise.all([
        accountingApi.journals.list({
          fiscalYearId: currentFy || undefined,
          status: statusFilter || undefined,
          fromDate,
          toDate,
          search: search || undefined,
        }),
        fiscalYears.length ? Promise.resolve(fiscalYears) : accountingApi.fiscalYears.list(),
      ]);
      setJournals(j);
      if (!fiscalYears.length) setFiscalYears(fys);
    } catch {
      toast.error('خطا در بارگذاری اسناد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    accountingApi.fiscalYears.current().then((fy) => {
      if (fy) setCurrentFy(fy.id);
    });
  }, []);

  useEffect(() => {
    if (currentFy) loadData();
    // eslint-disable-next-line
  }, [currentFy, statusFilter, fromDate, toDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDelete = async () => {
    if (!deletingJournal) return;
    setActionLoading(true);
    try {
      await accountingApi.journals.remove(deletingJournal.id);
      toast.success('سند حذف شد');
      setDeletingJournal(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    if (!postingJournal) return;
    setActionLoading(true);
    try {
      await accountingApi.journals.post(postingJournal.id);
      toast.success('سند با موفقیت ثبت شد');
      setPostingJournal(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ثبت');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reversingJournal || !reversalReason.trim()) {
      toast.error('دلیل ابطال الزامی است');
      return;
    }
    setActionLoading(true);
    try {
      await accountingApi.journals.reverse(reversingJournal.id, reversalReason);
      toast.success('سند ابطال شد و سند معکوس ایجاد گردید');
      setReversingJournal(null);
      setReversalReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ابطال');
    } finally {
      setActionLoading(false);
    }
  };

  const totals = journals.reduce(
    (sum, j) => ({
      debit: sum.debit + Number(j.totalDebit),
      credit: sum.credit + Number(j.totalCredit),
    }),
    { debit: 0, credit: 0 },
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600" />
            اسناد حسابداری
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت و مدیریت اسناد حسابداری دوبل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/accounting/journals/new')}
          >
            <Plus className="w-4 h-4" />
            سند جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <form onSubmit={handleSearch} className="md:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در کد، شرح یا مرجع..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>
          <select
            value={currentFy}
            onChange={(e) => setCurrentFy(e.target.value)}
            className="input"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.name} {fy.isCurrent ? '(جاری)' : ''}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">همه وضعیت‌ها</option>
            {(Object.keys(JOURNAL_STATUS_LABELS) as JournalStatus[]).map((k) => (
              <option key={k} value={k}>{JOURNAL_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      {!loading && journals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد اسناد</div>
            <div className="text-xl font-bold text-slate-800 num">
              {toPersianDigits(journals.length)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">مجموع بدهکار</div>
            <div className="text-xl font-bold text-emerald-700 num">
              {formatNumber(totals.debit)}
            </div>
            <div className="text-xs text-slate-400">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">مجموع بستانکار</div>
            <div className="text-xl font-bold text-brand-700 num">
              {formatNumber(totals.credit)}
            </div>
            <div className="text-xs text-slate-400">ریال</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ سندی ثبت نشده است</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/accounting/journals/new')}
            >
              <Plus className="w-4 h-4" />
              ثبت اولین سند
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد سند</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شرح</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">بدهکار</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">بستانکار</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-600 font-mono" dir="ltr">
                        {j.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs text-slate-700">
                        {formatJalaliDate(j.entryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-medium truncate max-w-md">
                        {j.description}
                      </div>
                      {j.reference && (
                        <div className="text-xs text-slate-500 mt-0.5" dir="ltr">
                          مرجع: {j.reference}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-medium text-emerald-700" dir="ltr">
                        {formatNumber(Number(j.totalDebit))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-medium text-brand-700" dir="ltr">
                        {formatNumber(Number(j.totalCredit))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'inline-block text-xs px-2 py-0.5 rounded-md',
                        JOURNAL_STATUS_COLORS[j.status],
                      )}>
                        {JOURNAL_STATUS_LABELS[j.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {j.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => setPostingJournal(j)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                              title="ثبت نهایی"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate('/accounting/journals/' + j.id + '/edit')}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                              title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingJournal(j)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {j.status === 'POSTED' && (
                          <>
                            <button
                              onClick={() => navigate('/accounting/journals/' + j.id)}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors"
                              title="مشاهده"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReversingJournal(j)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="ابطال سند"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {j.status === 'REVERSED' && (
                          <span className="text-xs text-slate-400">
                            ابطال‌شده
                          </span>
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

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deletingJournal}
        title="حذف سند پیش‌نویس"
        message={`آیا از حذف سند «${deletingJournal?.code}» اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingJournal(null)}
      />

      {/* Confirm Post */}
      <ConfirmDialog
        isOpen={!!postingJournal}
        title="ثبت نهایی سند"
        message={`آیا از ثبت نهایی سند «${postingJournal?.code}» اطمینان دارید؟ پس از ثبت، امکان ویرایش یا حذف وجود ندارد و فقط می‌توان سند را ابطال کرد.`}
        confirmLabel="بله، ثبت شود"
        variant="info"
        loading={actionLoading}
        onConfirm={handlePost}
        onCancel={() => setPostingJournal(null)}
      />

      {/* Reverse Modal */}
      {reversingJournal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">ابطال سند</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    سند «<span className="font-medium num">{reversingJournal.code}</span>» ابطال می‌شود و یک سند معکوس خودکار ایجاد خواهد شد.
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="label">دلیل ابطال *</label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="مثال: اشتباه در مبلغ، مغایرت با مستندات..."
                  className="input resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setReversingJournal(null); setReversalReason(''); }}
                  className="btn-secondary"
                >
                  انصراف
                </button>
                <button
                  onClick={handleReverse}
                  disabled={actionLoading || !reversalReason.trim()}
                  className="btn-danger"
                >
                  {actionLoading ? 'در حال ابطال...' : 'ابطال سند'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
