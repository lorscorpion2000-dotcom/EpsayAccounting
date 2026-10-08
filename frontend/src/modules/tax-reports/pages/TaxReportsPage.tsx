import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, Receipt, FileText, ShieldCheck, Download,
  TrendingUp, TrendingDown, Users, DollarSign, Filter, Info,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { taxReportsApi } from '../services/tax-reports.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { PERSIAN_MONTHS_ADJ } from '@/types/adjustment';
import type { VATReport, PayrollTaxReport, InsuranceReport } from '@/types/tax-reports';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';

type Tab = 'vat' | 'payroll' | 'insurance';

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function startOfYearISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(y, 2, 21);
  if (start > d) start.setFullYear(y - 1);
  return start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
}

export default function TaxReportsPage() {
  const [tab, setTab] = useState<Tab>('vat');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // VAT
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [projectFilter, setProjectFilter] = useState('');
  const [vatData, setVatData] = useState<VATReport | null>(null);

  // Payroll
  const currentYear = new Date().getFullYear() - 621 + (new Date().getMonth() >= 2 ? 1 : 0);
  const [payYear, setPayYear] = useState(currentYear);
  const [payMonth, setPayMonth] = useState(1);
  const [payProjectFilter, setPayProjectFilter] = useState('');
  const [payrollData, setPayrollData] = useState<PayrollTaxReport | null>(null);

  // Insurance
  const [insYear, setInsYear] = useState(currentYear);
  const [insMonth, setInsMonth] = useState(1);
  const [insProjectFilter, setInsProjectFilter] = useState('');
  const [insuranceData, setInsuranceData] = useState<InsuranceReport | null>(null);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);
  }, []);

  const loadVAT = async () => {
    setLoading(true);
    try {
      setVatData(await taxReportsApi.vat({
        fromDate, toDate,
        projectId: projectFilter || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const loadPayrollTax = async () => {
    setLoading(true);
    try {
      setPayrollData(await taxReportsApi.payrollTax({
        year: payYear, month: payMonth,
        projectId: payProjectFilter || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  const loadInsurance = async () => {
    setLoading(true);
    try {
      setInsuranceData(await taxReportsApi.insurance({
        year: insYear, month: insMonth,
        projectId: insProjectFilter || undefined,
      }));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'خطا'); }
    finally { setLoading(false); }
  };

  // ═══ Excel export helpers ═══
  const exportVAT = () => {
    if (!vatData) return;
    const all = [...vatData.purchases, ...vatData.sales].map((r, i) => ({
      'ردیف': i + 1,
      'نوع': r.type === 'PURCHASE' ? 'خرید' : 'فروش',
      'کد': r.code,
      'شماره فاکتور': r.invoiceNumber,
      'تاریخ': formatJalaliDate(r.invoiceDate),
      'طرف حساب': r.partyName,
      'کد ملی': r.partyNationalId || '',
      'پروژه': r.projectName || '',
      'مبلغ خالص': r.subtotal,
      'درصد مالیات': r.taxPercent,
      'مبلغ مالیات': r.taxAmount,
      'جمع کل': r.totalAmount,
    }));
    exportToExcel(all, 'vat-report');
  };

  const exportPayrollTax = () => {
    if (!payrollData) return;
    const rows = payrollData.rows.map((r, i) => ({
      'ردیف': i + 1,
      'کد پرسنلی': r.employeeCode,
      'نام': r.employeeName,
      'کد ملی': r.nationalId || '',
      'شماره بیمه': r.insuranceNumber || '',
      'وضعیت تاهل': r.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد',
      'تعداد فرزند': r.childrenCount || 0,
      'روز کارکرد': r.workDays,
      'حقوق ناخالص': r.grossSalary,
      'حقوق پایه': r.baseSalary,
      'حق مسکن': r.housingAllow,
      'خواربار': r.foodAllow,
      'حق اولاد': r.childAllow,
      'اضافه‌کار': r.overtimeAmount,
      'پاداش': r.bonusAmount,
      'بیمه سهم کارگر': r.insuranceAmount,
      'درصد مالیات': r.taxPercent,
      'مالیات': r.taxAmount,
      'حقوق خالص': r.netSalary,
    }));
    exportToExcel(rows, 'payroll-tax');
  };

  const exportInsurance = () => {
    if (!insuranceData) return;
    const rows = insuranceData.rows.map((r, i) => ({
      'ردیف': i + 1,
      'شماره بیمه': r.insuranceNumber,
      'کد پرسنلی': r.employeeCode,
      'نام': r.employeeName,
      'کد ملی': r.nationalId || '',
      'وضعیت تاهل': r.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد',
      'تعداد فرزند': r.childrenCount,
      'روز کارکرد': r.workDays,
      'حقوق ناخالص': r.grossSalary,
      'بیمه سهم کارگر (7٪)': r.employeeShare,
      'بیمه سهم کارفرما (23٪)': r.employerShare,
      'جمع بیمه': r.totalInsurance,
    }));
    exportToExcel(rows, 'insurance');
  };

  const exportToExcel = (rows: any[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, name + '-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('فایل دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            گزارش‌های مالیاتی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ارزش افزوده، مالیات بر حقوق و لیست بیمه تأمین اجتماعی
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {[
            { key: 'vat' as Tab, label: 'ارزش افزوده', icon: Receipt },
            { key: 'payroll' as Tab, label: 'مالیات بر حقوق', icon: Users },
            { key: 'insurance' as Tab, label: 'لیست بیمه', icon: ShieldCheck },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={clsx('flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 1: VAT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'vat' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="label">از تاریخ</label>
                <PersianDatePicker value={fromDate} onChange={setFromDate} />
              </div>
              <div>
                <label className="label">تا تاریخ</label>
                <PersianDatePicker value={toDate} onChange={setToDate} />
              </div>
              <div>
                <label className="label">پروژه</label>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
                  <option value="">همه پروژه‌ها</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadVAT} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {vatData && (
                  <button onClick={exportVAT} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {vatData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> ارزش افزوده خرید
                  </div>
                  <div className="text-xl font-bold num mt-1 text-blue-600">
                    {toPersianDigits(vatData.summary.inputVAT.toLocaleString())}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ({toPersianDigits(vatData.summary.purchaseCount)} فاکتور)
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> ارزش افزوده فروش
                  </div>
                  <div className="text-xl font-bold num mt-1 text-amber-600">
                    {toPersianDigits(vatData.summary.outputVAT.toLocaleString())}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ({toPersianDigits(vatData.summary.salesCount)} فاکتور)
                  </div>
                </div>
                <div className={clsx('card p-4 border-s-4',
                  vatData.summary.netVAT >= 0 ? 'border-s-red-500' : 'border-s-emerald-500')}>
                  <div className="text-xs text-slate-500">خالص</div>
                  <div className={clsx('text-xl font-bold num mt-1',
                    vatData.summary.netVAT >= 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {toPersianDigits(Math.abs(vatData.summary.netVAT).toLocaleString())}
                  </div>
                </div>
                <div className="card p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">وضعیت</div>
                  <div className={clsx('text-base font-bold mt-1',
                    vatData.summary.netVAT >= 0 ? 'text-red-700' : 'text-emerald-700')}>
                    {vatData.summary.netVAT >= 0 ? 'قابل پرداخت' : 'قابل استرداد'}
                  </div>
                </div>
              </div>

              {/* Purchases Table */}
              {vatData.purchases.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 border-b bg-blue-50/50 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-700 text-sm">فاکتورهای خرید ({toPersianDigits(vatData.purchases.length)})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1000px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-center px-2 py-2 w-24">تاریخ</th>
                          <th className="text-right px-2 py-2 w-24">ش. فاکتور</th>
                          <th className="text-right px-2 py-2">تأمین‌کننده</th>
                          <th className="text-right px-2 py-2 w-32">پروژه</th>
                          <th className="text-left px-2 py-2 w-28">مبلغ خالص</th>
                          <th className="text-center px-2 py-2 w-16">٪</th>
                          <th className="text-left px-2 py-2 w-28">مالیات</th>
                          <th className="text-left px-2 py-2 w-28">جمع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vatData.purchases.map((r, i) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-center num">{formatJalaliDate(r.invoiceDate)}</td>
                            <td className="px-2 py-2 text-right num font-mono text-xs" dir="ltr">{r.invoiceNumber}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{r.partyName}</td>
                            <td className="px-2 py-2 text-right text-slate-500 text-[10px]">{r.projectName || '—'}</td>
                            <td className="px-2 py-2 text-left num">{toPersianDigits(r.subtotal.toLocaleString())}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.taxPercent)}</td>
                            <td className="px-2 py-2 text-left num text-blue-700 font-bold">{toPersianDigits(r.taxAmount.toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num">{toPersianDigits(r.totalAmount.toLocaleString())}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sales Table */}
              {vatData.sales.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-3 border-b bg-amber-50/50 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-700 text-sm">فاکتورهای فروش ({toPersianDigits(vatData.sales.length)})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1000px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-center px-2 py-2 w-24">تاریخ</th>
                          <th className="text-right px-2 py-2 w-24">ش. فاکتور</th>
                          <th className="text-right px-2 py-2">خریدار</th>
                          <th className="text-right px-2 py-2 w-32">پروژه</th>
                          <th className="text-left px-2 py-2 w-28">مبلغ خالص</th>
                          <th className="text-center px-2 py-2 w-16">٪</th>
                          <th className="text-left px-2 py-2 w-28">مالیات</th>
                          <th className="text-left px-2 py-2 w-28">جمع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vatData.sales.map((r, i) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-center num">{formatJalaliDate(r.invoiceDate)}</td>
                            <td className="px-2 py-2 text-right num font-mono text-xs" dir="ltr">{r.invoiceNumber}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{r.partyName}</td>
                            <td className="px-2 py-2 text-right text-slate-500 text-[10px]">{r.projectName || '—'}</td>
                            <td className="px-2 py-2 text-left num">{toPersianDigits(r.subtotal.toLocaleString())}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.taxPercent)}</td>
                            <td className="px-2 py-2 text-left num text-amber-700 font-bold">{toPersianDigits(r.taxAmount.toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num">{toPersianDigits(r.totalAmount.toLocaleString())}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {vatData.purchases.length === 0 && vatData.sales.length === 0 && (
                <div className="card p-12 text-center text-slate-400 text-sm">
                  هیچ فاکتوری در این بازه یافت نشد
                </div>
              )}
            </>
          )}

          {!vatData && !loading && (
            <div className="card p-12 text-center text-slate-400 text-sm">
              برای مشاهده گزارش، بازه تاریخ را انتخاب و «نمایش» بزنید.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 2: Payroll Tax */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'payroll' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="label">سال</label>
                <input type="number" value={payYear} onChange={(e) => setPayYear(Number(e.target.value))} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">ماه</label>
                <select value={payMonth} onChange={(e) => setPayMonth(Number(e.target.value))} className="input">
                  {PERSIAN_MONTHS_ADJ.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">پروژه</label>
                <select value={payProjectFilter} onChange={(e) => setPayProjectFilter(e.target.value)} className="input">
                  <option value="">همه</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadPayrollTax} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {payrollData && (
                  <button onClick={exportPayrollTax} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {payrollData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">تعداد پرسنل</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(payrollData.totals.employees)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">جمع حقوق ناخالص</div>
                  <div className="text-xl font-bold num mt-1 text-blue-700">
                    {toPersianDigits(payrollData.totals.grossSalary.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">جمع بیمه سهم کارگر</div>
                  <div className="text-xl font-bold num mt-1 text-amber-700">
                    {toPersianDigits(payrollData.totals.insuranceAmount.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4 border-s-4 border-s-red-500">
                  <div className="text-xs text-slate-500">جمع مالیات</div>
                  <div className="text-xl font-bold num mt-1 text-red-700">
                    {toPersianDigits(payrollData.totals.taxAmount.toLocaleString())}
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm">
                    لیست مالیات حقوق {PERSIAN_MONTHS_ADJ[payMonth - 1]} {toPersianDigits(payYear)}
                  </span>
                </div>
                {payrollData.rows.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">رکوردی یافت نشد</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1200px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2 w-24">کد پرسنلی</th>
                          <th className="text-right px-2 py-2">نام</th>
                          <th className="text-center px-2 py-2 w-24">کد ملی</th>
                          <th className="text-center px-2 py-2 w-24">ش. بیمه</th>
                          <th className="text-center px-2 py-2 w-20">وضعیت</th>
                          <th className="text-center px-2 py-2 w-16">فرزند</th>
                          <th className="text-center px-2 py-2 w-16">روز</th>
                          <th className="text-left px-2 py-2 w-24">حقوق ناخالص</th>
                          <th className="text-left px-2 py-2 w-24">بیمه</th>
                          <th className="text-center px-2 py-2 w-16">٪ مالیات</th>
                          <th className="text-left px-2 py-2 w-24">مالیات</th>
                          <th className="text-left px-2 py-2 w-24">خالص</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payrollData.rows.map((r, i) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-right num font-mono text-xs" dir="ltr">{r.employeeCode}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{r.employeeName}</td>
                            <td className="px-2 py-2 text-center num text-xs" dir="ltr">{r.nationalId || '—'}</td>
                            <td className="px-2 py-2 text-center num text-xs" dir="ltr">{r.insuranceNumber || '—'}</td>
                            <td className="px-2 py-2 text-center text-xs">
                              {r.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد'}
                            </td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.childrenCount || 0)}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.workDays)}</td>
                            <td className="px-2 py-2 text-left num text-blue-700">
                              {toPersianDigits(r.grossSalary.toLocaleString())}
                            </td>
                            <td className="px-2 py-2 text-left num text-amber-700">
                              {toPersianDigits(r.insuranceAmount.toLocaleString())}
                            </td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.taxPercent)}</td>
                            <td className="px-2 py-2 text-left num text-red-700 font-bold">
                              {toPersianDigits(r.taxAmount.toLocaleString())}
                            </td>
                            <td className="px-2 py-2 text-left num font-bold">
                              {toPersianDigits(r.netSalary.toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 font-bold">
                        <tr>
                          <td colSpan={8} className="px-2 py-3 text-right text-slate-700">جمع کل:</td>
                          <td className="px-2 py-3 text-left num text-blue-700">{toPersianDigits(payrollData.totals.grossSalary.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-amber-700">{toPersianDigits(payrollData.totals.insuranceAmount.toLocaleString())}</td>
                          <td></td>
                          <td className="px-2 py-3 text-left num text-red-700">{toPersianDigits(payrollData.totals.taxAmount.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num">{toPersianDigits(payrollData.totals.netSalary.toLocaleString())}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {!payrollData && !loading && (
            <div className="card p-12 text-center text-slate-400 text-sm">
              برای مشاهده گزارش، سال و ماه را انتخاب و «نمایش» بزنید.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Tab 3: Insurance */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === 'insurance' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="label">سال</label>
                <input type="number" value={insYear} onChange={(e) => setInsYear(Number(e.target.value))} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">ماه</label>
                <select value={insMonth} onChange={(e) => setInsMonth(Number(e.target.value))} className="input">
                  {PERSIAN_MONTHS_ADJ.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">پروژه</label>
                <select value={insProjectFilter} onChange={(e) => setInsProjectFilter(e.target.value)} className="input">
                  <option value="">همه</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={loadInsurance} disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  نمایش
                </button>
                {insuranceData && (
                  <button onClick={exportInsurance} className="btn-secondary">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {insuranceData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">تعداد بیمه‌شدگان</div>
                  <div className="text-xl font-bold num mt-1">{toPersianDigits(insuranceData.totals.employees)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">جمع حقوق ناخالص</div>
                  <div className="text-xl font-bold num mt-1 text-blue-700">
                    {toPersianDigits(insuranceData.totals.grossSalary.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">سهم کارگر (7٪)</div>
                  <div className="text-xl font-bold num mt-1 text-amber-700">
                    {toPersianDigits(insuranceData.totals.employeeShare.toLocaleString())}
                  </div>
                </div>
                <div className="card p-4 border-s-4 border-s-emerald-500">
                  <div className="text-xs text-slate-500">جمع کل بیمه (30٪)</div>
                  <div className="text-xl font-bold num mt-1 text-emerald-700">
                    {toPersianDigits(insuranceData.totals.totalInsurance.toLocaleString())}
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">
                    لیست بیمه {PERSIAN_MONTHS_ADJ[insMonth - 1]} {toPersianDigits(insYear)}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> سهم کارفرما ۲۳٪ + کارگر ۷٪ = ۳۰٪
                  </span>
                </div>
                {insuranceData.rows.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">رکوردی یافت نشد</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[1100px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-center px-2 py-2 w-24">ش. بیمه</th>
                          <th className="text-right px-2 py-2 w-24">کد پرسنلی</th>
                          <th className="text-right px-2 py-2">نام</th>
                          <th className="text-center px-2 py-2 w-24">کد ملی</th>
                          <th className="text-center px-2 py-2 w-20">وضعیت</th>
                          <th className="text-center px-2 py-2 w-16">فرزند</th>
                          <th className="text-center px-2 py-2 w-16">روز</th>
                          <th className="text-left px-2 py-2 w-28">حقوق ناخالص</th>
                          <th className="text-left px-2 py-2 w-24">سهم کارگر</th>
                          <th className="text-left px-2 py-2 w-24">سهم کارفرما</th>
                          <th className="text-left px-2 py-2 w-28">جمع بیمه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insuranceData.rows.map((r, i) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-2 py-2 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-2 text-center num font-mono text-xs" dir="ltr">{r.insuranceNumber}</td>
                            <td className="px-2 py-2 text-right num font-mono text-xs" dir="ltr">{r.employeeCode}</td>
                            <td className="px-2 py-2 text-right text-slate-800">{r.employeeName}</td>
                            <td className="px-2 py-2 text-center num text-xs" dir="ltr">{r.nationalId || '—'}</td>
                            <td className="px-2 py-2 text-center text-xs">{r.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد'}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.childrenCount)}</td>
                            <td className="px-2 py-2 text-center num">{toPersianDigits(r.workDays)}</td>
                            <td className="px-2 py-2 text-left num text-blue-700">{toPersianDigits(r.grossSalary.toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num text-amber-700">{toPersianDigits(r.employeeShare.toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num text-purple-700">{toPersianDigits(r.employerShare.toLocaleString())}</td>
                            <td className="px-2 py-2 text-left num font-bold text-emerald-700">{toPersianDigits(r.totalInsurance.toLocaleString())}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 font-bold">
                        <tr>
                          <td colSpan={8} className="px-2 py-3 text-right text-slate-700">جمع کل:</td>
                          <td className="px-2 py-3 text-left num text-blue-700">{toPersianDigits(insuranceData.totals.grossSalary.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-amber-700">{toPersianDigits(insuranceData.totals.employeeShare.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-purple-700">{toPersianDigits(insuranceData.totals.employerShare.toLocaleString())}</td>
                          <td className="px-2 py-3 text-left num text-emerald-700">{toPersianDigits(insuranceData.totals.totalInsurance.toLocaleString())}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {!insuranceData && !loading && (
            <div className="card p-12 text-center text-slate-400 text-sm">
              برای مشاهده گزارش، سال و ماه را انتخاب و «نمایش» بزنید.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
