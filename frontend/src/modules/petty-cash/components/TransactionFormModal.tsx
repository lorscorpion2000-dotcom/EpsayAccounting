import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, AlertCircle } from 'lucide-react';
import { pettyCashApi } from '../services/petty-cash.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { PettyCashAccount, PettyCashTxType } from '@/types/petty-cash';
import type { Project, WbsItem } from '@/types/project';
import { formatNumber } from '@/utils/format';
import AttachmentsManager from '@/components/AttachmentsManager';
import { attachmentsApi, AttachmentInput } from '@/services/attachments.api';
import { todayLocalISO } from '@/utils/local-date';

interface Props {
  isOpen: boolean;
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  type: PettyCashTxType;
  txDate?: string;
  amount: number;
  description: string;
  recipient?: string;
  category?: string;
  invoiceNumber?: string;
  projectId?: string;
  wbsItemId?: string;
}

const CATEGORIES = [
  'خرید ابزار مصرفی',
  'کرایه حمل',
  'شارژ تلفن',
  'لوازم‌التحریر',
  'پذیرایی',
  'سوخت ماشین‌آلات',
  'هزینه‌های متفرقه',
  'سایر',
];

export default function TransactionFormModal({
  isOpen, accountId, onClose, onSaved,
}: Props) {
  const [account, setAccount] = useState<PettyCashAccount | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: 'EXPENSE',
      txDate: todayLocalISO(),
      amount: 0,
      description: '',
    },
  });

  const txType = watch('type');
  const amount = watch('amount') || 0;
  const projectId = watch('projectId');

  useEffect(() => {
    if (!isOpen) return;
    pettyCashApi.accounts.get(accountId).then(setAccount);
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    reset({
      type: 'EXPENSE',
      txDate: todayLocalISO(),
      amount: 0,
      description: '',
      recipient: '',
      category: '',
      invoiceNumber: '',
      projectId: undefined,
      wbsItemId: undefined,
    });
    setPendingFiles([]);
  }, [isOpen, accountId, reset]);

  // بارگذاری WBS وقتی پروژه انتخاب شد
  useEffect(() => {
    if (!projectId) {
      setWbsItems([]);
      return;
    }
    api.get('/wbs', { params: { projectId } })
      .then((r) => {
        // flatten tree
        const flat: any[] = [];
        const walk = (items: any[], depth = 0) => {
          items.forEach((it) => {
            flat.push({ ...it, indent: '— '.repeat(depth) });
            if (it.children?.length) walk(it.children, depth + 1);
          });
        };
        walk(r.data || []);
        setWbsItems(flat);
      })
      .catch(() => setWbsItems([]));
  }, [projectId]);

  if (!isOpen) return null;

  // بررسی سقف‌ها
  const ceiling = Number(account?.ceilingPerTx || 0);
  const balance = Number(account?.balance || 0);
  const exceedsCeiling = txType === 'EXPENSE' && amount > ceiling;
  const exceedsBalance = txType === 'EXPENSE' && amount > balance;

  const onSubmit = async (data: FormData) => {
    if (exceedsCeiling) {
      toast.error(`مبلغ از سقف هر خرید (${formatNumber(ceiling)} ریال) بیشتر است`);
      return;
    }
    if (exceedsBalance) {
      toast.error(`موجودی تنخواه کافی نیست. موجودی فعلی: ${formatNumber(balance)} ریال`);
      return;
    }
    try {
      const payload = {
        accountId,
        type: data.type,
        txDate: data.txDate,
        amount: Number(data.amount),
        description: data.description,
        recipient: data.recipient || undefined,
        category: data.category || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        projectId: data.projectId || undefined,
        wbsItemId: data.wbsItemId || undefined,
      };
      const savedTx = await pettyCashApi.transactions.create(payload) as any;
      if (pendingFiles.length > 0 && savedTx?.id) {
        try {
          await attachmentsApi.createMany('PETTY_CASH_TX', savedTx.id, pendingFiles);
        } catch (err) { console.error('خطا در ذخیره پیوستها', err); }
      }
      toast.success('تراکنش ثبت شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره‌سازی');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">تراکنش جدید</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              حساب: {account?.name}
              {' • '}
              موجودی: <span className="num font-medium text-emerald-600">{formatNumber(balance)}</span> ریال
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">نوع تراکنش *</label>
              <select {...register('type')} className="input">
                <option value="EXPENSE">هزینه</option>
                <option value="FUNDING">شارژ تنخواه</option>
                <option value="SETTLEMENT">تسویه</option>
                <option value="ADJUSTMENT">تعدیل</option>
              </select>
            </div>
            <div>
              <label className="label">تاریخ *</label>
              <Controller
                name="txDate"
                control={control}
                rules={{ required: 'تاریخ الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    hasError={!!errors.txDate}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <label className="label">مبلغ (ریال) *</label>
            <input
              type="number"
              step="1"
              {...register('amount', {
                required: 'مبلغ الزامی است',
                valueAsNumber: true,
                min: { value: 1, message: 'مبلغ باید بزرگ‌تر از صفر باشد' },
              })}
              className="input num text-lg"
              dir="ltr"
              placeholder="0"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            {amount > 0 && (
              <p className="text-xs text-slate-500 mt-1 num">{formatNumber(amount)} ریال</p>
            )}
          </div>

          <div>
            <label className="label">شرح *</label>
            <input
              type="text"
              {...register('description', { required: 'شرح الزامی است' })}
              className="input"
              placeholder="مثال: خرید سیمان از فروشگاه احمدی"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {txType === 'EXPENSE' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">دریافت‌کننده</label>
                  <input type="text" {...register('recipient')} className="input" placeholder="نام فروشنده / شخص" />
                </div>
                <div>
                  <label className="label">دسته‌بندی</label>
                  <select {...register('category')} className="input">
                    <option value="">— انتخاب کنید —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">شماره فاکتور</label>
                <input type="text" {...register('invoiceNumber')} className="input num" dir="ltr" />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="label">پروژه مرتبط</label>
              <select {...register('projectId')} className="input">
                <option value="">— بدون پروژه —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {(it as any).indent}{it.code} — {it.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* هشدارها */}
          {exceedsCeiling && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                مبلغ وارد شده از <b>سقف هر خرید</b> ({formatNumber(ceiling)} ریال) بیشتر است
              </div>
            </div>
          )}
          {exceedsBalance && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                موجودی تنخواه کافی نیست. موجودی فعلی: <b className="num">{formatNumber(balance)}</b> ریال
              </div>
            </div>
          )}
            <AttachmentsManager
              entityType="PETTY_CASH_TX"
              entityId={null}
              label="فاکتور / رسید"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
              maxFiles={5}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              انصراف
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={exceedsCeiling || exceedsBalance}
            >
              <Save className="w-4 h-4" />
              ثبت تراکنش
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
