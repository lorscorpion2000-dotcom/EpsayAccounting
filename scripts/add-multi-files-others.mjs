import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// helper: پچ هر فرم با الگوی یکسان
// ═══════════════════════════════════════════════════════════════
function patchForm(opts) {
  const { file, entityType, apiCreateCall, apiUpdateCall, idField = 'editing?.id' } = opts;
  const full = ROOT + file;

  if (!fs.existsSync(full)) {
    console.log('!! فایل پیدا نشد: ' + file);
    return;
  }

  let c = fs.readFileSync(full, 'utf8');
  let changes = 0;

  // 1) import
  if (!c.includes('AttachmentsManager')) {
    if (c.includes("from '@/components/FileUpload'") || c.includes('FileUpload')) {
      c = c.replace(
        /import FileUpload from '@\/components\/FileUpload';/,
        "import AttachmentsManager from '@/components/AttachmentsManager';\nimport { attachmentsApi, AttachmentInput } from '@/services/attachments.api';"
      );
      changes++;
    } else if (c.includes("from 'react-hook-form'")) {
      // درج بعد از اولین ایمپورت
      c = c.replace(
        /(import \{[^}]+\} from 'react-hook-form';)/,
        "$1\nimport AttachmentsManager from '@/components/AttachmentsManager';\nimport { attachmentsApi, AttachmentInput } from '@/services/attachments.api';"
      );
      changes++;
    }
  }

  // 2) state
  if (!c.includes('pendingFiles')) {
    // پیدا کردن اولین useState
    const m = c.match(/(const \[[^\]]+\] = useState[^;]+;)/);
    if (m) {
      c = c.replace(m[1], m[1] + '\n  const [pendingFiles, setPendingFiles] = useState<AttachmentInput[]>([]);');
      changes++;
    }
  }

  // 3) reset pendingFiles در useEffect
  if (!c.includes('setPendingFiles([])')) {
    const effectM = c.match(/useEffect\(\(\) => \{\s*\r?\n\s*if \(!isOpen\) return;/);
    if (effectM) {
      c = c.replace(effectM[0], effectM[0] + '\n    setPendingFiles([]);');
      changes++;
    }
  }

  // 4) جایگزینی FileUpload با AttachmentsManager
  const fileUploadRegex = /<FileUpload[\s\S]*?\/>/g;
  const matches = c.match(fileUploadRegex);
  if (matches && matches.length) {
    for (const block of matches) {
      const replacement = `<AttachmentsManager
              entityType="${entityType}"
              entityId={editing?.id || null}
              label="پیوستها و مدارک"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />`;
      c = c.replace(block, replacement);
    }
    changes++;
  }

  fs.writeFileSync(full, c, 'utf8');
  console.log('OK ' + file.split('/').pop() + ' (' + changes + ' تغییر)');
}

// ═══════════════════════════════════════════════════════════════
// پچ ۳ فرم
// ═══════════════════════════════════════════════════════════════
patchForm({
  file: '/frontend/src/modules/timeline/components/InsuranceFormModal.tsx',
  entityType: 'INSURANCE',
});
patchForm({
  file: '/frontend/src/modules/timeline/components/GuaranteeFormModal.tsx',
  entityType: 'GUARANTEE',
});
patchForm({
  file: '/frontend/src/modules/timeline/components/DocumentFormModal.tsx',
  entityType: 'DOCUMENT',
});

console.log('');
console.log('=== DONE ===');