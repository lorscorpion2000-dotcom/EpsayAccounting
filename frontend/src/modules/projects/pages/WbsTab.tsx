import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Loader2, ChevronDown, ChevronLeft, Layers,
  Edit, Trash2, FileSpreadsheet, RefreshCw, FolderTree,
} from 'lucide-react';
import clsx from 'clsx';
import { projectsApi } from '../services/projects.api';
import type { Project, WbsItem } from '@/types/project';
import { WBS_LEVEL_LABELS, WBS_UNIT_LABELS } from '@/types/project';
import { formatNumber, toPersianDigits } from '@/utils/format';
import WbsNodeModal from '../components/WbsNodeModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function WbsTab() {
  const { project } = useOutletContext<{ project: Project }>();
  const [tree, setTree] = useState<WbsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [parentItem, setParentItem] = useState<WbsItem | null>(null);
  const [editingItem, setEditingItem] = useState<WbsItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WbsItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.wbs.tree(project.id);
      setTree(data);
    } catch {
      toast.error('خطا در بارگذاری WBS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const handleAddRoot = () => {
    setParentItem(null);
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleAddChild = (parent: WbsItem) => {
    setParentItem(parent);
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: WbsItem) => {
    setParentItem(null);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await projectsApi.wbs.remove(deletingItem.id);
      toast.success('گره WBS حذف شد');
      setDeletingItem(null);
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
      toast.info('هیچ داده‌ای برای خروجی وجود ندارد');
      return;
    }

    const rows: any[] = [];
    const flatten = (items: WbsItem[], depth: number) => {
      items.forEach((item) => {
        rows.push({
          'کد WBS': item.code,
          'سطح': WBS_LEVEL_LABELS[item.level],
          'عنوان': '  '.repeat(depth) + item.title,
          'واحد': item.unit ? WBS_UNIT_LABELS[item.unit] : '',
          'مقدار': item.quantity ? Number(item.quantity) : '',
          'بهای واحد (ریال)': item.unitPrice ? Number(item.unitPrice) : '',
          'مبلغ کل (ریال)': item.totalPrice ? Number(item.totalPrice) : '',
          'وزن (درصد)': item.weight ? Number(item.weight) : '',
          'توضیحات': item.description || '',
        });
        if (item.children?.length) flatten(item.children, depth + 1);
      });
    };
    flatten(tree, 0);

    void exportToExcel({
      filename: `WBS-${project.code}-${todayLocalISO()}.xlsx`,
      sheets: [{
        name: 'WBS',
        rows,
        cols: [
      { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 12 },
      { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 30 },
    ],
      }],
    });
    toast.success('خروجی Excel دانلود شد');
  };

  // محاسبه آمار
  const totalCount = countAll(tree);
  const totalAmount = sumAll(tree);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-brand-600" />
            ساختار شکست کار (WBS)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ساختار چهارسطحی: پروژه → فاز → بسته کاری → فعالیت → زیرفعالیت
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={loadData} title="بارگذاری مجدد">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button className="btn-primary" onClick={handleAddRoot}>
            <Plus className="w-4 h-4" />
            فاز جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && tree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل گره‌ها</div>
            <div className="text-xl font-bold text-slate-800 num">
              {toPersianDigits(totalCount)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">فازهای اصلی</div>
            <div className="text-xl font-bold text-brand-700 num">
              {toPersianDigits(tree.length)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">مجموع مبالغ</div>
            <div className="text-xl font-bold text-slate-800 num">
              {formatNumber(totalAmount)}
            </div>
            <div className="text-xs text-slate-400">ریال</div>
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="card p-2">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ ساختاری تعریف نشده است</p>
            <button className="btn-primary" onClick={handleAddRoot}>
              <Plus className="w-4 h-4" />
              ایجاد اولین فاز
            </button>
          </div>
        ) : (
          <div className="p-2">
            {tree.map((node) => (
              <WbsNode
                key={node.id}
                node={node}
                depth={0}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={setDeletingItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <WbsNodeModal
        isOpen={modalOpen}
        projectId={project.id}
        parentItem={parentItem}
        editingItem={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        isOpen={!!deletingItem}
        title="حذف گره WBS"
        message={`آیا از حذف «${deletingItem?.title}» اطمینان دارید؟ اگر این گره زیرمجموعه داشته باشد، ابتدا باید آن‌ها را حذف کنید.`}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}

// ============ Recursive Node Component ============
interface NodeProps {
  node: WbsItem;
  depth: number;
  onAddChild: (item: WbsItem) => void;
  onEdit: (item: WbsItem) => void;
  onDelete: (item: WbsItem) => void;
}

function WbsNode({ node, depth, onAddChild, onEdit, onDelete }: NodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;

  const levelColors: Record<string, string> = {
    PHASE: 'bg-brand-50 text-brand-700 border-brand-200',
    WORK_PACKAGE: 'bg-blue-50 text-blue-700 border-blue-200',
    ACTIVITY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SUB_ACTIVITY: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 px-3 hover:bg-slate-50 rounded-lg group transition-colors"
        style={{ marginRight: depth * 20 + 'px' }}
      >
        {/* Expand toggle */}
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

        {/* Code */}
        <span className="text-xs font-mono text-slate-500 num w-20 shrink-0" dir="ltr">
          {node.code}
        </span>

        {/* Level badge */}
        <span className={clsx('text-xs px-2 py-0.5 rounded border shrink-0', levelColors[node.level])}>
          {WBS_LEVEL_LABELS[node.level]}
        </span>

        {/* Title */}
        <span className="flex-1 font-medium text-slate-800 text-sm truncate">{node.title}</span>

        {/* Quantity + Unit */}
        {(node.quantity || node.unit) && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 shrink-0">
            {node.quantity && (
              <span className="num" dir="ltr">{toPersianDigits(node.quantity)}</span>
            )}
            {node.unit && (
              <span>{WBS_UNIT_LABELS[node.unit]}</span>
            )}
          </div>
        )}

        {/* Total price */}
        {node.totalPrice && Number(node.totalPrice) > 0 && (
          <span className="hidden lg:inline text-xs text-slate-700 font-medium num w-32 text-left shrink-0">
            {formatNumber(Number(node.totalPrice))}
          </span>
        )}

        {/* Weight */}
        {node.weight && Number(node.weight) > 0 && (
          <span className="hidden xl:inline text-xs text-amber-600 num shrink-0">
            {toPersianDigits(node.weight)}٪
          </span>
        )}

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          <button
            onClick={() => onAddChild(node)}
            className="p-1.5 rounded hover:bg-brand-100 text-brand-600 transition-colors"
            title="افزودن زیرمجموعه"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors"
            title="ویرایش"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <WbsNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Helper functions ============
function countAll(items: WbsItem[]): number {
  let count = 0;
  items.forEach((item) => {
    count += 1;
    if (item.children?.length) count += countAll(item.children);
  });
  return count;
}

function sumAll(items: WbsItem[]): number {
  let sum = 0;
  items.forEach((item) => {
    sum += Number(item.totalPrice || 0);
    if (item.children?.length) sum += sumAll(item.children);
  });
  return sum;
}
