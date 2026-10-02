import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/petty-cash/components/AccountFormModal.tsx';
let c = fs.readFileSync(f, 'utf8');

// ═══════════ 1) State: افزودن partners + holderType
if (!c.includes('const [partners, setPartners]')) {
  c = c.replace(
    "const [employees, setEmployees] = useState<any[]>([]);",
    "const [employees, setEmployees] = useState<any[]>([]);\n  const [partners, setPartners] = useState<any[]>([]);"
  );
  console.log('OK state partners');
}

// ═══════════ 2) Fetch هر دو
if (!c.includes("'/directory/partners'")) {
  c = c.replace(
    "api.get('/payroll/employees').then((r) => r.data).catch(() => []),",
    "api.get('/payroll/employees').then((r) => r.data).catch(() => []),\n        api.get('/directory/partners').then((r) => r.data).catch(() => []),"
  );
  console.log('OK fetch partners');
}

// ═══════════ 3) setEmployees — پذیرش دو آرایه
if (!c.includes('setPartners(p)')) {
  c = c.replace(
    'setEmployees(u);',
    'setEmployees(e);\n      setPartners(p);'
  );
  console.log('OK setPartners');
}

// ═══════════ 4) setUsers → destructure جدید (اگر هست)
c = c.replace(
  "const [emps, parts] = await Promise.all([",
  "const [e, p] = await Promise.all(["
);
c = c.replace(
  "const [u, _] = await Promise.all([",
  "const [e, p] = await Promise.all(["
);

// ═══════════ 5) form: مقدار ترکیبی
if (!c.includes("holderKey")) {
  c = c.replace(
    "employeeId: editingAccount.employeeId || '',",
    "employeeId: editingAccount.employeeId\n        ? 'emp:' + editingAccount.employeeId\n        : (editingAccount as any).partnerId\n        ? 'par:' + (editingAccount as any).partnerId\n        : '',"
  );
  console.log('OK form default');
}

if (!c.includes("holderKey: ''")) {
  c = c.replace(
    "employeeId: '',",
    "employeeId: '',"
  );
}

// ═══════════ 6) dropdown — با optgroup
const oldSelect = `{...register('employeeId', { required: 'تنخواه‌دار الزامی است' })}`;
const newSelect = `{...register('employeeId', { required: 'تنخواه‌دار الزامی است' })}`;

// جایگزینی کل بلوک select (اگر پیدا شد)
const selectRegex = /<select[^>]*\{\.\.\.register\('employeeId'[^>]*>[\s\S]*?<\/select>/;
const newSelectBlock = `<select {...register('employeeId', { required: 'تنخواه‌دار الزامی است' })} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {employees.length > 0 && (
              <optgroup label="پرسنل">
                {employees.map((u) => (
                  <option key={'emp:' + u.id} value={'emp:' + u.id}>
                    {u.fullName}{u.code ? ' (' + u.code + ')' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {partners.length > 0 && (
              <optgroup label="اشخاص">
                {partners.map((p) => (
                  <option key={'par:' + p.id} value={'par:' + p.id}>
                    {p.name}{p.code ? ' (' + p.code + ')' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>`;

if (selectRegex.test(c)) {
  c = c.replace(selectRegex, newSelectBlock);
  console.log('OK dropdown optgroup');
} else {
  console.log('!! select employeeId پیدا نشد — دستی');
}

// ═══════════ 7) handleSubmit — تجزیه holderKey
if (!c.includes("form.employeeId.startsWith('emp:')")) {
  const oldSubmitPatterns = [
    "const payload: any = { ...form };",
    "const payload = { ...form };",
    "const payload: any = {...form};"
  ];
  
  for (const pat of oldSubmitPatterns) {
    if (c.includes(pat)) {
      c = c.replace(pat, pat + `
      // تجزیه holderKey: 'emp:xxx' یا 'par:xxx'
      const hk = payload.employeeId || '';
      delete payload.employeeId;
      if (hk.startsWith('emp:')) payload.employeeId = hk.slice(4);
      else if (hk.startsWith('par:')) payload.partnerId = hk.slice(4);
`);
      console.log('OK submit parse');
      break;
    }
  }
}

fs.writeFileSync(f, c, 'utf8');
console.log('');
console.log('=== DONE ===');