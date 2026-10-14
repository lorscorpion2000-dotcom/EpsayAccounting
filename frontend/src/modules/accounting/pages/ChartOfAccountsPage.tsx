import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Loader2, ChevronDown, ChevronLeft, Edit, Trash2,
  FolderTree, RefreshCw, FileSpreadsheet, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '../services/accounting.api';
import type { Account } from '@/types/accounting';
import {
  ACCOUNT_LEVEL_LABELS, ACCOUNT_LEVEL_COLORS, ACCOUNT_NATURE_LABELS,
} from '@/types/accounting';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccountFormModal from '../components/AccountFormModal';
import AdminDeleteButton from '@/components/AdminDeleteButton';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';

export default function ChartOfAccountsPage() {
  const [tree, setTree] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultParentForNew, setDefaultParentForNew] = useState<string | undefined>(undefined);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await accountingApi.accounts.tree();
      setTree(data);
    } catch {
      toast.error('خطا در بارگذاری کدینگ حساب‌ها');
    } finally {
      setLoading(false);
    }
  };

  const flattenAll = (items: Account[]): Account[] => {
    const out: Account[] = [];
    const rec = (arr: Account[]) => arr.forEach((a) => { out.push(a); if (a.children?.length) rec(a.children); });
    rec(items);
    return out;
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setDeleting(true);
    try {
      await accountingApi.accounts.remove(deletingAccount.id);
      toast.success('به سطل زباله منتقل شد — قابل بازیابی توسط مدیر');
      setDeletingAccount(null);
      loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (tree.length === 0) {
      toast.info('هیچ داده‌ای وجود ندارد');
      return;
    }
    const rows: any[] = [];
    const flatten = (items: Account[], depth: number) => {
      items.forEach((a) => {
        rows.push({
          'کد': a.code,
          'نام': '  '.repeat(depth) + a.name,
          'سطح': ACCOUNT_LEVEL_LABELS[a.level],
          'ماهیت': ACCOUNT_NATURE_LABELS[a.nature],
          'قابل استفاده در سند': a.isPostable ? 'بله' : 'خیر',
          'فعال': a.isActive ? 'بله' : 'خیر',
        });
        if (a.children?.length) flatten(a.children, depth + 1);
      });
    };
    flatten(tree, 0);
    void exportToExcel({
      filename: `ChartOfAccounts-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'ChartOfAccounts',
        rows,
        cols: [
          { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 },
        ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-brand-600" />
            کدینگ حساب‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ساختار درختی حساب‌ها (گروه، کل، معین، تفصیلی)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button className="btn-primary" onClick={() => { setEditingAccount(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            حساب جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در کد یا نام حساب..."
            className="input ps-10 pe-4 w-full"
          />
        </div>
      </div>

      <div className="card p-2">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">کدینگ حساب‌ها خالی است</p>
            <button className="btn-primary" onClick={() => { setEditingAccount(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" />
              ایجاد اولین حساب
            </button>
          </div>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <AccountNode
                key={node.id}
                node={node}
                depth={0}
                search={search}
                onDelete={setDeletingAccount}
                onEdit={(a) => { setEditingAccount(a); setShowModal(true); }}
                onAddChild={(a) => { setEditingAccount(null); setDefaultParentForNew(a.id); setShowModal(true); }}
              />
            ))}
          </div>
        )}
      </div>

      <AccountFormModal
        isOpen={showModal}
        editing={editingAccount}
        allAccounts={flattenAll(tree)}
        defaultParentId={defaultParentForNew}
        onClose={() => { setShowModal(false); setEditingAccount(null); setDefaultParentForNew(undefined); }}
        onSaved={loadData}
      />

      <ConfirmDialog
        isOpen={!!deletingAccount}
        title="انتقال به سطل زباله"
        message={`«${deletingAccount?.code} - ${deletingAccount?.name}» به سطل زباله منتقل می‌شود. تا بازیابی توسط مدیر، در درخت نمایش داده نمی‌شود.`}
        confirmLabel="بله، منتقل کن"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAccount(null)}
      />
    </div>
  );
}

// ============ Recursive Node ============
function AccountNode({
  node, depth, search, onDelete, onEdit, onAddChild,
}: {
  node: Account;
  depth: number;
  search: string;
  onDelete: (a: Account) => void;
  onEdit: (a: Account) => void;
  onAddChild: (a: Account) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;

  const matchesSearch = !search ||
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    node.code.includes(search);

  const childrenMatch = node.children?.some((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    hasMatchingDescendant(c, search),
  );

  if (search && !matchesSearch && !childrenMatch) return null;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded-lg group transition-colors"
        style={{ marginRight: depth * 20 + 'px' }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={clsx(
            'w-6 h-6 flex items-center justify-center rounded transition-colors',
            hasChildren ? 'hover:bg-slate-200 text-slate-600' : 'text-transparent cursor-default',
          )}
          disabled={!hasChildren}
        >
          {hasChildren && (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
        </button>

        <span className="text-xs font-mono text-slate-500 num w-24 shrink-0" dir="ltr">
          {node.code}
        </span>

        <span className={clsx('text-xs px-2 py-0.5 rounded border shrink-0', ACCOUNT_LEVEL_COLORS[node.level])}>
          {ACCOUNT_LEVEL_LABELS[node.level]}
        </span>

        <span className="flex-1 font-medium text-slate-800 text-sm truncate">
          {node.name}
        </span>

        <span className={clsx(
          'hidden md:inline text-xs px-2 py-0.5 rounded shrink-0',
          node.nature === 'DEBIT' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700',
        )}>
          {ACCOUNT_NATURE_LABELS[node.nature]}
        </span>

        {!node.isPostable && (
          <span className="hidden lg:inline text-xs text-slate-400 shrink-0">
            سرگروه
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          <AdminDeleteButton
            endpoint="/accounts"
            id={node.id}
            itemLabel={node.code + ' - ' + node.name}
            onSuccess={() => { /* parent should reload */ window.location.reload(); }}
            size="sm"
          />
          <button onClick={() => onAddChild(node)} className="p-1.5 rounded hover:bg-brand-100 text-brand-600 transition-colors" title="افزودن زیرحساب">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(node)} className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors" title="ویرایش">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
            title="حذف (به سطل زباله)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <AccountNode
              key={child.id}
              node={child}
              depth={depth + 1}
              search={search}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function hasMatchingDescendant(account: Account, search: string): boolean {
  if (!account.children) return false;
  return account.children.some((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    hasMatchingDescendant(c, search),
  );
}
