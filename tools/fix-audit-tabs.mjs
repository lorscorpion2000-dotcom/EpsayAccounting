import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\frontend\\src\\modules\\audit\\pages\\AuditTrailPage.tsx';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

let txt = fs.readFileSync(file, 'utf8');

// ۱) import SecurityView
if (!txt.includes("from '../components/SecurityView'")) {
  txt = txt.replace(
    `import { PersianDatePicker } from '@/components/PersianDatePicker';`,
    `import { PersianDatePicker } from '@/components/PersianDatePicker';\nimport { SecurityView } from '../components/SecurityView';`
  );
  console.log('✅ import SecurityView');
}

// ۲) loadSecurity + useEffect
if (!txt.includes('const loadSecurity = async')) {
  const anchor = `  useEffect(() => { load(); }, [page, entity, action, fromDate, toDate]);`;
  const insertion = `${anchor}

  const loadSecurity = async () => {
    setSecLoading(true);
    try {
      const params: any = { page, pageSize };
      if (secAction) params.action = secAction;
      if (secIp) params.ipAddress = secIp;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const [listRes, stRes] = await Promise.all([
        auditApi.securityList(params),
        auditApi.securityStats({ fromDate, toDate }),
      ]);
      setSecData(listRes);
      setSecStats(stRes);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در بارگذاری');
    } finally { setSecLoading(false); }
  };

  useEffect(() => {
    if (mode === 'security') loadSecurity();
  }, [mode, page, secAction, secIp, fromDate, toDate]);`;

  if (txt.includes(anchor)) {
    txt = txt.replace(anchor, insertion);
    console.log('✅ loadSecurity اضافه شد');
  } else {
    console.log('❌ useEffect پیدا نشد');
    process.exit(1);
  }
}

// ۳) حذف empty trail block
txt = txt.replace(
  /\s*\{mode === 'trail' && \(\s*\r?\n\s*<>\s*\r?\n\s*\{\/\* اینجا کل محتوای فعلی trail[^\n]*\}\s*\r?\n\s*<\/>\s*\r?\n\s*\)\}\s*\r?\n/,
  '\n'
);
console.log('✅ empty trail block حذف شد');

// ۴) wrap trail content (stats + showFilters + table)
// با پیدا کردن مرزها:
//   - شروع: `{stats && (`
//   - پایان: قبل از `{detailItem && (`
const startMarker = '      {stats && (';
const endMarker = '      {detailItem && (';
const startIdx = txt.indexOf(startMarker);
const endIdx = txt.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.log('❌ مرزها پیدا نشد');
  process.exit(1);
}

const before = txt.slice(0, startIdx);
const middle = txt.slice(startIdx, endIdx);
const after = txt.slice(endIdx);

const wrapped = `      {mode === 'trail' && (
        <>
${middle}
        </>
      )}

`;

txt = before + wrapped + after;
fs.writeFileSync(file, txt, 'utf8');
console.log('✅ محتوای trail wrap شد');

// تأیید
const final = fs.readFileSync(file, 'utf8');
console.log('\n--- تأیید ---');
console.log('SecurityView import:', final.includes("from '../components/SecurityView'") ? '✅' : '❌');
console.log('loadSecurity:', final.includes('const loadSecurity') ? '✅' : '❌');
console.log('trail wrapped:', final.includes("{mode === 'trail' && (\n        <>") ? '✅' : '❌');