import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

function checkFile(rel, patterns) {
  const full = ROOT + rel;
  if (!fs.existsSync(full)) return { status: 'missing', name: rel };
  const c = fs.readFileSync(full, 'utf8');
  const results = patterns.map((p) => ({
    pattern: p.name,
    found: new RegExp(p.regex, 'm').test(c),
  }));
  return { status: 'exists', name: rel, results };
}

const items = [
  {
    file: '/frontend/src/modules/timeline/components/PermitFormModal.tsx',
    patterns: [
      { name: 'AttachmentsManager', regex: 'AttachmentsManager' },
      { name: 'pendingFiles state', regex: 'pendingFiles' },
      { name: 'ذخیره پیوست بعد از ساخت', regex: "attachmentsApi\\.createMany" },
    ],
  },
  {
    file: '/frontend/src/modules/timeline/components/InsuranceFormModal.tsx',
    patterns: [
      { name: 'AttachmentsManager', regex: 'AttachmentsManager' },
      { name: 'pendingFiles', regex: 'pendingFiles' },
    ],
  },
  {
    file: '/frontend/src/modules/timeline/components/GuaranteeFormModal.tsx',
    patterns: [
      { name: 'AttachmentsManager', regex: 'AttachmentsManager' },
      { name: 'pendingFiles', regex: 'pendingFiles' },
    ],
  },
  {
    file: '/frontend/src/modules/timeline/components/DocumentFormModal.tsx',
    patterns: [
      { name: 'AttachmentsManager', regex: 'AttachmentsManager' },
      { name: 'pendingFiles', regex: 'pendingFiles' },
    ],
  },
  {
    file: '/frontend/src/modules/petty-cash/components/TransactionFormModal.tsx',
    patterns: [
      { name: 'AttachmentsManager', regex: 'AttachmentsManager' },
      { name: 'pendingFiles', regex: 'pendingFiles' },
    ],
  },
  {
    file: '/frontend/src/modules/projects/pages/ProjectFormPage.tsx',
    patterns: [
      { name: 'purchasingOfficerId', regex: 'purchasingOfficerId' },
      { name: 'officers state', regex: 'const \\[officers' },
      { name: 'dropdown کارپرداز', regex: "register\\('purchasingOfficerId'\\)" },
    ],
  },
  {
    file: '/frontend/src/modules/settings/pages/FiscalYearsPage.tsx',
    patterns: [
      { name: 'دکمه بستن', regex: 'setClosing' },
      { name: 'دکمه بازگشایی', regex: 'setReopening' },
      { name: 'سند اختتامیه', regex: 'generateClosing' },
      { name: 'سند افتتاحیه', regex: 'generateOpening' },
    ],
  },
  {
    file: '/frontend/src/modules/sales/pages/SalesCustomersPage.tsx',
    patterns: [{ name: 'SalesCustomersPage', regex: 'SalesCustomer' }],
  },
  {
    file: '/frontend/src/modules/contracts/pages/ContractTemplatesPage.tsx',
    patterns: [{ name: 'ContractTemplatesPage', regex: 'ContractTemplate' }],
  },
  {
    file: '/frontend/src/modules/reports/pages/ReportsHubPage.tsx',
    patterns: [{ name: 'ReportsHubPage', regex: 'ReportsHub' }],
  },
  {
    file: '/frontend/src/modules/accounting/pages/ChartOfAccountsPage.tsx',
    patterns: [
      { name: 'onEdit در AccountNode', regex: 'onEdit=\\{onEdit\\}' },
      { name: 'حساب جدید button', regex: 'حساب جدید' },
    ],
  },
];

console.log('═══════════════════════════════════════════════════════════');
console.log('  بررسی وضعیت فیچرها');
console.log('═══════════════════════════════════════════════════════════\n');

for (const item of items) {
  const r = checkFile(item.file, item.patterns);
  const shortName = item.file.split('/').pop();
  
  if (r.status === 'missing') {
    console.log('❌ ' + shortName + ' — فایل وجود ندارد!');
    continue;
  }
  
  const passCount = r.results.filter((x) => x.found).length;
  const total = r.results.length;
  
  if (passCount === total) {
    console.log('✅ ' + shortName + ' — ' + passCount + '/' + total);
  } else {
    console.log('⚠ ' + shortName + ' — ' + passCount + '/' + total);
    r.results.forEach((x) => {
      if (!x.found) console.log('    ❌ ' + x.pattern);
    });
  }
}

console.log('\n═══════════════════════════════════════════════════════════');