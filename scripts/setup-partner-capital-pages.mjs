// E:\EpsayAccounting\scripts\setup-partner-capital-pages.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

function w(rel, content) {
  const full = path.join(FRONTEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Capital Accounts Page ===\n');

w('src/modules/partner-capital/pages/CapitalAccountsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, Wallet, Trash2, RefreshCw, User, FolderOpen,
  FileSpreadsheet,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { partnerCapitalApi, CapitalAccount } from '../services/partner-capital.api';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import CapitalAccountFormModal from '../components/CapitalAccountFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function CapitalAccountsPage() {
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CapitalAccount | null>(null);
  const [deleting, setDeleting] = useState<CapitalAccount | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.accounts.list();
      setAccounts(data);
    } catch {
      toast.error('خطا در بارگذاری حساب‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      await partnerCapitalApi.accounts.remove(deleting.id);
      toast.success('حساب حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!accounts.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = accounts.map((a, i) => ({
      'ردیف': i + 1,
      'کد': a.code,
      'شریک': a.partner.name,
      'پروژه': a.project?.name || 'شرکت (عمومی)',
      'موجودی (ریال)': Number(a.balance),
      'تعداد آورده': a._count?.contributions || 0,
      'تعداد برداشت': a._count?.withdrawals || 0,
      'وضعیت': a.isActive ? 'فعال' : 'غیرفعال',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'CapitalAccounts');
    XLSX.writeFile(wb, 'CapitalAccounts-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? accounts.filter((a) =>
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.partner.name.toLowerCase().includes(search.toLowerCase()) ||
        a.project?.name?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            حساب‌های سرمایه شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت حساب‌های سرمایه هر شریک در هر پروژه
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> حساب جدید
          </button>
        </div>
      </div>

      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد حساب‌ها</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(accounts.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="text-xs text-emerald-700 mb-1">مجموع موجودی</div>
            <div className="text-xl font-bold text-emerald-700 num">{formatNumber(total)}</div>
            <div className="text-xs text-emerald-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">حساب‌های فعال</div>
            <div className="text-xl font-bold text-brand-700 num">
              {formatNumber(accounts.filter((a) => a.isActive).length)}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس کد، شریک یا پروژه..."
            className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ حساب سرمایه‌ای ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین حساب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:shadow-card-hover transition-all group relative">
              <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => setDeleting(a)}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-red-50 text-slate-600"
                  title="حذف">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                  a.isActive ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-gradient-to-br from-slate-400 to-slate-600')}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 line-clamp-1">{a.partner.name}</div>
                  <div className="text-xs text-slate-500 num" dir="ltr">{a.code}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="line-clamp-1">{a.project?.name || 'شرکت (عمومی)'}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-0.5">موجودی فعلی</div>
                <div className={clsx('text-2xl font-bold num',
                  Number(a.balance) > 0 ? 'text-emerald-600' : Number(a.balance) < 0 ? 'text-rose-600' : 'text-slate-400')}>
                  {formatNumber(Number(a.balance))}
                  <span className="text-xs font-normal text-slate-500 ms-1">ریال</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>{formatNumber(a._count?.contributions || 0)} آورده</span>
                <span>{formatNumber(a._count?.withdrawals || 0)} برداشت</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CapitalAccountFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف حساب سرمایه"
        message={'آیا از حذف «' + (deleting?.partner.name || '') + '» اطمینان دارید؟ فقط حساب‌های بدون گردش قابل حذف هستند.'}
        confirmLabel="بله، حذف شود" variant="danger" loading={deletingLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 2. Contributions Page ===\n');

w('src/modules/partner-capital/pages/ContributionsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, TrendingUp, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { partnerCapitalApi, Contribution } from '../services/partner-capital.api';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import ContributionFormModal from '../components/ContributionFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده', APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده', CANCELLED: 'لغو‌شده',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700', PAID: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-700',
};
const CATEGORY_LABELS: Record<string, string> = {
  CASH_DEPOSIT: 'واریز نقدی', BANK_TRANSFER: 'حواله بانکی', PETTY_CASH: 'تنخواه',
  LAND: 'زمین', MATERIALS: 'مصالح', SERVICES: 'خدمات', EQUIPMENT: 'تجهیزات',
  VEHICLE: 'خودرو', OTHER: 'سایر',
};

export default function ContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [actionItem, setActionItem] = useState<{ item: Contribution; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.contributions.list({ status: statusFilter || undefined });
      setItems(data);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await partnerCapitalApi.contributions.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await partnerCapitalApi.contributions.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await partnerCapitalApi.contributions.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل رد الزامی'); setActionLoading(false); return; }
        await partnerCapitalApi.contributions.reject(actionItem.item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null); setReason(''); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => ({
      'ردیف': i + 1, 'کد': c.code, 'شریک': c.partner.name,
      'دسته': CATEGORY_LABELS[c.category] || c.category,
      'مبلغ': Number(c.amount), 'تاریخ': formatJalaliDate(c.contributionDate),
      'وضعیت': STATUS_LABELS[c.status], 'شرح': c.description || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Contributions');
    XLSX.writeFile(wb, 'Contributions-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((c) =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.partner.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalApproved = items.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            آورده شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و تایید آورده نقدی و غیرنقدی شرکا</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> آورده جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(items.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="text-xs text-emerald-700 mb-1">مجموع تاییدشده</div>
            <div className="text-xl font-bold text-emerald-700 num">{formatNumber(totalApproved)}</div>
            <div className="text-xs text-emerald-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">در انتظار تایید</div>
            <div className="text-xl font-bold text-amber-700 num">
              {formatNumber(items.filter((c) => c.status === 'SUBMITTED').length)}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ آورده‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین آورده
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">دسته</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.partner.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(c.contributionDate)}</span></td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-emerald-700" dir="ltr">{formatNumber(Number(c.amount))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(c); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'submit' })}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => setActionItem({ item: c, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: c, action: 'reject' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'APPROVED' && (
                          <span className="text-xs text-emerald-600 font-medium">تاییدشده</span>
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

      <ContributionFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف آورده' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید آورده'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'آورده به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، موجودی حساب شریک افزایش می‌یابد. ادامه؟'
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد آورده</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

console.log('\n=== 3. Withdrawals Page ===\n');

w('src/modules/partner-capital/pages/WithdrawalsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, TrendingDown, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle, ArrowLeftRight,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { partnerCapitalApi, Withdrawal } from '../services/partner-capital.api';
import { formatNumber, formatJalaliDate } from '@/utils/format';
import WithdrawalFormModal from '../components/WithdrawalFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده', APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده', CANCELLED: 'لغو‌شده',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700', PAID: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function WithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Withdrawal | null>(null);
  const [actionItem, setActionItem] = useState<{ item: Withdrawal; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.withdrawals.list({ status: statusFilter || undefined });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await partnerCapitalApi.withdrawals.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await partnerCapitalApi.withdrawals.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await partnerCapitalApi.withdrawals.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await partnerCapitalApi.withdrawals.reject(actionItem.item.id, reason);
        toast.success('رد شد');
      }
      setActionItem(null); setReason(''); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((w, i) => ({
      'ردیف': i + 1, 'کد': w.code, 'شریک': w.partner.name,
      'مبلغ': Number(w.amount), 'تاریخ': formatJalaliDate(w.withdrawalDate),
      'انتقال به پروژه دیگر': w.transferToContribution ? 'بله' : 'خیر',
      'وضعیت': STATUS_LABELS[w.status], 'دلیل': w.reason || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Withdrawals');
    XLSX.writeFile(wb, 'Withdrawals-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((w) =>
        w.code.toLowerCase().includes(search.toLowerCase()) ||
        w.partner.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalApproved = items.filter((w) => w.status === 'APPROVED').reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            برداشت شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">ثبت و تایید برداشت از حساب سرمایه</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> برداشت جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{formatNumber(items.length)}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-rose-50 to-white border-rose-200">
            <div className="text-xs text-rose-700 mb-1">مجموع تاییدشده</div>
            <div className="text-xl font-bold text-rose-700 num">{formatNumber(totalApproved)}</div>
            <div className="text-xs text-rose-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">در انتظار تایید</div>
            <div className="text-xl font-bold text-amber-700 num">
              {formatNumber(items.filter((w) => w.status === 'SUBMITTED').length)}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ برداشتی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین برداشت
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">انتقال</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{w.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{w.partner.name}</td>
                    <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(w.withdrawalDate)}</span></td>
                    <td className="px-4 py-3 text-left">
                      <span className="num font-bold text-rose-700" dir="ltr">{formatNumber(Number(w.amount))}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w.transferToContribution ? (
                        <span title="انتقال به پروژه دیگر" className="inline-flex items-center gap-1 text-xs text-brand-600">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> بله
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[w.status])}>
                        {STATUS_LABELS[w.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {w.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(w); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'submit' })}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'delete' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {w.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => setActionItem({ item: w, action: 'approve' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="تایید">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem({ item: w, action: 'reject' })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="رد">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {w.status === 'APPROVED' && (
                          <span className="text-xs text-emerald-600 font-medium">تاییدشده</span>
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

      <WithdrawalFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف برداشت' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید برداشت'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'برداشت به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، موجودی حساب شریک کاهش می‌یابد. ادامه؟'
        }
        confirmLabel="بله"
        variant={actionItem?.action === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
        onConfirm={handleAction}
        onCancel={() => setActionItem(null)}
      />

      {actionItem?.action === 'reject' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد برداشت</h3>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="input resize-none mb-4" placeholder="دلیل رد..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setActionItem(null); setReason(''); }} className="btn-secondary">انصراف</button>
              <button onClick={handleAction} disabled={actionLoading || !reason.trim()} className="btn-danger">رد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

console.log('\n=== 4. Shares Page ===\n');

w('src/modules/partner-capital/pages/SharesPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, PieChart, Edit, Trash2, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { partnerCapitalApi, PartnerShare } from '../services/partner-capital.api';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ShareFormModal from '../components/ShareFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function SharesPage() {
  const [items, setItems] = useState<PartnerShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PartnerShare | null>(null);
  const [deleting, setDeleting] = useState<PartnerShare | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.shares.list();
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await partnerCapitalApi.shares.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((s, i) => ({
      'ردیف': i + 1, 'پروژه': s.project.name, 'شریک': s.partner.name,
      'درصد سهم': Number(s.sharePercent),
      'اعتبار از': new Date(s.effectiveFrom).toLocaleDateString('fa-IR'),
      'اعتبار تا': s.effectiveTo ? new Date(s.effectiveTo).toLocaleDateString('fa-IR') : '—',
      'یادداشت': s.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Shares');
    XLSX.writeFile(wb, 'PartnerShares-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((s) =>
        s.partner.name.toLowerCase().includes(search.toLowerCase()) ||
        s.project.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Group by project
  const byProject = filtered.reduce((acc, s) => {
    if (!acc[s.projectId]) acc[s.projectId] = { name: s.project.name, shares: [] };
    acc[s.projectId].shares.push(s);
    return acc;
  }, {} as Record<string, { name: string; shares: PartnerShare[] }>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-violet-600" />
            سهم‌الشرکه پروژه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            درصد مالکیت هر شریک در هر پروژه با اعتبار از/تا
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> سهم جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس شریک یا پروژه..." className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ سهمی ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین سهم
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byProject).map(([projectId, group]) => {
            const total = group.shares.reduce((s, x) => s + Number(x.sharePercent), 0);
            return (
              <div key={projectId} className="card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-l from-violet-50 to-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-bold text-slate-800">{group.name}</h2>
                    <div className="text-xs">
                      <span className="text-slate-500">مجموع سهم‌ها: </span>
                      <span className={total > 100 ? 'text-red-600 font-bold num' : 'text-emerald-600 font-bold num'}>
                        {toPersianDigits(total.toFixed(2))}٪
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">درصد</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">اعتبار از</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">اعتبار تا</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">یادداشت</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.shares.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{s.partner.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-bold num">
                              {toPersianDigits(Number(s.sharePercent).toFixed(2))}٪
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(s.effectiveFrom)}</span></td>
                          <td className="px-4 py-3">
                            <span className="num text-xs">
                              {s.effectiveTo ? formatJalaliDate(s.effectiveTo) : 'نامحدود'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{s.notes || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditing(s); setShowModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleting(s)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShareFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف سهم"
        message={'آیا از حذف سهم «' + (deleting?.partner.name || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 5. Balance Sheet Page ===\n');

w('src/modules/partner-capital/pages/BalanceSheetPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wallet, RefreshCw, FileSpreadsheet, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { partnerCapitalApi, BalanceSheet } from '../services/partner-capital.api';
import { formatNumber } from '@/utils/format';
import PrintHeader from '@/components/PrintHeader';

export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerCapitalApi.reports.balanceSheet();
      setData(res);
    } catch { toast.error('خطا در بارگذاری تراز'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExportExcel = () => {
    if (!data) return;
    const rows = data.accounts.map((a, i) => ({
      'ردیف': i + 1,
      'کد': a.code,
      'شریک': a.partnerName,
      'کد شریک': a.partnerCode,
      'پروژه': a.projectName,
      'مانده (ریال)': a.balance,
    }));
    rows.push({
      'ردیف': '' as any, 'کد': '', 'شریک': 'جمع کل',
      'کد شریک': '', 'پروژه': '',
      'مانده (ریال)': data.totals.net,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'BalanceSheet');
    XLSX.writeFile(wb, 'PartnerBalanceSheet-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  if (loading) return (
    <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PrintHeader title="تراز تسویه جاری شرکا" subtitle="خلاصه آورده‌ها و برداشت‌های شرکا" />

      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            تراز تسویه جاری شرکا
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مانده جاری هر شریک در هر پروژه
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-secondary" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ</button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-emerald-700">مجموع آورده‌ها</div>
                <div className="text-xl font-bold text-emerald-700 num">{formatNumber(data.totals.contributions)}</div>
                <div className="text-xs text-emerald-600">ریال</div>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-bl from-rose-50 to-white border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-rose-700">مجموع برداشت‌ها</div>
                <div className="text-xl font-bold text-rose-700 num">{formatNumber(data.totals.withdrawals)}</div>
                <div className="text-xs text-rose-600">ریال</div>
              </div>
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-brand-700">مانده خالص</div>
                <div className="text-xl font-bold text-brand-700 num">{formatNumber(data.totals.net)}</div>
                <div className="text-xs text-brand-600">ریال</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {!data || data.accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">هیچ داده‌ای برای نمایش وجود ندارد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-12">#</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 w-48">مانده (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.accounts.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center text-slate-500 num text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{a.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.partnerName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {a.projectName}
                      <span className="text-slate-400 num ms-2">({a.projectCode})</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={
                        a.balance > 0 ? 'num font-bold text-emerald-700' :
                        a.balance < 0 ? 'num font-bold text-rose-700' : 'num font-bold text-slate-500'
                      } dir="ltr">
                        {formatNumber(a.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-800">مانده خالص</td>
                  <td className="px-4 py-3 text-left">
                    <span className={
                      data.totals.net > 0 ? 'num font-bold text-emerald-800 text-base' :
                      data.totals.net < 0 ? 'num font-bold text-rose-800 text-base' : 'num font-bold text-slate-800 text-base'
                    } dir="ltr">
                      {formatNumber(data.totals.net)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`);

console.log('\n=== 6. Patch MainLayout Sidebar ===\n');

const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');
let layout = fs.readFileSync(layoutPath, 'utf8');

if (!layout.includes('/partner-capital/accounts')) {
  // 1) ایمپورت آیکون‌های جدید (TrendingDown, PieChart) به لوکید
  if (!layout.includes('TrendingDown,')) {
    layout = layout.replace(
      /(\n\s+Wallet, Package, TrendingUp, FileText,)/,
      '$1\n  TrendingDown, PieChart,',
    );
  }

  // 2) افزودن بخش Partner Capital به MENU - بعد از financial
  const partnerCapitalSection = `  {
    key: 'partner-capital',
    title: 'سرمایه شرکا',
    icon: Wallet,
    items: [
      { to: '/partner-capital/accounts', label: 'حساب‌های سرمایه', icon: Wallet },
      { to: '/partner-capital/contributions', label: 'آورده‌ها', icon: TrendingUp },
      { to: '/partner-capital/withdrawals', label: 'برداشت‌ها', icon: TrendingDown },
      { to: '/partner-capital/shares', label: 'سهم‌الشرکه', icon: PieChart },
      { to: '/partner-capital/balance-sheet', label: 'تراز تسویه', icon: BarChart3 },
    ],
  },
`;

  // پیدا کردن بخش financial و اضافه کردن بعد آن
  const financialMatch = layout.match(/(\s+\{\s+key:\s+['"]financial['"][\s\S]*?\},\n)/);
  if (financialMatch) {
    layout = layout.replace(financialMatch[0], financialMatch[0] + partnerCapitalSection);
    fs.writeFileSync(layoutPath, layout, 'utf8');
    console.log('  ✓ MainLayout.tsx — بخش «سرمایه شرکا» اضافه شد');
  } else {
    console.log('  ⚠ MainLayout.tsx — بخش financial پیدا نشد، لطفاً دستی اضافه کنید');
  }
} else {
  console.log('  ℹ MainLayout.tsx — قبلاً اضافه شده');
}

console.log('\n=== 7. Patch Router ===\n');

// پیدا کردن فایل router
const routerCandidates = [
  'src/app/router.tsx',
  'src/app/router.ts',
  'src/router/index.tsx',
  'src/router.tsx',
  'src/routes.tsx',
];

let routerPath = null;
for (const cand of routerCandidates) {
  const full = path.join(FRONTEND, cand);
  if (fs.existsSync(full)) { routerPath = full; break; }
}

if (!routerPath) {
  console.log('  ⚠ فایل router پیدا نشد. مسیرهای زیر را دستی به router اضافه کنید:\n');
  console.log('    import CapitalAccountsPage from \'@/modules/partner-capital/pages/CapitalAccountsPage\';');
  console.log('    import ContributionsPage from \'@/modules/partner-capital/pages/ContributionsPage\';');
  console.log('    import WithdrawalsPage from \'@/modules/partner-capital/pages/WithdrawalsPage\';');
  console.log('    import SharesPage from \'@/modules/partner-capital/pages/SharesPage\';');
  console.log('    import BalanceSheetPage from \'@/modules/partner-capital/pages/BalanceSheetPage\';');
  console.log('');
  console.log('    <Route path="partner-capital/accounts" element={<CapitalAccountsPage />} />');
  console.log('    <Route path="partner-capital/contributions" element={<ContributionsPage />} />');
  console.log('    <Route path="partner-capital/withdrawals" element={<WithdrawalsPage />} />');
  console.log('    <Route path="partner-capital/shares" element={<SharesPage />} />');
  console.log('    <Route path="partner-capital/balance-sheet" element={<BalanceSheetPage />} />');
} else {
  let router = fs.readFileSync(routerPath, 'utf8');
  const rel = routerPath.replace(FRONTEND, '');

  if (!router.includes('partner-capital/pages')) {
    // ایمپورت‌ها
    const imports = `
import CapitalAccountsPage from '@/modules/partner-capital/pages/CapitalAccountsPage';
import ContributionsPage from '@/modules/partner-capital/pages/ContributionsPage';
import WithdrawalsPage from '@/modules/partner-capital/pages/WithdrawalsPage';
import SharesPage from '@/modules/partner-capital/pages/SharesPage';
import BalanceSheetPage from '@/modules/partner-capital/pages/BalanceSheetPage';
`;

    // پیدا کردن آخرین import
    const lastImportMatch = router.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/m);
    if (lastImportMatch) {
      const insertAt = router.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length;
      router = router.slice(0, insertAt) + imports + router.slice(insertAt);
    }

    // افزودن Routes — پیدا کردن آخرین </Routes> یا آخرین Route
    const routesBlock = `
        {/* Partner Capital */}
        <Route path="partner-capital/accounts" element={<CapitalAccountsPage />} />
        <Route path="partner-capital/contributions" element={<ContributionsPage />} />
        <Route path="partner-capital/withdrawals" element={<WithdrawalsPage />} />
        <Route path="partner-capital/shares" element={<SharesPage />} />
        <Route path="partner-capital/balance-sheet" element={<BalanceSheetPage />} />
`;

    if (router.includes('</Routes>')) {
      router = router.replace('</Routes>', routesBlock + '      </Routes>');
    } else if (router.includes('</Route>')) {
      router = router.replace(/(<\/Route>\s*)$/m, routesBlock + '$1');
    }

    fs.writeFileSync(routerPath, router, 'utf8');
    console.log('  ✓ Router patched: ' + rel);
  } else {
    console.log('  ℹ Router — قبلاً patch شده');
  }
}

console.log('');
console.log('=============================================');
console.log('  ✅ Partner Capital Frontend Complete!');
console.log('=============================================');
console.log('');
console.log('Pages created:');
console.log('  • CapitalAccountsPage');
console.log('  • ContributionsPage');
console.log('  • WithdrawalsPage');
console.log('  • SharesPage');
console.log('  • BalanceSheetPage');
console.log('');
console.log('Next steps:');
console.log('  1. در VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
console.log('  2. در ترمینال frontend: Ctrl+C و دوباره npm run dev');
console.log('  3. مرورگر: Ctrl+Shift+R');
console.log('  4. از سایدبار: بخش «سرمایه شرکا» را باز کنید');
console.log('');