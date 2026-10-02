import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/settings/pages/FiscalYearsPage.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1) افزودن state برای closing / reopening
if (!c.includes('closing')) {
  c = c.replace(
    "const [actionLoading, setActionLoading] = useState(false);",
    "const [actionLoading, setActionLoading] = useState(false);\n  const [closing, setClosing] = useState<FiscalYear | null>(null);\n  const [reopening, setReopening] = useState<FiscalYear | null>(null);"
  );
  console.log('OK state closing/reopening');
}

// 2) افزودن توابع close/reopen
if (!c.includes('handleClose')) {
  const handlerCode = `
  const handleClose = async () => {
    if (!closing) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.close(closing.id);
      toast.success('سال مالی بسته شد');
      setClosing(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleReopen = async () => {
    if (!reopening) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.reopen(reopening.id);
      toast.success('سال مالی بازگشایی شد');
      setReopening(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };
`;

  // insert before `return (`
  const returnIdx = c.indexOf('  return (');
  if (returnIdx > 0) {
    c = c.slice(0, returnIdx) + handlerCode + '\n' + c.slice(returnIdx);
    console.log('OK handlers');
  } else {
    console.log('!! return anchor not found');
  }
}

// 3) افزودن دکمه‌های بستن/بازکردن در ردیف
if (!c.includes('setClosing(fy)')) {
  const oldActions = `                        <button
                          onClick={() => setDeleting(fy)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>`;
  
  const newActions = `                        {fy.status === 'OPEN' && !fy.isCurrent && (
                          <button
                            onClick={() => setClosing(fy)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"
                            title="بستن سال مالی"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        {fy.status === 'CLOSED' && (
                          <button
                            onClick={() => setReopening(fy)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="بازگشایی"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleting(fy)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>`;

  if (c.includes(oldActions)) {
    c = c.replace(oldActions, newActions);
    console.log('OK action buttons');
  } else {
    console.log('!! action anchor not found');
  }
}

// 4) افزودن ConfirmDialog برای close/reopen
if (!c.includes('closeOpen={!!closing}') && !c.includes('isOpen={!!closing}')) {
  const oldConfirm = `      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف سال مالی"`;
  
  const newConfirm = `      <ConfirmDialog
        isOpen={!!closing}
        title="بستن سال مالی"
        message={'آیا از بستن «' + (closing?.name || '') + '» اطمینان دارید؟ پس از بستن، امکان ثبت سند جدید در این سال وجود ندارد.'}
        confirmLabel="بله، بسته شود"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleClose}
        onCancel={() => setClosing(null)}
      />

      <ConfirmDialog
        isOpen={!!reopening}
        title="بازگشایی سال مالی"
        message={'آیا از بازگشایی «' + (reopening?.name || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، باز شود"
        variant="info"
        loading={actionLoading}
        onConfirm={handleReopen}
        onCancel={() => setReopening(null)}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف سال مالی"`;

  if (c.includes(oldConfirm)) {
    c = c.replace(oldConfirm, newConfirm);
    console.log('OK confirm dialogs');
  } else {
    console.log('!! confirm anchor not found');
  }
}

// 5) افزودن import Lock, Unlock
if (!c.includes('Lock') && c.includes("from 'lucide-react'")) {
  c = c.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    (match, imports) => {
      const items = imports.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.includes('Lock')) items.push('Lock');
      if (!items.includes('Unlock')) items.push('Unlock');
      return 'import { ' + items.join(', ') + " } from 'lucide-react';";
    }
  );
  console.log('OK imports Lock/Unlock');
}

fs.writeFileSync(f, c, 'utf8');
console.log('');
console.log('=== DONE ===');