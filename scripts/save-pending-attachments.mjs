import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// پچ: در onSubmit بعد از create اگر pendingFiles داشت ذخیره کن
const files = [
  { path: '/frontend/src/modules/timeline/components/PermitFormModal.tsx', entityType: 'PERMIT', apiField: 'permits' },
  { path: '/frontend/src/modules/timeline/components/InsuranceFormModal.tsx', entityType: 'INSURANCE', apiField: 'insurances' },
  { path: '/frontend/src/modules/timeline/components/GuaranteeFormModal.tsx', entityType: 'GUARANTEE', apiField: 'guarantees' },
  { path: '/frontend/src/modules/timeline/components/DocumentFormModal.tsx', entityType: 'DOCUMENT', apiField: 'documents' },
];

for (const f of files) {
  const full = ROOT + f.path;
  if (!fs.existsSync(full)) { console.log('!! ' + f.path + ' پیدا نشد'); continue; }

  let c = fs.readFileSync(full, 'utf8');

  // شرط: onSubmit موجود است
  if (!c.includes('onSubmit')) { console.log('SKIP (no onSubmit) ' + f.path); continue; }

  // الگو: await timelineApi.XXX.create(payload); → capture + save attachments
  const createRegex = new RegExp(
    "(await timelineApi\\." + f.apiField + "\\.create\\(([^)]+)\\);)",
    'g'
  );
  const updateRegex = new RegExp(
    "(await timelineApi\\." + f.apiField + "\\.update\\(([^)]+)\\);)",
    'g'
  );

  let changed = false;

  // ایجاد: capture result
  if (createRegex.test(c) && !c.includes('savedAs')) {
    c = c.replace(
      createRegex,
      `const saved = $1
      if (pendingFiles.length > 0 && saved?.id) {
        try {
          await attachmentsApi.createMany('${f.entityType}', saved.id, pendingFiles);
        } catch (e) { console.error('خطا در ذخیره پیوستها', e); }
      }`
    );
    changed = true;
  }

  // ویرایش: capture (فقط برای اطمینان — id داریم)
  // Actually برای ویرایش AttachmentsManager خودش ذخیره میکند. نیاز نیست.

  if (changed) {
    fs.writeFileSync(full, c, 'utf8');
    console.log('OK ' + f.path.split('/').pop());
  } else {
    console.log('SKIP ' + f.path.split('/').pop() + ' (الگو مطابق نبود)');
  }
}

console.log('');
console.log('=== DONE ===');