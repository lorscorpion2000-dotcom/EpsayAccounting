import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-final-roles', p, 'utf8');
console.log('✅ بکاپ');

let changed = 0;

// ═══════════════════════════════════════════════════════════════
// 1) انتخاب خودکار تب بر اساس نقش
// ═══════════════════════════════════════════════════════════════
if (!p.includes('autoSelectedTab')) {
  // anchor: `useEffect(() => { loadData(); }, []);`
  const anchor = 'useEffect(() => { loadData(); }, []);';
  
  if (p.includes(anchor)) {
    const autoSelect = `useEffect(() => { loadData(); }, []);

  // انتخاب خودکار تب بر اساس نقش کاربر
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []) as string[];
    if (roles.includes('admin') || roles.includes('super_admin')) return;

    const availableTabs = Object.entries(TAB_ROLES)
      .filter(([k]) => k !== 'all' && canSeeTab(k, roles))
      .map(([k]) => k);

    if (!availableTabs.includes(tab) && availableTabs.length > 0) {
      setTab(availableTabs[0] as Tab);
    }
  }, [user]);`;
    
    p = p.replace(anchor, autoSelect);
    changed++;
    console.log('✅ انتخاب خودکار تب');
  } else {
    console.log('❌ anchor useEffect loadData پیدا نشد');
    
    // جایگزین: بعد از const userRoles
    const alt = "const userRoles = (user?.roles || []) as string[];";
    if (p.includes(alt)) {
      p = p.replace(alt, alt + `

  // انتخاب خودکار تب بر اساس نقش کاربر
  useEffect(() => {
    if (!user) return;
    const roles = (user.roles || []) as string[];
    if (roles.includes('admin') || roles.includes('super_admin')) return;

    const availableTabs = Object.entries(TAB_ROLES)
      .filter(([k]) => k !== 'all' && canSeeTab(k, roles))
      .map(([k]) => k);

    if (!availableTabs.includes(tab) && availableTabs.length > 0) {
      setTab(availableTabs[0] as Tab);
    }
  }, [user]);`);
      changed++;
      console.log('✅ انتخاب خودکار تب (alt)');
    }
  }
} else {
  console.log('ℹ از قبل هست');
}

// ═══════════════════════════════════════════════════════════════
// 2) عنوان «کارتابل من/مدیران»
// ═══════════════════════════════════════════════════════════════
if (!p.includes('کارتابل من')) {
  // پیدا کردن h1
  const h1Regex = /<h1 className="text-2xl font-bold text-slate-800">([^<]*)<\/h1>/;
  const m = p.match(h1Regex);
  
  if (m) {
    p = p.replace(
      m[0],
      `<h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {userRoles.includes('admin') || userRoles.includes('super_admin') ? 'کارتابل مدیران' : 'کارتابل من'}
        </h1>`
    );
    changed++;
    console.log('✅ عنوان کارتابل');
  } else {
    console.log('❌ h1 پیدا نشد — نمایش ۱۰ خط اول حول "کارتابل"');
    p.split('\n').forEach((line, i) => {
      if (line.includes('کارتابل') || line.includes('<h1')) {
        console.log('  L' + (i + 1) + ': ' + line.trim().substring(0, 90));
      }
    });
  }
} else {
  console.log('ℹ از قبل هست');
}

if (changed) {
  fs.writeFileSync(pagePath, p, 'utf8');
  console.log('\n✅ ذخیره شد (' + changed + ' تغییر)');
}

// چک نهایی
console.log('\n── تأیید ──');
const fresh = fs.readFileSync(pagePath, 'utf8');
console.log((fresh.includes('autoSelectedTab') || fresh.includes('availableTabs') ? '✅' : '❌') + ' انتخاب خودکار تب');
console.log((fresh.includes('کارتابل من') ? '✅' : '❌') + ' عنوان کارتابل');