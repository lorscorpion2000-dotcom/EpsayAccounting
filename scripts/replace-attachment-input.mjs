import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const forms = [
  { path: '/frontend/src/modules/timeline/components/InsuranceFormModal.tsx', entityType: 'INSURANCE' },
  { path: '/frontend/src/modules/timeline/components/GuaranteeFormModal.tsx', entityType: 'GUARANTEE' },
  { path: '/frontend/src/modules/timeline/components/DocumentFormModal.tsx',  entityType: 'DOCUMENT' },
];

for (const f of forms) {
  const full = ROOT + f.path;
  if (!fs.existsSync(full)) { console.log('!! ' + f.path); continue; }
  let c = fs.readFileSync(full, 'utf8');

  // الگو: <div>...<label>لینک فایل پیوست</label>...<input ... attachmentUrl ...>...</div>
  // Regex همهچیز را پوشش میدهد
  const regex = /<div>\s*<label className="label">لینک فایل پیوست<\/label>\s*<input[^>]*attachmentUrl[^>]*\/>\s*<\/div>/;

  if (regex.test(c)) {
    const replacement = `<AttachmentsManager
              entityType="${f.entityType}"
              entityId={editing?.id || null}
              label="پیوستها و مدارک"
              pendingFiles={pendingFiles}
              onPendingChange={setPendingFiles}
            />`;
    c = c.replace(regex, replacement);
    fs.writeFileSync(full, c, 'utf8');
    console.log('OK ' + f.path.split('/').pop());
  } else {
    console.log('!! الگو نبود: ' + f.path.split('/').pop());
  }
}

console.log('');
console.log('=== DONE ===');