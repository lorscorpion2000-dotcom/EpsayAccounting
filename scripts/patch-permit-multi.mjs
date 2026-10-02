import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/timeline/components/PermitFormModal.tsx';
let c = fs.readFileSync(f, 'utf8');
let changes = 0;

// 1) import AttachmentsManager + attachmentsApi
if (!c.includes('AttachmentsManager')) {
  c = c.replace(
    "import FileUpload from '@/components/FileUpload';",
    "import AttachmentsManager from '@/components/AttachmentsManager';\nimport { attachmentsApi, AttachmentInput } from '@/services/attachments.api';"
  );
  changes++; console.log('OK import AttachmentsManager');
} else {
  console.log('SKIP import');
}

// 2) state pendingFiles
if (!c.includes('pendingFiles')) {
  const stateAnchor = "const [projects, setProjects] = useState<Project[]>([]);";
  if (c.includes(stateAnchor)) {
    c = c.replace(
      stateAnchor,
      stateAnchor + "\n  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);"
    );
    changes++; console.log('OK state pendingFiles');
  } else {
    console.log('!! state anchor not found');
  }
} else {
  console.log('SKIP state');
}

// 3) reset pendingFiles در useEffect
if (!c.includes('setPendingFiles([])')) {
  // قبل از "if (editing)" در useEffect reset کن
  const effectAnchor = "useEffect(() => {\n    if (!isOpen) return;";
  if (c.includes(effectAnchor)) {
    c = c.replace(
      effectAnchor,
      effectAnchor + "\n    setPendingFiles([]);"
    );
    changes++; console.log('OK reset pendingFiles');
  } else {
    console.log('SKIP reset (anchor not found)');
  }
}

// 4) جایگزینی FileUpload با AttachmentsManager
if (c.includes('<FileUpload')) {
  // پیدا کردن کل بلوک FileUpload
  const fileUploadRegex = /<FileUpload[\s\S]*?\/>/g;
  const match = c.match(fileUploadRegex);
  if (match) {
    for (const block of match) {
      // اگر value از attachmentUrl می‌گیرد، حذفش کن و با AttachmentsManager جایگزین
      const replacement = `<AttachmentsManager
              entityType="PERMIT"
              entityId={editing?.id || null}
              label="پیوست‌ها و مدارک"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />`;
      c = c.replace(block, replacement);
    }
    changes++; console.log('OK AttachmentsManager جایگزین FileUpload (' + match.length + ')');
  }
} else if (!c.includes('<AttachmentsManager')) {
  console.log('!! FileUpload در فرم پیدا نشد — ممکن است قبلاً حذف شده باشد');
} else {
  console.log('SKIP (already replaced)');
}

fs.writeFileSync(f, c, 'utf8');

console.log('');
console.log('=== DONE (' + changes + ' تغییر) ===');