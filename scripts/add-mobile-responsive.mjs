import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) MainLayout — سایدبار موبایل کشویی + همبرگر
// ═══════════════════════════════════════════════════════════════
const mlPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let ml = fs.readFileSync(mlPath, 'utf8');
let mlChanged = 0;

// 1.a) state sidebarMobileOpen
if (!ml.includes('sidebarMobileOpen')) {
  ml = ml.replace(
    "const [sidebarOpen, setSidebarOpen] = useState(true);",
    "const [sidebarOpen, setSidebarOpen] = useState(true);\n  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);"
  );
  mlChanged++;
  console.log('OK state mobile sidebar');
}

// 1.b) بستن خودکار با تغییر مسیر
if (!ml.includes('setSidebarMobileOpen(false)')) {
  ml = ml.replace(
    "  }, [location.pathname]);",
    "    setSidebarMobileOpen(false);\n  }, [location.pathname]);"
  );
  mlChanged++;
  console.log('OK auto close on route change');
}

// 1.c) همبرگر در هدر برای موبایل (قبل از Menu دکمه فعلی)
const oldMenuBtn = `<button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>`;

const newMenuBtn = `<button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="منو"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>`;

if (ml.includes(oldMenuBtn)) {
  ml = ml.replace(oldMenuBtn, newMenuBtn);
  mlChanged++;
  console.log('OK mobile hamburger');
} else {
  console.log('!! menu button anchor پیدا نشد');
}

// 1.d) سایدبار: مخفی موبایل + کشویی
const oldAside = `<aside
        className={clsx(
          'bg-sidebar text-sidebar-text transition-all duration-300 flex flex-col shrink-0 no-print',
          sidebarOpen ? 'w-64' : 'w-20',
        )}
      >`;

const newAside = `<>
        {/* Overlay موبایل */}
        {sidebarMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarMobileOpen(false)}
          />
        )}

        <aside
          className={clsx(
            'bg-sidebar text-sidebar-text transition-transform duration-300 flex flex-col shrink-0 no-print z-50',
            // موبایل: fixed و کشویی
            'fixed lg:static inset-y-0 right-0',
            sidebarMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
            // عرض: در موبایل همیشه w-64
            'w-64',
            sidebarOpen ? 'lg:w-64' : 'lg:w-20',
          )}
        >`;

if (ml.includes(oldAside)) {
  ml = ml.replace(oldAside, newAside);
  mlChanged++;
  console.log('OK mobile aside');
} else {
  console.log('!! aside anchor پیدا نشد');
}

// 1.e) بستن aside — افزودن </> بعد از </aside>
if (!ml.includes('</aside>\n      </>')) {
  // بعد از بستن aside closing fragment اضافه کن
  const asideCloseMatch = ml.match(/(<\/aside>\s*\n\s*)(<div className="flex-1 flex flex-col overflow-hidden">)/);
  if (asideCloseMatch) {
    ml = ml.replace(
      asideCloseMatch[0],
      '</aside>\n      </>\n      ' + asideCloseMatch[2]
    );
    mlChanged++;
    console.log('OK closing fragment');
  }
}

// 1.f) حذف دکمههای غیرضروری در موبایل
if (!ml.includes('hidden md:flex') || !ml.includes('hidden md:relative')) {
  // جستجو input
  ml = ml.replace(
    /<div className="relative">\s*<Search[\s\S]*?<\/div>/,
    (match) => match.replace('<div className="relative">', '<div className="hidden md:block relative">')
  );
  
  // نام کاربری در موبایل
  ml = ml.replace(
    /<div className="flex items-center gap-2 ps-3 border-s border-slate-200">/,
    '<div className="hidden md:flex items-center gap-2 ps-3 border-s border-slate-200">'
  );
  
  mlChanged++;
  console.log('OK hide on mobile (search + user info)');
}

// 1.g) header padding در موبایل
if (!ml.includes('px-3 sm:px-6')) {
  ml = ml.replace(
    /<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 no-print">/,
    '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 no-print gap-2">'
  );
  mlChanged++;
  console.log('OK header responsive padding');
}

// 1.h) محتوای اصلی padding
if (!ml.includes('p-3 sm:p-4 md:p-6')) {
  ml = ml.replace(
    /<main className="flex-1 overflow-y-auto p-6">/,
    '<main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">'
  );
  mlChanged++;
  console.log('OK main responsive padding');
}

if (mlChanged > 0) {
  fs.writeFileSync(mlPath, ml, 'utf8');
  console.log('✅ MainLayout.tsx — ' + mlChanged + ' تغییر');
}

// ═══════════════════════════════════════════════════════════════
// 2) index.css — استایلهای responsive عمومی
// ═══════════════════════════════════════════════════════════════
const cssPath = ROOT + '/frontend/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

if (!css.includes('/* Responsive Fixes */')) {
  const addition = `

/* ═══════════════════════════════════════════════════════════════
   Responsive Fixes — بهبود نمایش در موبایل و تبلت
   ═══════════════════════════════════════════════════════════════ */

/* ── جداول ── */
@media (max-width: 768px) {
  /* جداول: همیشه اسکرول افقی */
  table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  table thead,
  table tbody {
    display: table;
    width: 100%;
    min-width: 700px;
  }
  table thead {
    display: table-header-group;
  }

  /* کارتها */
  .card {
    border-radius: 0.75rem;
  }
}

/* ── فرمها ── */
@media (max-width: 640px) {
  /* Input ها پرعرض */
  .input, input[type="text"], input[type="number"], input[type="email"],
  input[type="password"], select, textarea {
    font-size: 16px !important; /* جلوگیری از zoom خودکار iOS */
  }
}

/* ── Modal ها ── */
@media (max-width: 640px) {
  /* مودال تمامصفحه در موبایل */
  [class*="fixed"][class*="inset-0"] > [class*="rounded-2xl"] {
    max-height: 95vh !important;
    border-radius: 0.5rem !important;
    margin: 0.5rem;
  }
}

/* ── دکمهها ── */
@media (max-width: 480px) {
  /* گروه دکمهها: wrap */
  .no-print.flex.items-center.gap-2 {
    flex-wrap: wrap;
  }
}

/* ── KPI Cards در داشبورد ── */
@media (max-width: 480px) {
  .grid.grid-cols-2.md\\:grid-cols-6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ── Page Header (flex بین عنوان و دکمهها) ── */
@media (max-width: 640px) {
  .flex.items-center.justify-between.flex-wrap.gap-4 {
    flex-direction: column;
    align-items: stretch;
  }
  .flex.items-center.justify-between.flex-wrap.gap-4 > .flex.items-center.gap-2 {
    justify-content: flex-end;
  }
}
`;
  css = css + addition;
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('✅ index.css — responsive اضافه شد');
} else {
  console.log('ℹ responsive از قبل هست');
}

console.log('');
console.log('=== DONE ===');