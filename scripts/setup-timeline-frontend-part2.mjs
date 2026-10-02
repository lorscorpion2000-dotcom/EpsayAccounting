// E:\EpsayAccounting\scripts\setup-timeline-frontend-part2.mjs
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';

function w(rel, content) {
  const full = path.join(FRONTEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Permits Page ===\n');

w('src/modules/timeline/pages/PermitsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, FileCheck2, Edit, Trash2, RefreshCw,
  FileSpreadsheet, AlertTriangle, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { timelineApi, Permit, PermitType, PermitStatus } from '../services/timeline.api';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import PermitFormModal from '../components/PermitFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPE_LABELS: Record<PermitType, string> = {
  DEMOLITION: 'تخریب', CONSTRUCTION: 'ساخت', NO_VIOLATION: 'عدم خلاف',
  COMPLETION: 'پایان کار', OTHER: 'سایر',
};
const STATUS_LABELS: Record<PermitStatus, string> = {
  PENDING: 'در انتظار', ISSUED: 'صادرشده', EXPIRED: 'منقضی', CANCELLED: 'لغو‌شده',
};
const STATUS_COLORS: Record<PermitStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function PermitsPage() {
  const [items, setItems] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);
  const [deleting, setDeleting] = useState<Permit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.permits.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.permits.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((p, i) => ({
      'ردیف': i + 1, 'کد': p.code, 'پروژه': p.project.name,
      'نوع': TYPE_LABELS[p.type], 'عنوان': p.title,
      'شماره': p.number || '', 'مرجع': p.authority || '',
      'وضعیت': STATUS_LABELS[p.status],
      'تاریخ صدور': p.issueDate ? new Date(p.issueDate).toLocaleDateString('fa-IR') : '',
      'تاریخ انقضا': p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Permits');
    XLSX.writeFile(wb, 'Permits-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (p: Permit) => {
    if (!p.expiryDate || p.status !== 'ISSUED') return false;
    const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-brand-600" />
            مجوزها و پروانه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">ردیابی صدور پروانه‌های تخریب، ساخت، عدم خلاف و پایان کار</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> مجوز جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ مجوزی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین مجوز
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => {
                  const expiring = isExpiringSoon(p);
                  return (
                    <tr key={p.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{p.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[p.type]}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{p.title}</div>
                        {p.number && <div className="text-xs text-slate-500 num">شماره: {p.number}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.project.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {p.expiryDate ? formatJalaliDate(p.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md border', STATUS_COLORS[p.status])}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditing(p); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PermitFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف مجوز"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 2. Insurances Page ===\n');

w('src/modules/timeline/pages/InsurancesPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, ShieldCheck, Edit, Trash2, RefreshCw,
  FileSpreadsheet, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { timelineApi, Insurance, InsuranceType } from '../services/timeline.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import InsuranceFormModal from '../components/InsuranceFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPE_LABELS: Record<InsuranceType, string> = {
  THIRD_PARTY: 'مسئولیت مدنی', ACCIDENT: 'حوادث', FIRE: 'آتش‌سوزی',
  EQUIPMENT: 'ماشین‌آلات', OTHER: 'سایر',
};

export default function InsurancesPage() {
  const [items, setItems] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [deleting, setDeleting] = useState<Insurance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.insurances.list({
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.insurances.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((i, idx) => ({
      'ردیف': idx + 1, 'کد': i.code,
      'نوع': TYPE_LABELS[i.type], 'عنوان': i.title,
      'بیمه‌گر': i.insurer || '', 'شماره': i.policyNumber || '',
      'مبلغ پوشش': i.coverageAmount ? Number(i.coverageAmount) : 0,
      'حق بیمه': i.premiumAmount ? Number(i.premiumAmount) : 0,
      'شروع': i.startDate ? new Date(i.startDate).toLocaleDateString('fa-IR') : '',
      'انقضا': i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Insurances');
    XLSX.writeFile(wb, 'Insurances-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (i: Insurance) => {
    if (!i.expiryDate) return false;
    const days = Math.floor((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            بیمه‌نامه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت بیمه مسئولیت، حوادث، آتش‌سوزی و ماشین‌آلات</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> بیمه‌نامه جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ بیمه‌نامه‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین بیمه‌نامه
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">بیمه‌گر</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ پوشش</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => {
                  const expiring = isExpiringSoon(i);
                  return (
                    <tr key={i.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{i.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[i.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{i.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{i.insurer || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-xs" dir="ltr">
                          {i.coverageAmount ? formatNumber(Number(i.coverageAmount)) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {i.expiryDate ? formatJalaliDate(i.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditing(i); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(i)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InsuranceFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف بیمه‌نامه"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 3. Guarantees Page ===\n');

w('src/modules/timeline/pages/GuaranteesPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, Lock, Edit, Trash2, RefreshCw,
  FileSpreadsheet, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { timelineApi, Guarantee, GuaranteeType } from '../services/timeline.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import GuaranteeFormModal from '../components/GuaranteeFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPE_LABELS: Record<GuaranteeType, string> = {
  BANK_GUARANTEE: 'ضمانت‌نامه بانکی', CHECK: 'چک تضمین',
  DEPOSIT: 'وجه‌الضمان نقدی', OTHER: 'سایر',
};

export default function GuaranteesPage() {
  const [items, setItems] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Guarantee | null>(null);
  const [deleting, setDeleting] = useState<Guarantee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.guarantees.list({
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.guarantees.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((g, i) => ({
      'ردیف': i + 1, 'کد': g.code, 'نوع': TYPE_LABELS[g.type],
      'عنوان': g.title, 'صادرکننده': g.issuer || '', 'ذی‌نفع': g.beneficiary || '',
      'مبلغ': Number(g.amount),
      'صدور': g.issueDate ? new Date(g.issueDate).toLocaleDateString('fa-IR') : '',
      'انقضا': g.expiryDate ? new Date(g.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Guarantees');
    XLSX.writeFile(wb, 'Guarantees-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (g: Guarantee) => {
    if (!g.expiryDate) return false;
    const days = Math.floor((new Date(g.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  const totalAmount = items.reduce((s, g) => s + Number(g.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-600" />
            تضامین و ضمانت‌نامه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت چک‌ها، ضمانت‌نامه‌ها و وجوه الضمان</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> تضمین جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{items.length}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-amber-50 to-white border-amber-200">
            <div className="text-xs text-amber-700 mb-1">مجموع مبالغ</div>
            <div className="text-xl font-bold text-amber-700 num">{formatNumber(totalAmount)}</div>
            <div className="text-xs text-amber-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">منقضی در ۶۰ روز</div>
            <div className="text-xl font-bold text-red-700 num">{items.filter(isExpiringSoon).length}</div>
          </div>
        </div>
      )}

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ تضمینی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین تضمین
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">صادرکننده</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((g) => {
                  const expiring = isExpiringSoon(g);
                  return (
                    <tr key={g.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{g.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[g.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{g.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{g.issuer || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-xs font-bold text-amber-700" dir="ltr">
                          {formatNumber(Number(g.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {g.expiryDate ? formatJalaliDate(g.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditing(g); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(g)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GuaranteeFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف تضمین"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 4. Documents Page ===\n');

w('src/modules/timeline/pages/DocumentsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, FileImage, Edit, Trash2, RefreshCw,
  FileSpreadsheet, CheckCircle2, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { timelineApi, TechnicalDocument, DocumentType, DocumentPhase } from '../services/timeline.api';
import { formatJalaliDate } from '@/utils/format';
import DocumentFormModal from '../components/DocumentFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPE_LABELS: Record<DocumentType, string> = {
  ARCHITECTURE: 'معماری', STRUCTURE: 'سازه',
  MEP: 'تاسیسات مکانیکی و برقی', SITE_PLAN: 'پلان سایت', OTHER: 'سایر',
};
const PHASE_LABELS: Record<DocumentPhase, string> = {
  PHASE_1: 'فاز ۱', PHASE_2: 'فاز ۲', OTHER: 'سایر',
};

export default function DocumentsPage() {
  const [items, setItems] = useState<TechnicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TechnicalDocument | null>(null);
  const [deleting, setDeleting] = useState<TechnicalDocument | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.documents.list({
        type: typeFilter || undefined,
        phase: phaseFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, phaseFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.documents.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((d, i) => ({
      'ردیف': i + 1, 'کد': d.code, 'پروژه': d.project.name,
      'نوع': TYPE_LABELS[d.type], 'فاز': PHASE_LABELS[d.phase],
      'عنوان': d.title, 'نسخه': d.version,
      'تایید': d.isApproved ? 'بله' : 'خیر',
      'تاریخ تایید': d.approvedAt ? new Date(d.approvedAt).toLocaleDateString('fa-IR') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Documents');
    XLSX.writeFile(wb, 'Documents-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileImage className="w-6 h-6 text-violet-600" />
            آرشیو اسناد فنی و نقشه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">نگهداری آخرین نسخ تاییدشده نقشه‌های فاز ۱ و فاز ۲</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> سند جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="input">
            <option value="">همه فازها</option>
            {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ سند فنی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین سند
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">فاز</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">نسخه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">تایید</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{d.code}</span></td>
                    <td className="px-4 py-3 text-xs">{TYPE_LABELS[d.type]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{PHASE_LABELS[d.phase]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{d.project.name}</td>
                    <td className="px-4 py-3 text-center"><span className="num text-xs">{d.version}</span></td>
                    <td className="px-4 py-3 text-center">
                      {d.isApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> تایید
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> در انتظار
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditing(d); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(d)}
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
        )}
      </div>

      <DocumentFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف سند فنی"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
`);

console.log('\n=== 5. Checklists Page ===\n');

w('src/modules/timeline/pages/ChecklistsPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, CheckSquare, Edit, Trash2, RefreshCw,
  FileSpreadsheet, Send, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { timelineApi, PhaseChecklist, ChecklistType, ChecklistStatus } from '../services/timeline.api';
import { formatJalaliDate } from '@/utils/format';
import ChecklistFormModal from '../components/ChecklistFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPE_LABELS: Record<ChecklistType, string> = {
  REBAR_BEFORE_CONCRETE: 'آرماتوربندی قبل از بتن‌ریزی',
  FORMWORK: 'قالب‌بندی', ELECTRICAL: 'تاسیسات برقی',
  PLUMBING: 'لوله‌کشی آب و فاضلاب', WATERPROOFING: 'ایزولاسیون و عایق‌کاری',
  OTHER: 'سایر',
};
const STATUS_LABELS: Record<ChecklistStatus, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده',
  APPROVED: 'تاییدشده', REJECTED: 'رد‌شده',
};
const STATUS_COLORS: Record<ChecklistStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export default function ChecklistsPage() {
  const [items, setItems] = useState<PhaseChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PhaseChecklist | null>(null);
  const [actionItem, setActionItem] = useState<{ item: PhaseChecklist; action: 'delete' | 'submit' | 'approve' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.checklists.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const a = actionItem.action;
      if (a === 'delete') { await timelineApi.checklists.remove(actionItem.item.id); toast.success('حذف شد'); }
      else if (a === 'submit') { await timelineApi.checklists.submit(actionItem.item.id); toast.success('ارسال شد'); }
      else if (a === 'approve') { await timelineApi.checklists.approve(actionItem.item.id); toast.success('تایید شد'); }
      else if (a === 'reject') {
        if (!reason.trim()) { toast.error('دلیل الزامی'); setActionLoading(false); return; }
        await timelineApi.checklists.reject(actionItem.item.id, reason);
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
    const rows = items.map((c, i) => {
      const checked = c.items.filter((x) => x.isChecked).length;
      return {
        'ردیف': i + 1, 'کد': c.code, 'پروژه': c.project.name,
        'نوع': TYPE_LABELS[c.type], 'عنوان': c.title,
        'تاریخ': new Date(c.checklistDate).toLocaleDateString('fa-IR'),
        'تعداد آیتم': c.items.length,
        'تاییدشده': checked,
        'وضعیت': STATUS_LABELS[c.status],
        'بازرس': c.inspectorName || '',
        'ناظر': c.supervisorName || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Checklists');
    XLSX.writeFile(wb, 'Checklists-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            چک‌لیست‌های پیش‌نیاز مهندسی
          </h1>
          <p className="text-sm text-slate-500 mt-1">تاییدیه‌های مهندسی قبل از شروع هر فاز اجرایی</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> چک‌لیست جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ چک‌لیستی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین چک‌لیست
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">آیتم‌ها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => {
                  const checked = c.items.filter((x) => x.isChecked).length;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[c.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{c.project.name}</td>
                      <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(c.checklistDate)}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className="num text-xs">
                          {checked}/{c.items.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[c.status])}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ChecklistFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog
        isOpen={!!actionItem && actionItem.action !== 'reject'}
        title={
          actionItem?.action === 'delete' ? 'حذف چک‌لیست' :
          actionItem?.action === 'submit' ? 'ارسال به کارتابل' : 'تایید چک‌لیست'
        }
        message={
          actionItem?.action === 'delete' ? 'آیا از حذف اطمینان دارید؟' :
          actionItem?.action === 'submit' ? 'چک‌لیست به کارتابل مدیر ارسال می‌شود.' :
          'با تایید، امکان ویرایش وجود ندارد. ادامه؟'
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
            <h3 className="text-lg font-bold text-slate-800 mb-3">رد چک‌لیست</h3>
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

console.log('\n=== 6. Patch MainLayout Sidebar ===\n');

const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');
let layout = fs.readFileSync(layoutPath, 'utf8');

if (!layout.includes('/timeline/permits')) {
  // ایمپورت آیکون‌های جدید
  if (!layout.includes('FileCheck2')) {
    layout = layout.replace(
      /(\n\s+TrendingDown, PieChart,)/,
      '$1\n  FileCheck2, ShieldCheck, Lock, FileImage, CheckSquare,',
    );
  }

  // افزودن بخش Timeline بعد از partner-capital
  const timelineSection = `  {
    key: 'timeline',
    title: 'گاه‌شمار و مجوزها',
    icon: FileCheck2,
    items: [
      { to: '/timeline/permits', label: 'مجوزها و پروانه‌ها', icon: FileCheck2 },
      { to: '/timeline/insurances', label: 'بیمه‌نامه‌ها', icon: ShieldCheck },
      { to: '/timeline/guarantees', label: 'تضامین', icon: Lock },
      { to: '/timeline/documents', label: 'اسناد فنی', icon: FileImage },
      { to: '/timeline/checklists', label: 'چک‌لیست‌های مهندسی', icon: CheckSquare },
    ],
  },
`;

  // پیدا کردن آخرین بخش partner-capital
  const partnerCapitalEndRegex = /(\s+\{\s+key:\s+['"]partner-capital['"][\s\S]*?\},\n)/;
  const match = layout.match(partnerCapitalEndRegex);
  if (match) {
    layout = layout.replace(match[0], match[0] + timelineSection);
    fs.writeFileSync(layoutPath, layout, 'utf8');
    console.log('  ✓ MainLayout.tsx — بخش «گاه‌شمار و مجوزها» اضافه شد');
  } else {
    console.log('  ⚠ بخش partner-capital پیدا نشد');
  }
} else {
  console.log('  ℹ Timeline already in MainLayout');
}

console.log('\n=== 7. Patch Router ===\n');

const routerPath = path.join(FRONTEND, 'src/app/router.tsx');
let router = fs.readFileSync(routerPath, 'utf8');

if (!router.includes('timeline/pages')) {
  // ایمپورت‌ها
  const imports = `
import PermitsPage from '@/modules/timeline/pages/PermitsPage';
import InsurancesPage from '@/modules/timeline/pages/InsurancesPage';
import GuaranteesPage from '@/modules/timeline/pages/GuaranteesPage';
import DocumentsPage from '@/modules/timeline/pages/DocumentsPage';
import ChecklistsPage from '@/modules/timeline/pages/ChecklistsPage';
`;

  // پیدا کردن آخرین import
  const lastImportRegex = /^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
  const imports_match = router.match(lastImportRegex);
  if (imports_match) {
    const lastImport = imports_match[imports_match.length - 1];
    router = router.replace(lastImport, lastImport + '\n' + imports);
  }

  // افزودن Routes — بعد از balance-sheet
  const timelineRoutes = `
        {/* Timeline */}
        <Route path="/timeline/permits" element={<PermitsPage />} />
        <Route path="/timeline/insurances" element={<InsurancesPage />} />
        <Route path="/timeline/guarantees" element={<GuaranteesPage />} />
        <Route path="/timeline/documents" element={<DocumentsPage />} />
        <Route path="/timeline/checklists" element={<ChecklistsPage />} />`;

  // پیدا کردن anchor
  const bsRoute = '<Route path="/partner-capital/balance-sheet" element={<BalanceSheetPage />} />';
  if (router.includes(bsRoute)) {
    router = router.replace(bsRoute, bsRoute + timelineRoutes);
    console.log('  ✓ ۵ Route اضافه شد (بعد از partner-capital)');
  } else {
    // درج قبل از </Route> که MainLayout را می‌بندد
    const mainLayoutCloseRegex = /(\s+<\/Route>\s*\n\s*<Route path="\*")/;
    if (mainLayoutCloseRegex.test(router)) {
      router = router.replace(mainLayoutCloseRegex, timelineRoutes + '\n      </Route>\n      <Route path="*"');
      console.log('  ✓ ۵ Route اضافه شد (قبل از بستن MainLayout)');
    } else {
      console.log('  ⚠ anchor مناسب پیدا نشد');
    }
  }

  fs.writeFileSync(routerPath, router, 'utf8');
} else {
  console.log('  ℹ Timeline routes already present');
}

console.log('\n=== 8. Add Help Content ===\n');

const helpPath = path.join(FRONTEND, 'src/modules/help/helpContent.ts');
let help = fs.readFileSync(helpPath, 'utf8');

if (!help.includes("'/timeline/permits'")) {
  const timelineHelp = `
  // ============================================================
  // گاه‌شمار، مجوزها و کنترل مستندات
  // ============================================================
  '/timeline/permits': {
    title: 'مجوزها و پروانه‌ها',
    description: 'ردیابی صدور و انقضای پروانه‌های تخریب، ساخت، عدم خلاف و پایان کار.',
    quickStart: [
      'روی «مجوز جدید» کلیک کنید',
      'پروژه، نوع مجوز (تخریب/ساخت/عدم خلاف/پایان کار) و عنوان را وارد کنید',
      'شماره و مرجع صادرکننده را پر کنید',
      'تاریخ صدور و انقضا را تنظیم کنید',
    ],
    sections: [
      {
        title: 'انواع مجوز',
        items: [
          'پروانه تخریب: قبل از شروع عملیات تخریب',
          'پروانه ساخت: مجوز اصلی شروع ساخت',
          'گواهی عدم خلاف: در حین اجرا یا پس از پایان',
          'پایان کار: پس از تکمیل نهایی',
        ],
      },
      {
        title: 'وضعیت‌های مجوز',
        items: [
          'در انتظار: هنوز صادر نشده',
          'صادرشده: مجوز فعال است',
          'منقضی: تاریخ انقضا گذشته',
          'لغو‌شده: به هر دلیل لغو شده',
        ],
      },
      {
        title: 'هشدار انقضا',
        items: [
          'مجوزهایی که در ۶۰ روز آینده منقضی می‌شوند با رنگ زرد و آیکون هشدار نمایش داده می‌شوند',
          'این هشدار در داشبورد مدیریتی هم دیده می‌شود',
        ],
        tips: [
          'برای تمدید مجوز، «ویرایش» بزنید و تاریخ انقضا را به‌روز کنید',
        ],
      },
    ],
    faqs: [
      {
        q: 'تفاوت «مجوز» با «سند فنی» چیست؟',
        a: 'مجوز، سند رسمی از نهاد دولتی است. سند فنی، نقشه یا مدارک مهندسی است.',
      },
    ],
  },

  '/timeline/insurances': {
    title: 'بیمه‌نامه‌ها',
    description: 'مدیریت بیمه‌های مسئولیت مدنی، حوادث، آتش‌سوزی و ماشین‌آلات.',
    quickStart: [
      'روی «بیمه‌نامه جدید» کلیک کنید',
      'نوع بیمه، پروژه (اختیاری) و عنوان را وارد کنید',
      'شرکت بیمه، شماره بیمه‌نامه، مبلغ پوشش و حق بیمه را پر کنید',
      'تاریخ شروع و انقضا را تنظیم کنید',
    ],
    sections: [
      {
        title: 'انواع بیمه',
        items: [
          'مسئولیت مدنی: پوشش خسارات به اشخاص ثالث در کارگاه',
          'حوادث: پوشش حوادث کارگران',
          'آتش‌سوزی: پوشش خسارت آتش به اموال',
          'ماشین‌آلات: پوشش خرابی و سرقت ماشین‌آلات',
        ],
      },
      {
        title: 'هشدار انقضا',
        items: [
          'بیمه‌نامه‌هایی که تا ۶۰ روز آینده منقضی می‌شوند با رنگ زرد مشخص می‌شوند',
        ],
      },
    ],
  },

  '/timeline/guarantees': {
    title: 'تضامین و ضمانت‌نامه‌ها',
    description: 'مدیریت چک‌ها، ضمانت‌نامه‌های بانکی و وجوه الضمان.',
    quickStart: [
      'روی «تضمین جدید» کلیک کنید',
      'نوع (ضمانت‌نامه بانکی/چک/وجه نقد)، پروژه و عنوان را وارد کنید',
      'صادرکننده، ذی‌نفع و مبلغ را تنظیم کنید',
      'تاریخ صدور و انقضا را پر کنید',
    ],
    sections: [
      {
        title: 'انواع تضامین',
        items: [
          'ضمانت‌نامه بانکی: از بانک صادر می‌شود',
          'چک تضمین: چک بانکی یا تضمینی',
          'وجه‌الضمان نقدی: مبلغ نقدی نزد کارفرما',
        ],
      },
      {
        title: 'کاربرد',
        items: [
          'تضمین حسن انجام تعهدات به کارفرما',
          'تضمین پیش‌پرداخت',
          'تضمین شرکت در مناقصه',
        ],
        tips: [
          'قبل از انقضای هر تضمین، تمدید یا آزادسازی را از کارفرما درخواست کنید',
        ],
      },
    ],
  },

  '/timeline/documents': {
    title: 'آرشیو اسناد فنی و نقشه‌ها',
    description: 'نگهداری آخرین نسخ تاییدشده نقشه‌های فاز ۱ و ۲.',
    quickStart: [
      'روی «سند جدید» کلیک کنید',
      'پروژه، نوع (معماری/سازه/MEP) و فاز را انتخاب کنید',
      'عنوان، نسخه و لینک فایل را وارد کنید',
      'اگر تاییدشده است، تیک بزنید و تاریخ تایید را تنظیم کنید',
    ],
    sections: [
      {
        title: 'انواع اسناد',
        items: [
          'معماری: پلان‌ها، نماها، مقاطع',
          'سازه: نقشه‌های بتنی و فلزی',
          'تاسیسات مکانیکی و برقی (MEP)',
          'پلان سایت: جانمایی کلی',
        ],
      },
      {
        title: 'نسخه‌بندی',
        items: [
          'هر نسخه یک شماره دارد (1.0، 2.0، 2.1، ...)',
          'نسخه‌های قدیمی در سیستم باقی می‌مانند برای ردیابی',
          'برای نقشه‌های اجرایی، همیشه از آخرین نسخه تاییدشده استفاده کنید',
        ],
        tips: [
          'نامگذاری استاندارد پیشنهاد می‌شود: [پروژه]-[نوع]-[شماره]',
        ],
      },
    ],
  },

  '/timeline/checklists': {
    title: 'چک‌لیست‌های پیش‌نیاز مهندسی',
    description: 'تاییدیه‌های مهندسی الزامی قبل از شروع هر فاز اجرایی (مثل تاییدیه آرماتوربندی قبل از بتن‌ریزی).',
    quickStart: [
      'روی «چک‌لیست جدید» کلیک کنید',
      'پروژه و ردیف WBS مربوطه را انتخاب کنید',
      'نوع چک‌لیست و عنوان را وارد کنید',
      'آیتم‌ها را یکی‌یکی اضافه کنید و تیک وضعیت بزنید',
      'بعد از تکمیل، «ارسال به کارتابل» را بزنید',
    ],
    sections: [
      {
        title: 'انواع چک‌لیست',
        items: [
          'آرماتوربندی قبل از بتن‌ریزی',
          'قالب‌بندی',
          'تاسیسات برقی',
          'لوله‌کشی آب و فاضلاب',
          'ایزولاسیون و عایق‌کاری',
        ],
      },
      {
        title: 'ساختار چک‌لیست',
        items: [
          'هر چک‌لیست دارای چند آیتم (Checklist Item) است',
          'هر آیتم شامل عنوان، وضعیت تیک و یادداشت اختیاری است',
          'ممکن است نام بازرس و ناظر ثبت شود',
        ],
      },
      {
        title: 'چرخه تایید',
        items: [
          'پیش‌نویس → ارسال به کارتابل → تایید مدیر فنی → تایید نهایی',
          'چک‌لیست تاییدشده قابل ویرایش نیست',
          'چک‌لیست رد‌شده با ذکر دلیل به سازنده برمی‌گردد',
        ],
        tips: [
          'چک‌لیست‌های APPROVED مدرک رسمی تاییدیه مهندسی هستند',
          'قبل از شروع بتن‌ریزی حتماً چک‌لیست آرماتوربندی تایید شود',
        ],
      },
    ],
    faqs: [
      {
        q: 'آیا چک‌لیست تاییدشده قابل ویرایش است؟',
        a: 'خیر. اگر نیاز به اصلاح باشد، باید رد شود یا چک‌لیست جدید ثبت شود.',
      },
      {
        q: 'تفاوت چک‌لیست با گزارش روزانه چیست؟',
        a: 'چک‌لیست، تاییدیه مهندسی است. گزارش روزانه، ثبت وقایع و کارکرد روزانه کارگاه است.',
      },
    ],
  },
`;

  const insertRegex = /(\n\};\n\n\/\*\*\n \* دریافت راهنما بر اساس مسیر فعلی)/;
  if (insertRegex.test(help)) {
    help = help.replace(insertRegex, timelineHelp + '$1');
    fs.writeFileSync(helpPath, help, 'utf8');
    console.log('  ✓ ۵ راهنمای گاهشمار اضافه شد');
  } else {
    console.log('  ⚠ anchor در helpContent پیدا نشد');
  }
} else {
  console.log('  ℹ Timeline help already present');
}

console.log('');
console.log('=============================================');
console.log('  ✅ Timeline Module Complete!');
console.log('=============================================');
console.log('');
console.log('Pages created:');
console.log('  • PermitsPage');
console.log('  • InsurancesPage');
console.log('  • GuaranteesPage');
console.log('  • DocumentsPage');
console.log('  • ChecklistsPage');
console.log('');
console.log('Next steps:');
console.log('  1. در VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"');
console.log('  2. در ترمینال frontend: اگر اجراست، خودش hot reload می‌کند');
console.log('  3. مرورگر: Ctrl+Shift+R');
console.log('  4. از سایدبار: «گاه‌شمار و مجوزها» را باز کنید');
console.log('');