import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/petty-cash/components/TransactionFormModal.tsx';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// 1) import AttachmentsManager + attachmentsApi
if (!c.includes('AttachmentsManager')) {
  c = c.replace(
    "import { formatNumber } from '@/utils/format';",
    "import { formatNumber } from '@/utils/format';\nimport AttachmentsManager from '@/components/AttachmentsManager';\nimport { attachmentsApi, AttachmentInput } from '@/services/attachments.api';"
  );
  changes++; console.log('OK import');
}

// 2) state pendingFiles
if (!c.includes('pendingFiles')) {
  c = c.replace(
    "const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);",
    "const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);\n  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);"
  );
  changes++; console.log('OK state');
}

// 3) reset pendingFiles در useEffect
if (!c.includes('setPendingFiles([])')) {
  // بعد از reset({ ... }) در useEffect
  const resetMatch = c.match(/reset\(\{[\s\S]*?\}\);/);
  if (resetMatch) {
    c = c.replace(resetMatch[0], resetMatch[0] + '\n    setPendingFiles([]);');
    changes++; console.log('OK reset');
  } else {
    console.log('!! reset anchor not found');
  }
}

// 4) پیدا کردن onSubmit برای ذخیره پیوستها
// الگو: await pettyCashApi.transactions.create(...)
const createMatch = c.match(/await pettyCashApi\.transactions\.create\(([^)]+)\);/);
if (createMatch && !c.includes('savedTx')) {
  const args = createMatch[1];
  const replacement = `const savedTx = await pettyCashApi.transactions.create(${args}) as any;
      if (pendingFiles.length > 0 && savedTx?.id) {
        try {
          await attachmentsApi.createMany('PETTY_CASH_TX', savedTx.id, pendingFiles);
        } catch (err) { console.error('خطا در ذخیره پیوستها', err); }
      }`;
  c = c.replace(createMatch[0], replacement);
  changes++; console.log('OK submit capture');
} else if (createMatch) {
  console.log('SKIP submit (already)');
} else {
  console.log('!! create API call not found — submit دستی لازم است');
}

// 5) افزودن AttachmentsManager در JSX — قبل از دکمههای پایانی
if (!c.includes('<AttachmentsManager')) {
  // پیدا کردن دکمه انصراف/ثبت پایانی
  const submitAnchor = c.match(/(\s*)(<div className="flex items-center justify-end gap-3[^"]*">[\s\S]*?<\/div>)\s*<\/form>/);
  if (submitAnchor) {
    const block = `<AttachmentsManager
              entityType="PETTY_CASH_TX"
              entityId={null}
              label="فاکتور / رسید"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
              maxFiles={5}
            />

            `;
    c = c.replace(submitAnchor[0], '\n            ' + block + submitAnchor[0].trimStart());
    changes++; console.log('OK AttachmentsManager در JSX');
  } else {
    console.log('!! submit anchor not found — لطفا خروجی Submit area را بفرستید');
  }
}

fs.writeFileSync(f, c, 'utf8');
console.log('');
console.log('=== DONE (' + changes + ' تغییر) ===');