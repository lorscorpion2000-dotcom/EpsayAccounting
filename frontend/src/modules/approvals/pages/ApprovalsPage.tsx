import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, Inbox,
  RefreshCw, User, Wallet, FolderOpen, Calendar, Hash,
  FileText, TrendingUp, TrendingDown, Eye, ShoppingCart, Layers,
  ShoppingBag, ClipboardList,
} from 'lucide-react';
import { PackagePlus } from 'lucide-react';
import clsx from 'clsx';
import { approvalsApi, PendingApproval, ApprovalStats } from '../services/approvals.api';
import AccountPickerModal from '@/modules/petty-cash/components/AccountPickerModal';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'all' | 'pettyCashTransactions' | 'pettyCashRequests' | 'purchaseRequests' | 'purchaseOrders' | 'dailyReports' | 'goodsReceipts' | 'subcontractorStatements' | 'leaveRequests' | 'advanceRequests';

interface PendingData {
  pettyCashTransactions: PendingApproval[];
  pettyCashRequests: PendingApproval[];
  purchaseRequests: PendingApproval[];
  purchaseOrders: PendingApproval[];
  dailyReports: PendingApproval[];
  goodsReceipts: PendingApproval[];
  subcontractorStatements: PendingApproval[];
  leaveRequests: PendingApproval[];
  advanceRequests: PendingApproval[];
}


// نقشه: هر تب برای کدام نقش‌ها نمایش داده شود
const TAB_ROLES: Record<string, string[]> = {
  all: ['admin'],
  pettyCashTransactions: ['admin', 'accountant', 'approver'],
  pettyCashRequests: ['admin', 'accountant', 'approver'],
  purchaseRequests: ['admin', 'purchaser', 'site_supervisor', 'approver'],
  purchaseOrders: ['admin', 'purchaser', 'approver'],
  dailyReports: ['admin', 'site_supervisor', 'project_manager', 'approver'],
  goodsReceipts: ['admin', 'accountant', 'purchaser', 'warehouse_keeper', 'approver'],
  subcontractorStatements: ['admin', 'project_manager', 'accountant', 'approver'],
  leaveRequests: ['admin', 'hr', 'approver'],
  advanceRequests: ['admin', 'hr', 'accountant', 'approver'],
};

function canSeeTab(tab: string, roles: string[]): boolean {
  if (roles.includes('admin') || roles.includes('super_admin')) return true;
  const allowed = TAB_ROLES[tab] || [];
  return roles.some((r) => allowed.includes(r));
}


export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingData>({
    pettyCashTransactions: [],
    pettyCashRequests: [],
    purchaseRequests: [],
    purchaseOrders: [],
    dailyReports: [],
    goodsReceipts: [],
    subcontractorStatements: [],
    leaveRequests: [],
    advanceRequests: [],
  });
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [actionItem, setActionItem] = useState<{ item: PendingApproval; action: 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuthStore();
  const userRoles = (user?.roles || []) as string[];
  const [payingItem, setPayingItem] = useState<PendingApproval | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        approvalsApi.getPending(),
        approvalsApi.getStats(),
      ]);
      setPending({
        pettyCashTransactions: (p as any).pettyCashTransactions || [],
        pettyCashRequests: (p as any).pettyCashRequests || [],
        purchaseRequests: (p as any).purchaseRequests || [],
        purchaseOrders: (p as any).purchaseOrders || [],
        dailyReports: (p as any).dailyReports || [],
        goodsReceipts: (p as any).goodsReceipts || [],
        subcontractorStatements: (p as any).subcontractorStatements || [],
        leaveRequests: (p as any).leaveRequests || [],
        advanceRequests: (p as any).advanceRequests || [],
      });
      setStats(s);
    } catch {
      toast.error('خطا در بارگذاری کارتابل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // انتخاب خودکار تب بر اساس نقش کاربر
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []) as string[];
    if (roles.includes('admin') || roles.includes('super_admin')) return;

    const availableTabs = Object.entries(TAB_ROLES)
      .filter(([k]) => k !== 'all' && canSeeTab(k, roles))
      .map(([k]) => k);

    if (!availableTabs.includes(tab) && availableTabs.length > 0) {
      setTab(availableTabs[0] as Tab);
    }
  }, [user]);

  // انتخاب خودکار تب بر اساس نقش کاربر
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []) as string[];
    if (roles.includes('admin') || roles.includes('super_admin')) return; // admin می‌تواند تب را دستی انتخاب کند

    const availableTabs = Object.entries(TAB_ROLES)
      .filter(([k]) => k !== 'all' && canSeeTab(k, roles))
      .map(([k]) => k);

    // اگر تب فعلی در دسترس نیست، اولین تب مجاز انتخاب شود
    if (!availableTabs.includes(tab)) {
      if (availableTabs.length > 0) {
        setTab(availableTabs[0] as Tab);
      }
    }
  }, [user]);

  const allItems: PendingApproval[] = [
    ...pending.pettyCashTransactions,
    ...pending.pettyCashRequests,
    ...pending.purchaseRequests,
    ...pending.purchaseOrders,
    ...pending.dailyReports,
    ...pending.goodsReceipts,
    ...pending.subcontractorStatements,
    ...pending.leaveRequests,
    ...pending.advanceRequests,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayedItems =
    tab === 'all' ? allItems :
    tab === 'pettyCashTransactions' ? pending.pettyCashTransactions :
    tab === 'pettyCashRequests' ? pending.pettyCashRequests :
    tab === 'purchaseRequests' ? pending.purchaseRequests :
    tab === 'purchaseOrders' ? pending.purchaseOrders :
    tab === 'dailyReports' ? pending.dailyReports :
    tab === 'goodsReceipts' ? pending.goodsReceipts :
    tab === 'subcontractorStatements' ? pending.subcontractorStatements :
    tab === 'leaveRequests' ? pending.leaveRequests :
    pending.advanceRequests;
  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      if (actionItem.action === 'approve') {
        await approvalsApi.approve(actionItem.item.module, actionItem.item.id);
        toast.success('آیتم تایید شد');
      } else {
        if (!reason.trim()) {
          toast.error('دلیل رد الزامی است');
          setActionLoading(false);
          return;
        }
        await approvalsApi.reject(actionItem.item.module, actionItem.item.id, reason);
        toast.success('آیتم رد شد');
      }
      setActionItem(null);
      setReason('');
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async (sourceAccountId: string) => {
    if (!payingItem) return;
    try {
      await approvalsApi.pettyCashPay(payingItem.id, sourceAccountId);
      toast.success('تنخواه با موفقیت شار شد');
      setPayingItem(null);
      loadData();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در پرداخت');
      throw e;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-600" />
            {userRoles.includes('admin') || userRoles.includes('super_admin') ? 'کارتابل مدیران' : 'کارتابل من'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مشاهده و تایید اسناد ارسالی از ماژول‌های مختلف
          </p>
        </div>
        <button className="btn-secondary" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
          به‌روزرسانی
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card p-5 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">مجموع</div>
                <div className="text-2xl font-bold text-brand-700 num">
                  {toPersianDigits(stats.total)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">تراکنش تنخواه</div>
                <div className="text-2xl font-bold text-slate-800 num">
                  {toPersianDigits(stats.byModule.pettyCashTransactions.count)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">درخواست شارژ</div>
                <div className="text-2xl font-bold text-slate-800 num">
                  {toPersianDigits(stats.byModule.pettyCashRequests.count)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">درخواست خرید</div>
                <div className="text-2xl font-bold text-slate-800 num">
                  {toPersianDigits((stats.byModule as any).purchaseRequests?.count || 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500">دستور خرید</div>
                <div className="text-2xl font-bold text-slate-800 num">
                  {toPersianDigits((stats.byModule as any).purchaseOrders?.count || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {canSeeTab('all', userRoles) && <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="همه" count={allItems.length} />}
          {canSeeTab('pettyCashTransactions', userRoles) && <TabButton
            active={tab === 'pettyCashTransactions'}
            onClick={() => setTab('pettyCashTransactions')}
            label="تراکنش‌های تنخواه"
            count={pending.pettyCashTransactions.length}
          />}
          {canSeeTab('pettyCashRequests', userRoles) && <TabButton
            active={tab === 'pettyCashRequests'}
            onClick={() => setTab('pettyCashRequests')}
            label="درخواست‌های شارژ"
            count={pending.pettyCashRequests.length}
          />}
          {canSeeTab('purchaseRequests', userRoles) && <TabButton
            active={tab === 'purchaseRequests'}
            onClick={() => setTab('purchaseRequests')}
            label="درخواست‌های خرید"
            count={pending.purchaseRequests.length}
          />}
          {canSeeTab('purchaseOrders', userRoles) && <TabButton
            active={tab === 'purchaseOrders'}
            onClick={() => setTab('purchaseOrders')}
            label="دستورات خرید"
            count={pending.purchaseOrders.length}
          />}
          {canSeeTab('dailyReports', userRoles) && <TabButton
            active={tab === 'dailyReports'}
            onClick={() => setTab('dailyReports')}
            label="گزارش‌های روزانه"
            count={pending.dailyReports.length}
          />}
          {canSeeTab('goodsReceipts', userRoles) && <TabButton
            active={tab === 'goodsReceipts'}
            onClick={() => setTab('goodsReceipts')}
            label="رسیدهای انبار"
            count={pending.goodsReceipts.length}
          />}
          {canSeeTab('subcontractorStatements', userRoles) && <TabButton
            active={tab === 'subcontractorStatements'}
            onClick={() => setTab('subcontractorStatements')}
            label="صورت‌وضعیت‌ها"
            count={pending.subcontractorStatements.length}
          />}
          {canSeeTab('leaveRequests', userRoles) && <TabButton
            active={tab === 'leaveRequests'}
            onClick={() => setTab('leaveRequests')}
            label="مرخصی‌ها"
            count={pending.leaveRequests.length}
          />}
          {canSeeTab('advanceRequests', userRoles) && <TabButton
            active={tab === 'advanceRequests'}
            onClick={() => setTab('advanceRequests')}
            label="مساعده"
            count={pending.advanceRequests.length}
          />}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700 mb-1">کارتابل خالی است</p>
          <p className="text-sm text-slate-500">هیچ سندی در انتظار تایید شما نیست</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => (
            <ApprovalCard
              key={item.id + item.module}
              item={item}
              onApprove={() => setActionItem({ item, action: 'approve' })}
              onReject={() => setActionItem({ item, action: 'reject' })}
              onPay={() => setPayingItem(item)}
              onNavigate={() => {
                if (item.module === 'purchase-request') {
                  navigate('/procurement/requests/' + item.id);
                } else if (item.module === 'purchase-order') {
                  navigate('/procurement/orders/' + item.id);
                } else if (item.module === 'daily-report') {
                  navigate('/site-ops/daily-reports/' + item.id);
                } else if (item.module === 'goods-receipt') {
                  navigate('/warehouse/receipts/' + item.id);
                } else if (item.module === 'subcontractor-statement') {
                  navigate('/payroll/subcontractor-statements/' + item.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {actionItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                  actionItem.action === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
                )}>
                  {actionItem.action === 'approve' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">
                    {actionItem.action === 'approve' ? 'تایید' : 'رد'} — {actionItem.item.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    کد: <span className="num font-medium">{actionItem.item.code}</span>
                  </p>
                  {Number(actionItem.item.amount) > 0 && (
                    <p className="text-sm text-slate-600 mt-0.5">
                      مبلغ: <span className="num font-bold">{formatNumber(Number(actionItem.item.amount))}</span> ریال
                    </p>
                  )}
                </div>
              </div>

              {actionItem.action === 'reject' && (
                <div className="mb-4">
                  <label className="label">دلیل رد *</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input resize-none"
                    placeholder="دلیل رد را وارد کنید..."
                    autoFocus
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setActionItem(null); setReason(''); }}
                  className="btn-secondary"
                >
                  انصراف
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionLoading || (actionItem.action === 'reject' && !reason.trim())}
                  className={actionItem.action === 'approve' ? 'btn-primary' : 'btn-danger'}
                >
                  {actionLoading ? 'در حال پردازش...' : actionItem.action === 'approve' ? 'تایید' : 'رد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <AccountPickerModal
        isOpen={!!payingItem}
        amount={Number(payingItem?.amount || 0)}
        pettyAccountName={payingItem?.accountName}
        requestCode={payingItem?.code}
        onClose={() => setPayingItem(null)}
        onConfirm={handlePay}
      />
    </div>
  );
}

function TabButton({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
        active
          ? 'border-brand-500 text-brand-600 bg-brand-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
      )}
    >
      {label}
      <span className={clsx(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold num',
        active ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-600',
      )}>
        {toPersianDigits(count)}
      </span>
    </button>
  );
}

function ApprovalCard({ item, onApprove, onReject, onNavigate, onPay}: any) {
  const isTransaction = item.module === 'petty-cash-transaction';
  const isRequest = item.module === 'petty-cash-request';
  const isPurchase = item.module === 'purchase-request';
  const isPO = item.module === 'purchase-order';
  const isDailyReport = item.module === 'daily-report';
  const isGoodsReceipt = item.module === 'goods-receipt';
  const isExpense = item.raw?.type === 'EXPENSE';

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
            isGoodsReceipt ? 'bg-gradient-to-br from-teal-500 to-teal-700' :
            isDailyReport ? 'bg-gradient-to-br from-cyan-500 to-cyan-700' :
            isPO ? 'bg-gradient-to-br from-violet-500 to-violet-700' :
            isPurchase ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
            isRequest ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
            isExpense ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
            'bg-gradient-to-br from-brand-500 to-brand-700',
          )}>
            {isGoodsReceipt ? <PackagePlus className="w-6 h-6" /> :
             isDailyReport ? <ClipboardList className="w-6 h-6" /> :
             isPO ? <ShoppingBag className="w-6 h-6" /> :
             isPurchase ? <ShoppingCart className="w-6 h-6" /> :
             isRequest ? <TrendingUp className="w-6 h-6" /> :
             isExpense ? <TrendingDown className="w-6 h-6" /> :
             <Wallet className="w-6 h-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold num text-brand-700 font-mono" dir="ltr">
                {item.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                در انتظار تایید
              </span>
              {isPurchase && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  درخواست خرید
                </span>
              )}
              {isRequest && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                  درخواست شارژ
                </span>
              )}
              {isPO && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">
                  دستور خرید
                </span>
              )}
              {isDailyReport && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700">
                  گزارش روزانه
                </span>
              )}
            </div>

            <div className="font-bold text-slate-800 mb-1">{item.title}</div>
            <div className="text-sm text-slate-600 mb-2 line-clamp-2">{item.description}</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <InfoItem icon={User} label="درخواست‌کننده" value={item.requester} />
              {item.accountName && <InfoItem icon={Wallet} label="حساب" value={item.accountName} />}
              {item.supplierName && <InfoItem icon={User} label="تأمین‌کننده" value={item.supplierName} />}
              {item.projectName && <InfoItem icon={FolderOpen} label="پروژه" value={item.projectName} />}
              <InfoItem icon={Calendar} label="تاریخ" value={formatJalaliDate(item.date)} />
              {item.itemCount > 0 && (
                <InfoItem icon={Layers} label="تعداد اقلام" value={toPersianDigits(item.itemCount)} />
              )}
              {item.department && <InfoItem icon={Hash} label="واحد" value={item.department} />}
              {item.recipient && <InfoItem icon={User} label="دریافت‌کننده" value={item.recipient} />}
              {item.category && <InfoItem icon={Hash} label="دسته" value={item.category} />}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          {Number(item.amount) > 0 && (
            <div className="text-left">
              <div className="text-xs text-slate-500">مبلغ</div>
              <div className={clsx(
                'text-2xl font-bold num',
                isRequest ? 'text-emerald-700' : isExpense ? 'text-rose-700' : 'text-brand-700',
              )}>
                {formatNumber(Number(item.amount))}
              </div>
              <div className="text-xs text-slate-500 text-left">ریال</div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {(isPurchase || isPO) && (
              <button
                onClick={onNavigate}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                <Eye className="w-4 h-4" />
                مشاهده
              </button>
            )}
            <button
              onClick={onReject}
              className="btn-secondary text-sm py-1.5 px-3 text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <XCircle className="w-4 h-4" />
              رد
            </button>
            {item.module === 'petty-cash-request' && item.status === 'APPROVED' && (
              <button
                onClick={onPay}
                className="btn-primary text-sm py-1.5 px-4 bg-amber-600 hover:bg-amber-700"
                title="پرداخت و شارژ تنخواه"
              >
                <Wallet className="w-4 h-4" />
                پرداخت
              </button>
            )}
            <button
              onClick={onApprove}
              className="btn-primary text-sm py-1.5 px-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              تایید
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className="truncate num" title={value}>{value}</span>
</div>
  );
}
