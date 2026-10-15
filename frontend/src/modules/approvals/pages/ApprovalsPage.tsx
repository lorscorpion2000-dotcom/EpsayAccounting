import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Inbox, RefreshCw, User, Wallet, FolderOpen, Calendar, Hash, TrendingUp, TrendingDown, Eye, ShoppingCart, Layers, ShoppingBag, ClipboardList, Edit } from 'lucide-react';
import { PackagePlus } from 'lucide-react';
import clsx from 'clsx';
import { approvalsApi, PendingApproval, ApprovalStats } from '../services/approvals.api';
import AccountPickerModal from '@/modules/petty-cash/components/AccountPickerModal';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import { useAuthStore } from '@/store/auth.store';

const SECTION_LABELS: Record<string, string> = {
  HEADER: 'سرصفحه (اطلاعات کلی)',
  PROGRESS: 'پیشرفت کار',
  WORKERS: 'پرسنل و نیروی انسانی',
  EQUIPMENTS: 'ماشین‌آلات',
  MATERIALS: 'مصالح',
  REQUESTS: 'درخواست‌ها',
  EVENTS: 'رویدادها',
  ATTACHMENTS: 'پیوست‌ها',
};
const SECTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  FORWARDED: 'فوروارد شده',
  FAILED: 'خطا',
};
const SECTION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  FORWARDED: 'bg-blue-50 text-blue-700 border-blue-200',
  FAILED: 'bg-red-100 text-red-800 border-red-300',
};
const SECTION_ORDER = ['HEADER','PROGRESS','WORKERS','EQUIPMENTS','MATERIALS','REQUESTS','EVENTS','ATTACHMENTS'];

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
  all: ['super_admin'],
  pettyCashTransactions: ['super_admin', 'accountant', 'financial_manager'],
  pettyCashRequests: ['super_admin', 'accountant', 'financial_manager'],
  purchaseRequests: ['super_admin', 'procurement_officer', 'project_manager'],
  purchaseOrders: ['super_admin', 'procurement_officer', 'project_manager'],
  dailyReports: ['super_admin', 'project_manager'],
  goodsReceipts: ['super_admin', 'accountant', 'procurement_officer', 'warehouse_keeper'],
  subcontractorStatements: ['super_admin', 'project_manager', 'accountant', 'financial_manager'],
  leaveRequests: ['super_admin', 'project_manager'],
  advanceRequests: ['super_admin', 'accountant', 'financial_manager'],
};

function canSeeTab(tab: string, roles: string[]): boolean {
  if (roles.includes('admin') || roles.includes('super_admin')) return true;
  const allowed = TAB_ROLES[tab] || [];
  return roles.some((r) => allowed.includes(r));
}

export default function ApprovalsPage() {
  const { token } = useAuthStore();
  const withAuthToken = (url?: string | null) => {
    if (!url) return url || '#';
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 't=' + encodeURIComponent(token);
  };

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
  const [sectionsModalItem, setSectionsModalItem] = useState<PendingApproval | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionsBusy, setSectionsBusy] = useState<string | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionRejectDialog, setSectionRejectDialog] = useState<{ type: string } | null>(null);
  const [sectionRejectReason, setSectionRejectReason] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuthStore();
  const userRoles = (user?.roles || []) as string[];
  const [payingItem, setPayingItem] = useState<PendingApproval | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<{ item: PendingApproval; detail: any } | null>(null);

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

    if (!availableTabs.includes(tab)) {
      if (availableTabs.length > 0) {
        setTab(availableTabs[0] as Tab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const openSectionsModal = async (item: PendingApproval) => {
    setSectionsModalItem(item);
    setSectionsLoading(true);
    setSections([]);
    setReportData(null);
    setExpandedSection(null);
    try {
      const [sectionsRes, reportRes] = await Promise.all([
        api.get('/site-ops/daily-reports/' + item.id + '/sections'),
        api.get('/site-ops/daily-reports/' + item.id),
      ]);
      setSections(Array.isArray(sectionsRes.data) ? sectionsRes.data : []);
      setReportData(reportRes.data);
    } catch {
      toast.error('خطا در بارگذاری بخش‌ها');
    } finally {
      setSectionsLoading(false);
    }
  };

  const reloadSections = async () => {
    if (!sectionsModalItem) return;
    try {
      const { data } = await api.get('/site-ops/daily-reports/' + sectionsModalItem.id + '/sections');
      setSections(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const approveSection = async (type: string) => {
    if (!sectionsModalItem) return;
    setSectionsBusy(type);
    try {
      await api.patch('/site-ops/daily-reports/' + sectionsModalItem.id + '/sections/' + type + '/approve');
      toast.success('بخش تایید شد');
      await reloadSections();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در تایید بخش');
    } finally { setSectionsBusy(null); }
  };

  const openSectionReject = (type: string) => {
    setSectionRejectReason('');
    setSectionRejectDialog({ type });
  };

  const confirmSectionReject = async () => {
    if (!sectionsModalItem || !sectionRejectDialog || !sectionRejectReason.trim()) return;
    setSectionsBusy(sectionRejectDialog.type);
    try {
      await api.patch(
        '/site-ops/daily-reports/' + sectionsModalItem.id + '/sections/' + sectionRejectDialog.type + '/reject',
        { reason: sectionRejectReason },
      );
      toast.success('بخش رد شد');
      setSectionRejectDialog(null);
      setSectionRejectReason('');
      await reloadSections();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در رد بخش');
    } finally { setSectionsBusy(null); }
  };

  // رندر محتوای خلاصه هر بخش
  const renderSectionContent = (type: string) => {
    if (!reportData) return <div className="text-xs text-slate-400 p-2">در حال بارگذاری...</div>;
    const rd = reportData;

    const row = (label: string, value: any) => (
      <div key={label} className="flex gap-2 py-1 border-b border-slate-100 last:border-0">
        <span className="text-xs text-slate-500 w-32 shrink-0">{label}:</span>
        <span className="text-xs text-slate-800 flex-1">{value ?? '—'}</span>
      </div>
    );

    if (type === 'HEADER') {
      return (
        <div className="bg-slate-50 rounded-lg p-3">
          {row('پروژه', rd.project?.name)}
          {row('کد پروژه', rd.project?.code)}
          {row('تاریخ گزارش', rd.reportDate ? formatJalaliDate(rd.reportDate) : '—')}
          {row('وضعیت جوی', rd.weather || '—')}
          {row('دمای حداقل', rd.tempMin != null ? rd.tempMin + '°' : '—')}
          {row('دمای حداکثر', rd.tempMax != null ? rd.tempMax + '°' : '—')}
          {row('ساعت شروع', rd.startTime || '—')}
          {row('ساعت پایان', rd.endTime || '—')}
          {row('عملیات', rd.operations)}
          {row('مسائل', rd.issues)}
          {row('حوادث', rd.incidents)}
        </div>
      );
    }

    if (type === 'WORKERS') {
      const items = rd.workers || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-right">تیم</th>
                <th className="p-1.5 text-right">سرپرست</th>
                <th className="p-1.5 text-center">تعداد</th>
                <th className="p-1.5 text-center">ساعت</th>
                <th className="p-1.5 text-center">اضافه‌کار</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w: any, i: number) => (
                <tr key={w.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-right">{w.teamName || '—'}</td>
                  <td className="p-1.5 text-right">{w.foreman || '—'}</td>
                  <td className="p-1.5 text-center num">{w.workerCount}</td>
                  <td className="p-1.5 text-center num">{w.workHours}</td>
                  <td className="p-1.5 text-center num">{w.overtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'EQUIPMENTS') {
      const items = rd.equipments || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-right">نام</th>
                <th className="p-1.5 text-right">پلاک</th>
                <th className="p-1.5 text-right">اپراتور</th>
                <th className="p-1.5 text-center">ساعت</th>
                <th className="p-1.5 text-center">سوخت</th>
                <th className="p-1.5 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e: any, i: number) => (
                <tr key={e.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-right">{e.name || '—'}</td>
                  <td className="p-1.5 text-right num" dir="ltr">{e.plateNumber || '—'}</td>
                  <td className="p-1.5 text-right">{e.operator || '—'}</td>
                  <td className="p-1.5 text-center num">{e.hoursWorked}</td>
                  <td className="p-1.5 text-center num">{e.fuelLiters}</td>
                  <td className="p-1.5 text-center text-[10px]">{e.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'MATERIALS') {
      const items = rd.materials || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-right">نام کالا</th>
                <th className="p-1.5 text-center">مقدار</th>
                <th className="p-1.5 text-center">واحد</th>
                <th className="p-1.5 text-right">تأمین‌کننده</th>
                <th className="p-1.5 text-center">قبول/رد</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any, i: number) => (
                <tr key={m.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-right">{m.itemName || '—'}</td>
                  <td className="p-1.5 text-center num">{m.quantity}</td>
                  <td className="p-1.5 text-center">{m.unit || '—'}</td>
                  <td className="p-1.5 text-right">{m.supplier || '—'}</td>
                  <td className="p-1.5 text-center">{m.qcResult || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'PROGRESS') {
      const items = rd.progresses || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-right">شرح</th>
                <th className="p-1.5 text-center">پیشرفت</th>
                <th className="p-1.5 text-center">مقدار</th>
                <th className="p-1.5 text-right">موقعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p: any, i: number) => (
                <tr key={p.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-right">{p.description || '—'}</td>
                  <td className="p-1.5 text-center num">{p.progressPct}%</td>
                  <td className="p-1.5 text-center num">{p.quantity ?? '—'}</td>
                  <td className="p-1.5 text-right">{p.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }


    if (type === 'REQUESTS') {
      const items = rd.requests || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-center">نوع</th>
                <th className="p-1.5 text-right">عنوان</th>
                <th className="p-1.5 text-center">اولویت</th>
                <th className="p-1.5 text-center">مقدار</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any, i: number) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-center text-[10px]">{r.requestType || '—'}</td>
                  <td className="p-1.5 text-right">{r.title || '—'}</td>
                  <td className="p-1.5 text-center text-[10px]">{r.priority || '—'}</td>
                  <td className="p-1.5 text-center num">{r.quantity ?? '—'} {r.unit || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'EVENTS') {
      const items = rd.events || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">موردی ثبت نشده</div>;
      return (
        <div className="overflow-x-auto bg-slate-50 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-1.5 text-right">#</th>
                <th className="p-1.5 text-center">نوع</th>
                <th className="p-1.5 text-right">عنوان</th>
                <th className="p-1.5 text-center">شروع</th>
                <th className="p-1.5 text-center">پایان</th>
                <th className="p-1.5 text-center">شدت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e: any, i: number) => (
                <tr key={e.id || i} className="border-t">
                  <td className="p-1.5 text-right num">{i + 1}</td>
                  <td className="p-1.5 text-center text-[10px]">{e.eventType || '—'}</td>
                  <td className="p-1.5 text-right">{e.title || '—'}</td>
                  <td className="p-1.5 text-center num" dir="ltr">{e.startTime || '—'}</td>
                  <td className="p-1.5 text-center num" dir="ltr">{e.endTime || '—'}</td>
                  <td className="p-1.5 text-center text-[10px]">{e.severity || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (type === 'ATTACHMENTS') {
      const items = rd.attachments || [];
      if (items.length === 0) return <div className="text-xs text-slate-400 p-2">پیوستی وجود ندارد</div>;
      return (
        <div className="bg-slate-50 rounded-lg p-2 space-y-1">
          {items.map((a: any, i: number) => (
            <div key={a.id || i} className="text-xs flex items-center gap-2">
              <span className="text-slate-400">📎</span>
              <a href={withAuthToken(a.fileUrl || a.url)} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                {a.title || a.filename || 'پیوست ' + (i + 1)}
              </a>
            </div>
          ))}
        </div>
      );
    }

    return <div className="text-xs text-slate-400 p-2">محتوای این بخش قابل نمایش نیست</div>;
  };

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
      if (e?.response?.data?.code === 'BUDGET_EXCEEDED' && actionItem?.action === 'approve') {
        setBudgetWarning({ item: actionItem.item, detail: e.response.data.detail });
        setActionItem(null);
        setReason('');
        return;
      }
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceApprove = async () => {
    if (!budgetWarning) return;
    try {
      await approvalsApi.approve(budgetWarning.item.module, budgetWarning.item.id, undefined, true);
      toast.success('با وجود هشدار بودجه تأیید شد');
      setBudgetWarning(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
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
                  openSectionsModal(item);
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

      {sectionsModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  تأیید بخش‌بخش — {sectionsModalItem.title}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  کد: <span className="num font-medium" dir="ltr">{sectionsModalItem.code}</span>
                </p>
              </div>
              <button
                onClick={() => { setSectionsModalItem(null); setSections([]); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {sectionsLoading ? (
                <div className="py-12 text-center text-slate-400">در حال بارگذاری...</div>
              ) : sections.length === 0 ? (
                <div className="py-12 text-center text-slate-400">بخشی یافت نشد</div>
              ) : (
                <div className="space-y-2">
                  {[...sections]
                    .sort((a: any, b: any) => SECTION_ORDER.indexOf(a.sectionType) - SECTION_ORDER.indexOf(b.sectionType))
                    .map((s: any) => {
                      const isExpanded = expandedSection === s.sectionType;
                      return (
                        <div key={s.id || s.sectionType} className="border rounded-lg overflow-hidden">
                          <div
                            className="p-3 flex items-center gap-3 flex-wrap cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedSection(isExpanded ? null : s.sectionType)}
                          >
                            <div className="flex-1 min-w-[180px]">
                              <div className="font-medium text-slate-800 flex items-center gap-2">
                                <span className={clsx('text-slate-400 transition-transform', isExpanded ? 'rotate-90' : '')}>▶</span>
                                {SECTION_LABELS[s.sectionType] || s.sectionType}
                              </div>
                              {s.rejectedReason && (
                                <div className="text-xs text-red-600 mt-1 pr-5">دلیل رد: {s.rejectedReason}</div>
                              )}
                            </div>
                            <span className={clsx('text-xs px-2 py-1 rounded border', SECTION_STATUS_COLORS[s.status] || 'bg-slate-100')}>
                              {SECTION_STATUS_LABELS[s.status] || s.status}
                            </span>
                            {(s.status === 'PENDING' || s.status === 'REJECTED') && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => approveSection(s.sectionType)}
                                  disabled={sectionsBusy === s.sectionType}
                                  className="btn-primary text-xs px-3 py-1"
                                >
                                  {sectionsBusy === s.sectionType ? '...' : 'تأیید'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openSectionReject(s.sectionType)}
                                  disabled={sectionsBusy === s.sectionType}
                                  className="btn-danger text-xs px-3 py-1"
                                >
                                  رد
                                </button>
                              </div>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="p-3 pt-0 border-t bg-white">
                              {renderSectionContent(s.sectionType)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                ℹ️ پس از تایید همه بخش‌ها، گزارش خودکار تایید می‌شود
              </div>
              <button
                onClick={() => { setSectionsModalItem(null); setSections([]); }}
                className="btn-secondary"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {sectionRejectDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">
              رد بخش «{SECTION_LABELS[sectionRejectDialog.type] || sectionRejectDialog.type}»
            </h3>
            <textarea
              rows={3}
              value={sectionRejectReason}
              onChange={(e) => setSectionRejectReason(e.target.value)}
              placeholder="دلیل رد بخش..."
              className="input w-full resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setSectionRejectDialog(null)} className="btn-secondary">انصراف</button>
              <button
                onClick={confirmSectionReject}
                disabled={!sectionRejectReason.trim() || !!sectionsBusy}
                className="btn-danger"
              >
                رد بخش
              </button>
            </div>
          </div>
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

      {budgetWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">
                    هشدار بودجه — {budgetWarning.item.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    کد: <span className="num font-medium">{budgetWarning.item.code}</span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm space-y-2">
                <BudgetRow label="بودجه مصوب" value={budgetWarning.detail.budget} />
                <BudgetRow label="تعهدات قبلی" value={budgetWarning.detail.committed} />
                <BudgetRow label="واقعی (فاکتورها)" value={budgetWarning.detail.actual} />
                <BudgetRow label="این دستور خرید" value={budgetWarning.detail.currentPO} highlight />
                <div className="border-t border-amber-300 my-2" />
                <BudgetRow label="مجموع پیش‌بینی‌شده" value={budgetWarning.detail.projectedTotal} />
                <BudgetRow label="آستانه مجاز" value={budgetWarning.detail.threshold} />
                {budgetWarning.detail.overBudget > 0 && (
                  <BudgetRow label="مازاد بر بودجه" value={budgetWarning.detail.overBudget} danger />
                )}
              </div>

              <p className="text-xs text-slate-500 mb-4">
                با تأیید، سند بدون توجه به هشدار بودجه ثبت می‌شود. ادامه می‌دهید؟
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button onClick={() => setBudgetWarning(null)} className="btn-secondary">
                  انصراف
                </button>
                <button onClick={handleForceApprove} className="btn-danger">
                  تأیید با وجود هشدار
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

function ApprovalCard({ item, onApprove, onReject, onNavigate, onPay, onEdit }: any) {

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
            {isDailyReport && item.status === 'REJECTED' && (
              <button
                onClick={onEdit}
                className="btn-primary text-sm py-1.5 px-4"
              >
                <Edit className="w-4 h-4" />
                اصلاح و ارسال
              </button>
            )}
            {isDailyReport && item.status !== 'REJECTED' && (
              <button
                onClick={onNavigate}
                className="btn-primary text-sm py-1.5 px-4"
              >
                <CheckCircle2 className="w-4 h-4" />
                بررسی بخش‌ها
              </button>
            )}
            {!isDailyReport && (
              <>
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
              </>
            )}
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

function BudgetRow({ label, value, highlight, danger }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}:</span>
      <span className={
        'num font-bold ' +
        (danger ? 'text-red-600' : highlight ? 'text-amber-700' : 'text-slate-800')
      }>
        {Number(value || 0).toLocaleString('fa-IR')}
      </span>
    </div>
  );
}
