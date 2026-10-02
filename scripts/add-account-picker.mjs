import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) AccountPickerModal.tsx — مودال انتخاب حساب مبدأ
// ═══════════════════════════════════════════════════════════════
const comp = `import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Wallet, Banknote, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/services/api';
import AccountSelect from '@/modules/accounting/components/AccountSelect';
import { formatNumber } from '@/utils/format';
import type { Account } from '@/types/accounting';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sourceAccountId: string) => Promise<void>;
  amount: number;
  pettyAccountName?: string;
  requestCode?: string;
}

export default function AccountPickerModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  pettyAccountName,
  requestCode,
}: Props) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // بارگذاری حساب\u200Cهای قابل استفاده
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get<Account[]>('/accounts/postable')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setAllAccounts(list);
      })
      .catch(() => {
        toast.error('خطا در بارگذاری حساب\u200Cها');
        setAllAccounts([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  // فیلتر: فقط زیرشاخه\u200Cهای 1.1.1 (بانک/نقد/صندوق)
  const bankAccounts = useMemo(
    () => allAccounts.filter((a) => a.code.startsWith('1.1.1')),
    [allAccounts],
  );

  useEffect(() => {
    if (isOpen) setSelected('');
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selected) {
      toast.error('ابتدا حساب مبدأ را انتخاب کنید');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(selected);
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">پرداخت شار تنخواه</h3>
              {requestCode && (
                <p className="text-xs text-slate-500 num" dir="ltr">{requestCode}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* اطلاعات مبلغ */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700">مبلغ شار:</span>
              <span className="text-lg font-bold num text-emerald-800" dir="ltr">
                {formatNumber(amount)} <span className="text-xs">ریال</span>
              </span>
            </div>
            {pettyAccountName && (
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-emerald-700">تنخواه:</span>
                <span className="font-medium text-emerald-800">{pettyAccountName}</span>
              </div>
            )}
          </div>

          {/* اطلاعات سند خودکار */}
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-1">
            <div className="font-bold flex items-center gap-1 mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              سند حسابداری خودکار
            </div>
            <div>با تأیید سند دوبل زیر ساخته می\u200Cشود:</div>
            <div className="font-mono text-[10px] mt-1 leading-5" dir="rtl">
              <div>▸ <b>بدهکار:</b> تنخواه گردان — {formatNumber(amount)} ریال</div>
              <div>▸ <b>بستانکار:</b> [حساب انتخاب\u200Cشده] — {formatNumber(amount)} ریال</div>
            </div>
          </div>

          {/* انتخاب حساب مبدأ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-brand-600" />
              پرداخت از کدام حساب
            </label>
            {loading ? (
              <div className="p-4 flex items-center justify-center text-slate-400 border rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                هیچ حساب بانک/صندوقی در کدینگ زیر ۱.۱.۱ وجود ندارد.
                ابتدا در <b>/accounting/accounts</b> حساب زیرشاخه ۱.۱.۱ بسازید.
              </div>
            ) : (
              <AccountSelect
                accounts={bankAccounts}
                value={selected}
                onChange={setSelected}
                placeholder="جستجوی حساب بانک/صندوق..."
              />
            )}
            <p className="text-xs text-slate-500 mt-1.5">
              فقط حساب\u200Cهای زیرشاخه <span className="num">1.1.1</span> (بانک نقد و صندوق\u200Cها) قابل انتخاب هستند.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button
            onClick={handleConfirm}
            disabled={saving || !selected}
            className="btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'در حال ثبت...' : 'تأیید و ثبت سند'}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/petty-cash/components/AccountPickerModal.tsx', comp, 'utf8');
console.log('OK AccountPickerModal.tsx');

// ═══════════════════════════════════════════════════════════════
// 2) approvals.api.ts — pettyCashPay با sourceAccountId
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

fs.writeFileSync(apiPath + '.bak-pay2', api, 'utf8');

const oldPay = `pettyCashPay: async (id: string) => {
    const { data } = await api.patch('/petty-cash/requests/' + id + '/pay');
    return data;
  },`;

const newPay = `pettyCashPay: async (id: string, sourceAccountId: string) => {
    const { data } = await api.patch('/petty-cash/requests/' + id + '/pay', { sourceAccountId });
    return data;
  },`;

if (api.includes(oldPay)) {
  api = api.replace(oldPay, newPay);
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('OK pettyCashPay با sourceAccountId');
} else if (api.includes("sourceAccountId")) {
  console.log('ℹ pettyCashPay از قبل درست است');
} else {
  // تلاش با POST (شاید قدیمی)
  const oldPost = `pettyCashPay: async (id: string) => {
    const { data } = await api.post('/petty-cash/requests/' + id + '/pay');
    return data;
  },`;
  if (api.includes(oldPost)) {
    api = api.replace(oldPost, newPay);
    fs.writeFileSync(apiPath, api, 'utf8');
    console.log('OK pettyCashPay (POST → PATCH)');
  } else {
    console.log('❌ متد pettyCashPay پیدا نشد');
    const lines = api.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('pettyCashPay')) console.log('  L' + (i + 1) + ': ' + l.trim());
    });
  }
}

console.log('');
console.log('=== DONE ===');