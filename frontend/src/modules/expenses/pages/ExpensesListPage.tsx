import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Filter, RefreshCw, ReceiptText, Settings } from 'lucide-react';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import clsx from 'clsx';
import { expensesApi, expenseCategoriesApi } from '../services/expenses.api';
import type { Expense, ExpenseCategory } from '@/types/expense';
import { formatNumber, toPersianDigits, formatJalaliDate } from '@/utils/format';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: 'پیش‌نویس',  color: 'bg-slate-100 text-slate-700' },
  SUBMITTED:  { label: 'ارسال‌شده', color: 'bg-amber-100 text-amber-800' },
  APPROVED:   { label: 'تأییدشده',  color: 'bg-blue-100 text-blue-800' },
  POSTED:     { label: 'ثبت‌شده',   color: 'bg-emerald-100 text-emerald-800' },
  REJECTED:   { label: 'ردشده',     color: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'لغوشده',    color: 'bg-slate-100 text-slate-500' },
};

export default function ExpensesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Expense[]>([]);
  const [cats, setCats] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ categoryId: '', status: '', fromDate: '', toDate: '', search: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [list, categories] = await Promise.all([
        expensesApi.list({ ...filters, categoryId: filters.categoryId || undefined, status: filters.status || undefined, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, search: filters.search || undefined }),
        expenseCategoriesApi.list().catch(() => []),
      ]);
      setItems(list);
      setCats(categories);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [filters]);

  const totalAmount = items.reduce((s, e) => s + Number(e.totalAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-brand-600" />
            هزینه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مجموع {toPersianDigits(items.length)} مورد — {formatNumber(totalAmount)} ریال
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => navigate('/settings/expense-categories')}>
            <Settings className="w-4 h-4" /> دسته‌ها
          </button>
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" /> بروزرسانی
          </button>
          <button className="btn-primary" onClick={() => navigate('/expenses/new')}>
            <Plus className="w-4 h-4" /> هزینه جدید
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
          <Filter className="w-4 h-4" /> فیلترها
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            className="input"
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
          >
            <option value="">همه دسته‌ها</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="input"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <PersianDatePicker value={filters.fromDate} onChange={(v) => setFilters({ ...filters, fromDate: v || '' })} placeholder="از تاریخ" />
          <PersianDatePicker value={filters.toDate} onChange={(v) => setFilters({ ...filters, toDate: v || '' })} placeholder="تا تاریخ" />
          <input className="input" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="جستجو..." />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400">در حال بارگذاری...</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">هزینه‌ای ثبت نشده است</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium text-slate-600">کد</th>
                <th className="px-4 py-3 font-medium text-slate-600">تاریخ</th>
                <th className="px-4 py-3 font-medium text-slate-600">دسته</th>
                <th className="px-4 py-3 font-medium text-slate-600">شرح</th>
                <th className="px-4 py-3 font-medium text-slate-600">پروژه</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-left">مبلغ (ریال)</th>
                <th className="px-4 py-3 font-medium text-slate-600">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const st = STATUS_MAP[e.status] || { label: e.status, color: 'bg-slate-100' };
                return (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate('/expenses/' + e.id)}
                  >
                    <td className="px-4 py-3 num font-mono text-xs" dir="ltr">{e.code}</td>
                    <td className="px-4 py-3 num">{formatJalaliDate(e.expenseDate)}</td>
                    <td className="px-4 py-3">{e.category?.name || '—'}</td>
                    <td className="px-4 py-3 truncate max-w-xs">{e.description}</td>
                    <td className="px-4 py-3">{e.project?.name || '—'}</td>
                    <td className="px-4 py-3 num text-left font-bold">{formatNumber(Number(e.totalAmount))}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-1 rounded-md font-medium', st.color)}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
