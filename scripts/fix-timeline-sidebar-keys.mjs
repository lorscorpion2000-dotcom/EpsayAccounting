import fs from 'node:fs';
import path from 'node:path';

const FRONTEND = 'E:/EpsayAccounting/frontend';
const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');

let layout = fs.readFileSync(layoutPath, 'utf8');
let changed = false;

// ۱) اصلاح map: اگر key={item.key} بود، به key={item.key ?? item.to} تبدیل کن
if (layout.includes('key={item.key}')) {
  layout = layout.replace(/key=\{item\.key\}/g, 'key={item.key ?? item.to}');
  changed = true;
  console.log('  ✓ رندر NavLink اصلاح شد (item.key ?? item.to)');
}

// ۲) افزودن key به آیتم‌های بخش timeline در صورت نبود
if (layout.includes("key: 'timeline'") && !layout.includes("key: 'timeline-permits'")) {
  const timelineBlockRegex = /(\{\s*key:\s*'timeline'[\s\S]*?items:\s*\[)([\s\S]*?)(\]\s*,?\s*\},)/;
  const m = layout.match(timelineBlockRegex);
  if (m) {
    const newItems = `
      { key: 'timeline-permits',    to: '/timeline/permits',    label: 'مجوزها و پروانه‌ها', icon: FileCheck2  },
      { key: 'timeline-insurances', to: '/timeline/insurances', label: 'بیمه‌نامه‌ها',       icon: ShieldCheck },
      { key: 'timeline-guarantees', to: '/timeline/guarantees', label: 'تضامین',             icon: Lock        },
      { key: 'timeline-documents',  to: '/timeline/documents',  label: 'اسناد فنی',          icon: FileImage   },
      { key: 'timeline-checklists', to: '/timeline/checklists', label: 'چک‌لیست‌های مهندسی', icon: CheckSquare },
    `;
    layout = layout.replace(timelineBlockRegex, m[1] + newItems + m[3]);
    changed = true;
    console.log('  ✓ key به آیتم‌های timeline اضافه شد');
  }
}

if (changed) {
  fs.writeFileSync(layoutPath, layout, 'utf8');
  console.log('  ✓ MainLayout.tsx ذخیره شد');
} else {
  console.log('  ℹ تغییری لازم نبود');
}