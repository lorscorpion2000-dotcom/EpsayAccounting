import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/settings/pages/FiscalYearsPage.tsx';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// 1) state برای closing/opening
if (!c.includes('generatingClosing')) {
  c = c.replace(
    "const [reopening, setReopening] = useState<FiscalYear | null>(null);",
    "const [reopening, setReopening] = useState<FiscalYear | null>(null);\n  const [generatingClosing, setGeneratingClosing] = useState<FiscalYear | null>(null);\n  const [generatingOpening, setGeneratingOpening] = useState<FiscalYear | null>(null);"
  );
  changes++; console.log('OK state');
}

// 2) توابع handle
if (!c.includes('handleGenerateClosing')) {
  const handlers = `
  const handleGenerateClosing = async () => {
    if (!generatingClosing) return;
    setActionLoading(true);
    try {
      const entry = await accountingApi.fiscalYears.generateClosing(generatingClosing.id);
      toast.success('سند اختتامیه ساخته شد — کد: ' + entry.code);
      setGeneratingClosing(null);
      setTimeout(() => nav('/accounting/journals'), 800);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleGenerateOpening = async () => {
    if (!generatingOpening) return;
    setActionLoading(true);
    try {
      const entry = await accountingApi.fiscalYears.generateOpening(generatingOpening.id);
      toast.success('سند افتتاحیه ساخته شد — کد: ' + entry.code);
      setGeneratingOpening(null);
      setTimeout(() => nav('/accounting/journals'), 800);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };
`;
  const returnIdx = c.indexOf('  return (');
  if (returnIdx > 0) {
    c = c.slice(0, returnIdx) + handlers + '\n' + c.slice(returnIdx);
    changes++; console.log('OK handlers');
  }
}

// 3) دکمه‌ها در action cell — قبل از delete button
if (!c.includes('setGeneratingClosing')) {
  const anchor = `                        <button
                          onClick={() => setDeleting(fy)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >`;

  const newActions = `                        <button
                          onClick={() => setGeneratingClosing(fy)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600"
                          title="سند اختتامیه"
                          disabled={fy.status === 'CLOSED'}
                        >
                          <FileMinus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setGeneratingOpening(fy)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-cyan-600"
                          title="سند افتتاحیه"
                        >
                          <FilePlus className="w-4 h-4" />
                        </button>
                        ${anchor}`;

  if (c.includes(anchor)) {
    c = c.replace(anchor, newActions);
    changes++; console.log('OK action buttons');
  } else {
    console.log('!! action anchor not found');
  }
}

// 4) import FileMinus, FilePlus + useNavigate
if (!c.includes('FileMinus')) {
  c = c.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    (m, imports) => {
      const items = imports.split(',').map((s) => s.trim()).filter(Boolean);
      if (!items.includes('FileMinus')) items.push('FileMinus');
      if (!items.includes('FilePlus')) items.push('FilePlus');
      return 'import { ' + items.join(', ') + " } from 'lucide-react';";
    }
  );
  changes++; console.log('OK imports icons');
}

if (!c.includes('useNavigate')) {
  c = c.replace(
    "import { useEffect, useState } from 'react';",
    "import { useEffect, useState } from 'react';\nimport { useNavigate } from 'react-router-dom';"
  );
  if (!c.includes('const nav = useNavigate')) {
    c = c.replace(
      'export default function FiscalYearsPage() {',
      'export default function FiscalYearsPage() {\n  const nav = useNavigate();'
    );
  }
  changes++; console.log('OK useNavigate');
}

// 5) ConfirmDialogها
if (!c.includes('generateClosing')) {
  const deleteConfirmAnchor = `      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف سال مالی"`;

  const newConfirms = `      <ConfirmDialog
        isOpen={!!generatingClosing}
        title="ساخت سند اختتامیه"
        message={'سند اختتامیه سال مالی «' + (generatingClosing?.name || '') + '» ساخته می‌شود و در وضعیت پیش‌نویس قرار می‌گیرد. برای تأیید نهایی، سند را در صفحه اسناد ثبت کنید.'}
        confirmLabel="بله، ساخته شود"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleGenerateClosing}
        onCancel={() => setGeneratingClosing(null)}
      />

      <ConfirmDialog
        isOpen={!!generatingOpening}
        title="ساخت سند افتتاحیه"
        message={'سند افتتاحیه سال مالی «' + (generatingOpening?.name || '') + '» از مانده سال قبل ساخته می‌شود. برای تأیید نهایی، سند را در صفحه اسناد ثبت کنید.'}
        confirmLabel="بله، ساخته شود"
        variant="info"
        loading={actionLoading}
        onConfirm={handleGenerateOpening}
        onCancel={() => setGeneratingOpening(null)}
      />

      ${deleteConfirmAnchor}`;

  if (c.includes(deleteConfirmAnchor)) {
    c = c.replace(deleteConfirmAnchor, newConfirms);
    changes++; console.log('OK confirm dialogs');
  }
}

fs.writeFileSync(f, c, 'utf8');
console.log('');
console.log('=== DONE (' + changes + ' تغییر) ===');