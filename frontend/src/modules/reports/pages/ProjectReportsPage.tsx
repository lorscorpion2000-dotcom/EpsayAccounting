import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Printer, RefreshCw, Building2, FileText, Package, Users, Truck, Wallet, TrendingUp, BarChart3, ClipboardList, Briefcase, FileSpreadsheet, PieChart, Clock } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/services/api';
import PrintHeader from '@/components/PrintHeader';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';
import { todayLocalISO, firstDayOfCurrentJalaliYearISO } from '@/utils/local-date';

type Tab =
  | 'overview'
  | 'accounting'
  | 'budget'
  | 'warehouse'
  | 'fixedAssets'
  | 'workerStatements'
  | 'subcontractorStatements'
  | 'clientStatements'
  | 'contracts'
  | 'payroll'
  | 'equipment'
  | 'siteOps'
  | 'cashFlow'
  | 'costByCategory'
  | 'aging'
  | 'progressVsCost'
  | 'vat';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'خلاصه', icon: BarChart3 },
  { key: 'accounting', label: 'حسابداری', icon: FileText },
  { key: 'budget', label: 'بودجه', icon: TrendingUp },
  { key: 'warehouse', label: 'انبار', icon: Package },
  { key: 'fixedAssets', label: 'دارایی ثابت', icon: Building2 },
  { key: 'workerStatements', label: 'صورت‌وضعیت پرسنل', icon: Users },
  { key: 'subcontractorStatements', label: 'صورت‌وضعیت پیمانکار', icon: Users },
  { key: 'clientStatements', label: 'صورت‌وضعیت کارفرما', icon: FileSpreadsheet },
  { key: 'contracts', label: 'قراردادها', icon: Briefcase },
  { key: 'payroll', label: 'حقوق و دستمزد', icon: Wallet },
  { key: 'equipment', label: 'ماشین‌آلات', icon: Truck },
  { key: 'siteOps', label: 'گزارش روزانه', icon: ClipboardList },
  { key: 'cashFlow', label: 'جریان نقدی', icon: Wallet },
  { key: 'costByCategory', label: 'هزینه به تفکیک', icon: PieChart },
  { key: 'aging', label: 'سنین مطالبات', icon: Clock },
  { key: 'progressVsCost', label: 'پیشرفت vs هزینه', icon: TrendingUp },
  { key: 'vat', label: 'مالیات ارزش افزوده', icon: FileText },
];

export default function ProjectReportsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [from, setFrom] = useState<string>(() => firstDayOfCurrentJalaliYearISO());
  const [to, setTo] = useState<string>(() => todayLocalISO());

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await api.get('/reports/project/' + id, { params });
      setData(r.data);
    } catch { toast.error('خطا در بارگذاری گزارشات'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load();   }, [id]);

  if (loading) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="btn-secondary"><ArrowRight className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-600" />
              گزارشات پروژه
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{data.project.name}</span>
              <span className="num text-xs ms-2" dir="ltr">({data.project.code})</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4" /> چاپ</button>
        </div>
      </div>

      {/* فیلتر تاریخ */}
      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">از تاریخ</label>
            <PersianDatePicker value={from} onChange={(v) => setFrom(v || '')} />
          </div>
          <div>
            <label className="label">تا تاریخ</label>
            <PersianDatePicker value={to} onChange={(v) => setTo(v || '')} />
          </div>
          <button onClick={load} className="btn-primary">اعمال فیلتر</button>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="card overflow-hidden no-print">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={printRef}>
        <PrintHeader title={'گزارشات پروژه — ' + data.project.name} subtitle={'کد: ' + data.project.code} />

        {tab === 'overview' && <Overview data={data} />}
        {tab === 'accounting' && <AccountingTab data={data.accounting} />}
        {tab === 'budget' && <BudgetTab data={data.budget} />}
        {tab === 'warehouse' && <WarehouseTab data={data.warehouse} />}
        {tab === 'fixedAssets' && <FixedAssetsTab data={data.fixedAssets} />}
        {tab === 'workerStatements' && <WorkerStmtsTab data={data.workerStatements} />}
        {tab === 'subcontractorStatements' && <SubStmtsTab data={data.subcontractorStatements} />}
        {tab === 'clientStatements' && <ClientStmtsTab data={data.clientStatements} />}
        {tab === 'contracts' && <ContractsTab data={data.contracts} />}
        {tab === 'payroll' && <PayrollTab data={data.payroll} />}
        {tab === 'equipment' && <EquipmentTab data={data.equipment} />}
        {tab === 'siteOps' && <SiteOpsTab data={data.siteOps} />}
        {tab === 'cashFlow' && <CashFlowTab data={data.cashFlow} />}
        {tab === 'costByCategory' && <CostByCategoryTab data={data.costByCategory} />}
        {tab === 'aging' && <AgingTab data={data.aging} />}
        {tab === 'progressVsCost' && <ProgressVsCostTab data={data.progressVsCost} />}
        {tab === 'vat' && <VatTab projectId={data.project?.id} />}
      </div>
    </div>
  );
}

// ═══════ Components ═══════

function Overview({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="سود/زیان" value={data.accounting.profitLoss.profit} highlight />
        <Card title="جمع بودجه" value={data.kpi.totalBudget} />
        <Card title="مصرف بودجه" value={data.kpi.totalExpense} />
        <Card title="درصد مصرف" value={data.kpi.percentUsed} isPercent />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniCard label="قراردادها" value={data.contracts.projectContracts.count} />
        <MiniCard label="صورت‌وضعیت‌ها" value={data.workerStatements.count + data.subcontractorStatements.count + data.clientStatements.count} />
        <MiniCard label="گزارش روزانه" value={data.siteOps.reportCount} />
      </div>
    </div>
  );
}

function AccountingTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="سود/زیان" value={data.profitLoss.profit} highlight />
        <Card title="جمع درآمد" value={data.profitLoss.totalRevenue} />
        <Card title="جمع هزینه" value={data.profitLoss.totalExpense} />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">گردش حساب‌ها ({data.entryCount} سند)</div>
        <Table
          headers={['کد', 'نام حساب', 'بدهکار', 'بستانکار', 'مانده']}
          rows={data.accounts.map((a: any) => [a.code, a.name, fmt(a.debit), fmt(a.credit), fmt(a.balance)])}
        />
      </div>
    </div>
  );
}

function BudgetTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="بودجه" value={data.totalBudget} />
        <Card title="واقعی" value={data.totalActual} />
        <Card title="انحراف" value={data.variance} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">ردیف‌های بودجه ({data.percentUsed}٪ مصرف)</div>
        <Table
          headers={['کد WBS', 'عنوان', 'مبلغ بودجه (ریال)']}
          rows={data.lines.map((l: any) => [l.wbsCode, l.wbsTitle, fmt(l.amount)])}
        />
      </div>
    </div>
  );
}

function WarehouseTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="تعداد رسید" value={data.receiptCount} isCount />
        <Card title="ورود (ریال)" value={data.totalIn} />
        <Card title="خروج (ریال)" value={data.totalOut} />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">مصرف کالا</div>
        <Table
          headers={['کد', 'کالا', 'واحد', 'مقدار', 'ارزش (ریال)']}
          rows={data.consumption.map((c: any) => [c.itemCode, c.itemName, c.unit, toPersianDigits(c.quantity), fmt(c.value)])}
        />
      </div>
    </div>
  );
}

function FixedAssetsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="تعداد" value={data.count} isCount />
        <Card title="بهای تمام‌شده" value={data.totalCost} />
        <Card title="ارزش دفتری" value={data.totalBookValue} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">اقلام دارایی</div>
        <Table
          headers={['کد', 'نام', 'بهای خرید', 'استهلاک', 'ارزش دفتری']}
          rows={data.items.map((a: any) => [a.code, a.name, fmt(a.acquisitionCost), fmt(a.accumulatedDepreciation), fmt(a.bookValue)])}
        />
      </div>
    </div>
  );
}

function WorkerStmtsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="تعداد" value={data.count} isCount />
        <Card title="جمع پرداختی" value={data.totalEarnings} />
        <Card title="خالص" value={data.totalNet} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">صورت‌وضعیت‌ها</div>
        <Table
          headers={['کد', 'پرسنل', 'دوره', 'پرداختی', 'خالص', 'وضعیت']}
          rows={data.items.map((w: any) => [w.code, w.partnerName, formatJalaliDate(w.periodStart) + ' — ' + formatJalaliDate(w.periodEnd), fmt(w.totalEarnings), fmt(w.netPayable), w.status])}
        />
      </div>
    </div>
  );
}

function SubStmtsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="تعداد" value={data.count} isCount />
        <Card title="جمع" value={data.totalAmount} />
        <Card title="خالص" value={data.totalNet} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">صورت‌وضعیت‌ها</div>
        <Table
          headers={['کد', 'پیمانکار', 'شماره', 'دوره', 'خالص', 'وضعیت']}
          rows={data.items.map((x: any) => [x.code, x.contractorName, toPersianDigits(x.statementNumber), formatJalaliDate(x.periodStart) + ' — ' + formatJalaliDate(x.periodEnd), fmt(x.netPayable), x.status])}
        />
      </div>
    </div>
  );
}

function ClientStmtsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="تعداد" value={data.count} isCount />
        <Card title="خالص" value={data.totalNet} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">صورت‌وضعیت‌ها</div>
        <Table
          headers={['کد', 'شماره', 'دوره', 'قبل از ضریب', 'خالص', 'وضعیت']}
          rows={data.items.map((x: any) => [x.code, toPersianDigits(x.statementNumber), formatJalaliDate(x.periodStart) + ' — ' + formatJalaliDate(x.periodEnd), fmt(x.totalBefore), fmt(x.netPayable), x.status])}
        />
      </div>
    </div>
  );
}

function ContractsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">قراردادهای پروژه ({data.projectContracts.count})</div>
        <Table
          headers={['کد', 'نوع', 'مبلغ پایه', 'ضریب', 'وضعیت']}
          rows={data.projectContracts.items.map((c: any) => [c.code, c.type, fmt(c.baseAmount), toPersianDigits(c.coefficient), c.status])}
        />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">قراردادهای حقوقی ({data.legalContracts.count})</div>
        <Table
          headers={['کد', 'نوع', 'عنوان', 'مبلغ', 'وضعیت']}
          rows={data.legalContracts.items.map((c: any) => [c.code, c.kind, c.title, fmt(c.totalAmount), c.status])}
        />
      </div>
    </div>
  );
}

function PayrollTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="دوره‌ها" value={data.periodCount} isCount />
        <Card title="جمع ناخالص" value={data.totalGross} />
        <Card title="جمع خالص" value={data.totalNet} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">دوره‌های حقوق</div>
        <Table
          headers={['کد', 'عنوان', 'سال/ماه', 'ناخالص', 'خالص', 'وضعیت']}
          rows={data.items.map((p: any) => [p.code, p.title, p.year + '/' + p.month, fmt(p.totalGross), fmt(p.totalNet), p.status])}
        />
      </div>
    </div>
  );
}

function EquipmentTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="لاگ‌ها" value={data.logCount} isCount />
        <Card title="ساعت کارکرد" value={data.totalHours} isCount />
        <Card title="هزینه کل" value={data.totalCost} highlight />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">کارکرد ماشین‌آلات</div>
        <Table
          headers={['کد', 'نام', 'تاریخ', 'ساعت', 'سوخت (L)', 'هزینه']}
          rows={data.items.map((l: any) => [l.equipmentCode, l.equipmentName, formatJalaliDate(l.logDate), toPersianDigits(l.workHours), toPersianDigits(l.fuelLiters), fmt(l.computedCost)])}
        />
      </div>
    </div>
  );
}

function SiteOpsTab({ data }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="تعداد گزارش" value={data.reportCount} isCount />
      </div>
      <div className="card p-4">
        <div className="font-bold text-slate-800 mb-3">گزارش‌های روزانه</div>
        <Table
          headers={['کد', 'تاریخ', 'آب‌وهوا', 'وضعیت']}
          rows={data.items.map((r: any) => [r.code, formatJalaliDate(r.reportDate), r.weather || '—', r.status])}
        />
      </div>
    </div>
  );
}

// ═══════ Helpers ═══════

function fmt(v: any): string {
  return formatNumber(Math.round(Number(v) || 0));
}

function Card({ title, value, highlight, isPercent, isCount }: any) {
  let display: string;
  if (isPercent) display = (Number(value) || 0).toFixed(2) + '٪';
  else if (isCount) display = toPersianDigits(Number(value) || 0);
  else display = formatNumber(Math.round(Number(value) || 0)) + ' ریال';
  return (
    <div className={clsx('card p-4', highlight ? 'bg-brand-50 border-brand-200' : '')}>
      <div className="text-xs text-slate-500 mb-1">{title}</div>
      <div className={clsx('text-lg font-bold num', highlight ? 'text-brand-700' : 'text-slate-800')} dir="ltr">
        {display}
      </div>
    </div>
  );
}

function MiniCard({ label, value }: any) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-bold num text-slate-800">{toPersianDigits(value)}</div>
    </div>
  );
}

function CashFlowTab({ data }: any) {
  if (!data) return <Empty />;
  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-emerald-700">ورودی نقدی</div>
          <div className="text-2xl font-bold num text-emerald-800">{fmt(data.inflow)}</div>
        </div>
        <div className="card p-4 bg-rose-50 border-rose-200">
          <div className="text-xs text-rose-700">خروجی نقدی</div>
          <div className="text-2xl font-bold num text-rose-800">{fmt(data.outflow)}</div>
        </div>
        <div className={clsx("card p-4", data.netCashFlow >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200")}>
          <div className={clsx("text-xs", data.netCashFlow >= 0 ? "text-blue-700" : "text-amber-700")}>جریان خالص</div>
          <div className={clsx("text-2xl font-bold num", data.netCashFlow >= 0 ? "text-blue-800" : "text-amber-800")}>{fmt(data.netCashFlow)}</div>
        </div>
      </div>
      {data.byMonth?.length > 0 && (
        <Table
          headers={['ماه', 'ورودی', 'خروجی', 'خالص']}
          rows={data.byMonth.map((m: any) => [m.month, fmt(m.in), fmt(m.out), fmt(m.net)])}
        />
      )}
    </div>
  );
}

function CostByCategoryTab({ data }: any) {
  if (!data) return <Empty />;
  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));
  return (
    <div className="space-y-4">
      <div className="card p-4 bg-slate-50">
        <div className="text-xs text-slate-500">جمع هزینهها</div>
        <div className="text-2xl font-bold num text-slate-800">{fmt(data.total)}</div>
      </div>
      <Table
        headers={['دسته', 'مبلغ', 'درصد']}
        rows={data.categories?.map((c: any) => [c.name, fmt(c.amount), c.percent.toFixed(2) + '%']) || []}
      />
    </div>
  );
}

function AgingTab({ data }: any) {
  if (!data) return <Empty />;
  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-2 text-emerald-700">مطالبات (AR) — جمع: {fmt(data.receivable?.total)}</h3>
        <Table
          headers={['بازه', 'مبلغ']}
          rows={Object.entries(data.receivable?.buckets || {}).map(([k, v]: any) => [k, fmt(v)])}
        />
      </div>
      <div>
        <h3 className="font-bold mb-2 text-rose-700">بدهیها (AP) — جمع: {fmt(data.payable?.total)}</h3>
        <Table
          headers={['بازه', 'مبلغ']}
          rows={Object.entries(data.payable?.buckets || {}).map(([k, v]: any) => [k, fmt(v)])}
        />
      </div>
    </div>
  );
}

function ProgressVsCostTab({ data }: any) {
  if (!data) return <Empty />;
  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3"><div className="text-xs text-slate-500">بودجه</div><div className="text-xl font-bold num">{fmt(data.totalBudget)}</div></div>
        <div className="card p-3"><div className="text-xs text-slate-500">هزینه</div><div className="text-xl font-bold num">{fmt(data.totalCost)}</div></div>
        <div className="card p-3"><div className="text-xs text-slate-500">پیشرفت</div><div className="text-xl font-bold num">{data.averageProgress}%</div></div>
        <div className="card p-3"><div className="text-xs text-slate-500">هشدارها</div><div className="text-xl font-bold num text-amber-600">{data.warningCount}</div></div>
      </div>
      <Table
        headers={['کد', 'عنوان', 'پیشرفت', 'هزینه', 'بودجه', 'درصد هزینه', 'انحراف', 'وضعیت']}
        rows={data.rows?.map((r: any) => [
          r.code, r.title,
          r.progress + '%',
          fmt(r.cost), fmt(r.budget),
          r.costPercent + '%',
          (r.deviation > 0 ? '+' : '') + r.deviation + '%',
          r.status === 'OK' ? '✓' : r.status === 'WARNING' ? '⚠' : '⚠⚠',
        ]) || []}
      />
    </div>
  );
}

function Empty() {
  return <div className="card p-12 text-center text-slate-400 text-sm">دادهای موجود نیست</div>;
}
function VatTab({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const from = firstDayOfCurrentJalaliYearISO();
    const to = todayLocalISO();
    api.get('/reports/vat', { params: { from, to, projectId } })
      .then((r) => setData(r.data))
      .catch(() => toast.error('خطا در بارگذاری گزارش مالیات'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /></div>;
  if (!data) return <Empty />;

  const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-3 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-emerald-700">فروش (مبنا)</div>
          <div className="text-lg font-bold num">{fmt(data.totals?.salesBase)}</div>
        </div>
        <div className="card p-3 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-emerald-700">مالیات فروش</div>
          <div className="text-lg font-bold num">{fmt(data.totals?.salesVat)}</div>
        </div>
        <div className="card p-3 bg-rose-50 border-rose-200">
          <div className="text-xs text-rose-700">خرید (مبنا)</div>
          <div className="text-lg font-bold num">{fmt(data.totals?.purchaseBase)}</div>
        </div>
        <div className="card p-3 bg-rose-50 border-rose-200">
          <div className="text-xs text-rose-700">مالیات خرید</div>
          <div className="text-lg font-bold num">{fmt(data.totals?.purchaseVat)}</div>
        </div>
        <div className={clsx("card p-3", (data.totals?.netPayable || 0) >= 0 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200")}>
          <div className="text-xs text-slate-700">قابل پرداخت</div>
          <div className="text-lg font-bold num">{fmt(data.totals?.netPayable)}</div>
        </div>
      </div>

      {data.byMonth?.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 text-slate-700">ریز ماهانه</h3>
          <Table
            headers={['ماه', 'مالیات فروش', 'مالیات خرید', 'خالص']}
            rows={data.byMonth.map((m: any) => [m.yearMonth, fmt(m.salesVat), fmt(m.purchaseVat), fmt(m.net)])}
          />
        </div>
      )}

      {data.sales?.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 text-emerald-700">فروش ({data.sales.length})</h3>
          <Table
            headers={['کد سند', 'تاریخ', 'مبنا', 'مالیات']}
            rows={data.sales.slice(0, 50).map((x: any) => [x.entryCode, formatJalaliDate(x.entryDate), fmt(x.baseAmount), fmt(x.vatAmount)])}
          />
        </div>
      )}

      {data.purchases?.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 text-rose-700">خرید ({data.purchases.length})</h3>
          <Table
            headers={['کد سند', 'تاریخ', 'مبنا', 'مالیات']}
            rows={data.purchases.slice(0, 50).map((x: any) => [x.entryCode, formatJalaliDate(x.entryDate), fmt(x.baseAmount), fmt(x.vatAmount)])}
          />
        </div>
      )}
    </div>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  if (!rows || rows.length === 0) {
    return <div className="p-6 text-center text-slate-400 text-sm">داده‌ای برای نمایش نیست</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={clsx('px-3 py-2 font-medium text-slate-600', i < 2 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              {r.map((c, j) => (
                <td key={j} className={clsx('px-3 py-2 num text-xs', j < 2 ? 'text-right text-slate-700' : 'text-left text-slate-600')} dir="ltr">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
