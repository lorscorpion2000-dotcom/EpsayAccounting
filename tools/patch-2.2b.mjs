// ۲.۲-ب: صفحه گزارش امنیتی تو audit
import fs from 'node:fs';
import path from 'node:path';

const FE = 'E:\\EpsayAccounting\\frontend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(full) {
  fs.copyFileSync(full, `${full}.bak-${STAMP}`);
  console.log(`  ✅ backup: ${path.basename(full)}`);
}

// ═══════════════════════════════════════════════════════════════
// 1) types/audit.ts
// ═══════════════════════════════════════════════════════════════
console.log('\n--- types/audit.ts ---');
const typesPath = path.join(FE, 'src', 'types', 'audit.ts');
backup(typesPath);
let types = fs.readFileSync(typesPath, 'utf8');

if (!types.includes('SecurityStats')) {
  types += `
export interface SecurityStats {
  range: { from: string; to: string };
  total: number;
  byAction: { action: string; count: number }[];
  failedRecent: AuditLogItem[];
  topIps: { ip: string | null; count: number }[];
}
`;
  fs.writeFileSync(typesPath, types, 'utf8');
  console.log('  ✅ SecurityStats اضافه شد');
} else {
  console.log('  ℹ️ از قبل هست');
}

// ═══════════════════════════════════════════════════════════════
// 2) audit.api.ts
// ═══════════════════════════════════════════════════════════════
console.log('\n--- services/audit.api.ts ---');
const apiPath = path.join(FE, 'src', 'modules', 'audit', 'services', 'audit.api.ts');
backup(apiPath);
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('/audit/security')) {
  api = api.replace(
    `import type { AuditListResponse, AuditStats } from '@/types/audit';`,
    `import type { AuditListResponse, AuditStats, SecurityStats } from '@/types/audit';`
  );
  api = api.replace(
    `  get: (id: string) => api.get('/audit/' + id).then((r) => r.data),`,
    `  get: (id: string) => api.get('/audit/' + id).then((r) => r.data),
  securityList: (params: any) =>
    api.get<AuditListResponse>('/audit/security', { params }).then((r) => r.data),
  securityStats: (params?: any) =>
    api.get<SecurityStats>('/audit/security/stats', { params }).then((r) => r.data),`
  );
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('  ✅ securityList + securityStats اضافه شد');
} else {
  console.log('  ℹ️ از قبل هست');
}

// ═══════════════════════════════════════════════════════════════
// 3) AuditTrailPage.tsx — tab security
// ═══════════════════════════════════════════════════════════════
console.log('\n--- AuditTrailPage.tsx ---');
const pagePath = path.join(FE, 'src', 'modules', 'audit', 'pages', 'AuditTrailPage.tsx');
backup(pagePath);
let page = fs.readFileSync(pagePath, 'utf8');

if (page.includes('securityMode') || page.includes('mode ===')) {
  console.log('  ℹ️ tab از قبل هست');
  process.exit(0);
}

// ۳.الف) import SecurityStats + icons
page = page.replace(
  `import type { AuditListResponse, AuditStats, AuditLogItem } from '@/types/audit';`,
  `import type { AuditListResponse, AuditStats, AuditLogItem, SecurityStats } from '@/types/audit';`
);

// ۳.ب) اضافه کردن state
page = page.replace(
  `  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);`,
  `  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const [mode, setMode] = useState<'trail' | 'security'>('trail');
  const [secData, setSecData] = useState<AuditListResponse | null>(null);
  const [secStats, setSecStats] = useState<SecurityStats | null>(null);
  const [secLoading, setSecLoading] = useState(false);
  const [secAction, setSecAction] = useState('');
  const [secIp, setSecIp] = useState('');`
);

// ۳.ج) تابع loadSecurity
page = page.replace(
  `  const useEffect(() => { load(); }, [page, entity, action, fromDate, toDate]);`,
  `  useEffect(() => { load(); }, [page, entity, action, fromDate, toDate]);

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
  }, [mode, page, secAction, secIp, fromDate, toDate]);

  const SEC_ACTION_LABELS: Record<string, string> = {
    LOGIN_SUCCESS: 'ورود موفق',
    LOGIN_FAILED: 'ورود ناموفق',
    LOGIN_BLOCKED_LOCKED: 'ورود به حساب قفل',
    ACCOUNT_LOCKED: 'قفل شدن حساب',
  };

  const SEC_ACTION_COLORS: Record<string, string> = {
    LOGIN_SUCCESS: 'bg-emerald-50 text-emerald-700',
    LOGIN_FAILED: 'bg-red-50 text-red-700',
    LOGIN_BLOCKED_LOCKED: 'bg-orange-50 text-orange-700',
    ACCOUNT_LOCKED: 'bg-purple-50 text-purple-700',
  };`
);

fs.writeFileSync(pagePath, page, 'utf8');
console.log('  ✅ state + loadSecurity اضافه شد');
console.log('  ⚠️  حالا نیاز به تغییر JSX دستی دارد — بخش بعدی');