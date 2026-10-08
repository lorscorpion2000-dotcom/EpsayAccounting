// apply-cs-frontend-a.mjs — Wave 3.2.3
import { writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const FE = 'E:/EpsayAccounting/frontend/src';

function ensureDir(p) { try { mkdirSync(p, { recursive: true }); } catch {} }
function write(path, content) {
  ensureDir(dirname(path));
  if (existsSync(path)) copyFileSync(path, path + '.bak-' + Date.now());
  writeFileSync(path, content, 'utf8');
  console.log('[OK] wrote ' + path.replace(FE, ''));
}

// ═══════════════════════════════════════════════════════════
// 1. Types
// ═══════════════════════════════════════════════════════════
write(FE + '/types/client-statement.ts', `export type CSCategory = 'MATERIAL' | 'LABOR' | 'MISC' | 'TRANSPORT' | 'EQUIPMENT';
export type CSStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const CS_CATEGORY_LABELS: Record<CSCategory, string> = {
  MATERIAL: 'خرید مصالح',
  LABOR: 'اجرت و دستمزد',
  MISC: 'هزینه‌های متفرقه',
  TRANSPORT: 'کرایه حمل',
  EQUIPMENT: 'ماشین آلات',
};

export const CS_CATEGORY_ORDER: CSCategory[] = [
  'MATERIAL', 'LABOR', 'MISC', 'TRANSPORT', 'EQUIPMENT',
];

export const CS_STATUS_LABELS: Record<CSStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'منتظر تایید',
  APPROVED: 'تاییدشده',
  PAID: 'پرداخت‌شده',
  CANCELLED: 'لغو‌شده',
};

export const CS_STATUS_COLORS: Record<CSStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-brand-50 text-brand-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export interface CSItem {
  id?: string;
  category: CSCategory;
  rowNumber?: number;
  priceListCode?: string | null;
  description: string;
  unit?: string | null;
  unitPrice: string | number;
  quantity: string | number;
  totalPrice?: string | number;
  itemDate?: string | null;
  wbsItemId?: string | null;
  wbsItem?: { id: string; code: string; title: string } | null;
  notes?: string | null;
}

export interface ClientStatement {
  id: string;
  code: string;
  projectId: string;
  project?: { id: string; code: string; name: string };
  contractId?: string | null;
  statementNumber: number;
  periodStart: string;
  periodEnd: string;
  coefficient: string | number;
  contractorSharePercent: string | number;
  prepaymentDeductionPercent: string | number;
  subtotalMaterial: string | number;
  subtotalLabor: string | number;
  subtotalMisc: string | number;
  subtotalTransport: string | number;
  subtotalEquipment: string | number;
  totalBeforeCoefficient: string | number;
  totalAfterCoefficient: string | number;
  contractorShareAmount: string | number;
  prepaymentDeductionAmount: string | number;
  netPayable: string | number;
  status: CSStatus;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectedReason?: string | null;
  journalEntryId?: string | null;
  journalEntry?: { id: string; code: string; status: string } | null;
  description?: string | null;
  items?: CSItem[];
  createdAt: string;
  _count?: { items: number };
}

export interface CreateCSPayload {
  projectId: string;
  contractId?: string;
  statementNumber?: number;
  periodStart: string;
  periodEnd: string;
  coefficient?: number;
  contractorSharePercent?: number;
  prepaymentDeductionPercent?: number;
  description?: string;
  items?: {
    category: CSCategory;
    priceListCode?: string;
    description: string;
    unit?: string;
    unitPrice: number;
    quantity?: number;
    itemDate?: string;
    wbsItemId?: string;
    notes?: string;
  }[];
}
`);

// ═══════════════════════════════════════════════════════════
// 2. API
// ═══════════════════════════════════════════════════════════
write(FE + '/modules/client-statement/services/client-statement.api.ts', `import { api } from '@/services/api';
import type { ClientStatement, CreateCSPayload, CSItem, CSCategory } from '@/types/client-statement';

interface ListParams { projectId?: string; status?: string; search?: string }

export const clientStatementApi = {
  list: (params?: ListParams) =>
    api.get<ClientStatement[]>('/client-statements', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ClientStatement>(\`/client-statements/\${id}\`).then((r) => r.data),

  stats: (projectId?: string) =>
    api.get('/client-statements/stats', { params: { projectId } }).then((r) => r.data),

  nextNumber: (projectId: string) =>
    api.get<number>(\`/client-statements/next-number/\${projectId}\`).then((r) => r.data),

  create: (data: CreateCSPayload) =>
    api.post<ClientStatement>('/client-statements', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateCSPayload>) =>
    api.patch<ClientStatement>(\`/client-statements/\${id}\`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(\`/client-statements/\${id}\`).then((r) => r.data),

  importItems: (id: string, category: CSCategory, items: Partial<CSItem>[]) =>
    api.post(\`/client-statements/\${id}/items/import\`, { category, items }).then((r) => r.data),

  deleteItem: (itemId: string) =>
    api.delete(\`/client-statements/items/\${itemId}\`).then((r) => r.data),

  submit: (id: string) =>
    api.post(\`/client-statements/\${id}/submit\`).then((r) => r.data),

  approve: (id: string) =>
    api.post(\`/client-statements/\${id}/approve\`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.post(\`/client-statements/\${id}/reject\`, { reason }).then((r) => r.data),

  post: (id: string) =>
    api.post(\`/client-statements/\${id}/post\`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(\`/client-statements/\${id}/cancel\`).then((r) => r.data),
};
`);

// ═══════════════════════════════════════════════════════════
// 3. List Page
// ═══════════════════════════════════════════════════════════
write(FE + '/modules/client-statement/pages/ClientStatementsListPage.tsx', `import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, FileText, Eye, Trash2, RefreshCw,
  Send, CheckCircle2, XCircle, FileSpreadsheet,
} from 'lucide-react';
import clsx from 'clsx';
import { clientStatementApi } from '../services/client-statement.api';
import { api } from '@/services/api';
import type { ClientStatement } from '@/types/client-statement';
import { CS_STATUS_LABELS, CS_STATUS_COLORS } from '@/types/client-statement';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ClientStatementsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ClientStatement[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionItem, setActionItem] = useState<ClientStatement | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        clientStatementApi.list({
          search: search || undefined,
          projectId: projectFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectFilter, statusFilter]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await clientStatementApi.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleSubmit = async (s: ClientStatement) => {
    try {
      await clientStatementApi.submit(s.id);
      toast.success('ارسال شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const totalNet = items
    .filter((s) => ['APPROVED', 'PAID'].includes(s.status))
    .reduce((sum, s) => sum + Number(s.netPayable), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            صورت‌وضعیت کارفرما
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت صورت‌وضعیت‌های درآمدی (۷ برگ مالی)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => navigate('/client-statements/new')}>
            <Plus className="w-4 h-4" /> صورت‌وضعیت جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">تعداد کل</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(items.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">منتظر تایید</div>
          <div className="text-2xl font-bold num mt-1 text-amber-600">
            {toPersianDigits(items.filter((i) => i.status === 'SUBMITTED').length)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">تاییدشده</div>
          <div className="text-2xl font-bold num mt-1 text-emerald-600">
            {toPersianDigits(items.filter((i) => i.status === 'APPROVED').length)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">جمع خالص (ریال)</div>
          <div className="text-xl font-bold num mt-1 text-brand-600">
            {toPersianDigits(Math.round(totalNet).toLocaleString())}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو در کد یا شرح..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(CS_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ صورت‌وضعیتی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/client-statements/new')}>
              <Plus className="w-4 h-4" /> اولین صورت‌وضعیت
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-16">شماره</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">از تاریخ</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">تا تاریخ</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">ردیف</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-36">جمع هزینه (ریال)</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-36">خالص (ریال)</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{s.code}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-800 text-xs">{s.project?.name}</td>
                    <td className="px-3 py-3 text-center num text-xs">{toPersianDigits(s.statementNumber)}</td>
                    <td className="px-3 py-3 text-center num text-xs">{formatJalaliDate(s.periodStart)}</td>
                    <td className="px-3 py-3 text-center num text-xs">{formatJalaliDate(s.periodEnd)}</td>
                    <td className="px-3 py-3 text-center num text-xs">
                      {toPersianDigits(s._count?.items ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-left num text-xs">
                      {toPersianDigits(Math.round(Number(s.totalBeforeCoefficient)).toLocaleString())}
                    </td>
                    <td className="px-3 py-3 text-left num text-xs font-bold text-brand-700">
                      {toPersianDigits(Math.round(Number(s.netPayable)).toLocaleString())}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', CS_STATUS_COLORS[s.status])}>
                        {CS_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate('/client-statements/' + s.id)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="مشاهده">
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.status === 'DRAFT' && (
                          <>
                            <button onClick={() => handleSubmit(s)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="ارسال">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActionItem(s)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {s.status === 'APPROVED' && (
                          <span className="text-[10px] text-emerald-600">✓</span>
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

      <ConfirmDialog
        isOpen={!!actionItem}
        title="حذف صورت‌وضعیت"
        message={actionItem ? \`آیا از حذف «\${actionItem.code}» اطمینان دارید؟\` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
`);

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  Step 3.2.3 — Types + API + List done.');
console.log('  Next: 3.2.4 (Form with 5 tabs)');
console.log('═══════════════════════════════════════════════');