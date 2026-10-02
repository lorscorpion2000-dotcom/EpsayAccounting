import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) vite.config.ts — manualChunks
// ═══════════════════════════════════════════════════════════════
const vcPath = ROOT + '/frontend/vite.config.ts';
let vc = fs.readFileSync(vcPath, 'utf8');

const oldBuild = `  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },`;

const newBuild = `  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'excel': ['xlsx-js-style', 'xlsx'],
          'date': ['react-multi-date-picker', 'react-date-object', 'dayjs'],
          'icons': ['lucide-react'],
          'form': ['react-hook-form', 'zod'],
          'state': ['zustand'],
          'http': ['axios'],
        },
      },
    },
  },`;

if (vc.includes(oldBuild)) {
  vc = vc.replace(oldBuild, newBuild);
  fs.writeFileSync(vcPath, vc, 'utf8');
  console.log('OK vite.config.ts');
} else {
  console.log('SKIP vite.config.ts (already patched or format different)');
}

// ═══════════════════════════════════════════════════════════════
// 2) router.tsx — Lazy loading
// ═══════════════════════════════════════════════════════════════
const routerPath = ROOT + '/frontend/src/app/router.tsx';
const lines = fs.readFileSync(routerPath, 'utf8').split('\n');

const lazyDecls = [];
const cleaned = [];
let reactImportPatched = false;

for (const line of lines) {
  // Match page import: `import X from '@/modules/.../pages/...';`
  const m = line.match(/^import\s+(\w+)\s+from\s+['"](@\/modules\/[^'"]+\/pages\/[^'"]+)['"];?\s*$/);
  if (m) {
    lazyDecls.push(`const ${m[1]} = lazy(() => import('${m[2]}'));`);
    continue;
  }
  
  // Patch React import to add lazy + Suspense
  const rMatch = line.match(/^import\s+\{([^}]+)\}\s+from\s+['"]react['"];?\s*$/);
  if (rMatch && !reactImportPatched) {
    const imports = rMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!imports.includes('lazy')) imports.push('lazy');
    if (!imports.includes('Suspense')) imports.push('Suspense');
    cleaned.push(`import { ${imports.join(', ')} } from 'react';`);
    reactImportPatched = true;
    continue;
  }
  
  cleaned.push(line);
}

// Add React import if not found
if (!reactImportPatched) {
  // Insert at top (before any other imports, but after any comment lines)
  cleaned.unshift("import { lazy, Suspense } from 'react';");
  console.log('  Added React import');
}

// Insert lazy decls before `export default function`
let exportIdx = cleaned.findIndex((l) => l.includes('export default function') && l.includes('Router'));
if (exportIdx < 0) {
  // fallback — any export
  exportIdx = cleaned.findIndex((l) => l.includes('export default function'));
}

if (exportIdx < 0) {
  console.log('!! export default not found');
} else {
  cleaned.splice(exportIdx, 0, '', '// ─── Lazy-loaded pages ─────────────────────────────────────', ...lazyDecls, '');
  console.log('OK router.tsx — ' + lazyDecls.length + ' pages lazy-loaded');
}

// Wrap <Routes> ... </Routes> in Suspense
let result = cleaned.join('\n');

if (!result.includes('<Suspense fallback=')) {
  // Fallback UI — CSS inline (نیازی به Tailwind نیست)
  const fallback = `<Suspense fallback={<div style={{minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>در حال بارگذاری...</div>}>`;

  // Find exact <Routes> tag
  result = result.replace(/(\s*)(<Routes>)/, '$1' + fallback + '$1  $2');
  result = result.replace(/(<\/Routes>)/, '  $1\n    </Suspense>');
}

fs.writeFileSync(routerPath, result, 'utf8');
console.log('OK Suspense around Routes');

// ═══════════════════════════════════════════════════════════════
// 3) MainLayout.tsx — Suspense around Outlet
// ═══════════════════════════════════════════════════════════════
const mlPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let ml = fs.readFileSync(mlPath, 'utf8');

if (!ml.includes('<Suspense')) {
  // Add Suspense import from react
  ml = ml.replace(
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect, Suspense } from 'react';"
  );
  
  // Wrap Outlet in Suspense
  ml = ml.replace(
    /<Outlet \/>/,
    '<Suspense fallback={<div className="p-12 text-center text-slate-400">در حال بارگذاری...</div>}>\n            <Outlet />\n          </Suspense>'
  );
  
  fs.writeFileSync(mlPath, ml, 'utf8');
  console.log('OK MainLayout.tsx — Suspense around Outlet');
} else {
  console.log('SKIP MainLayout (already has Suspense)');
}

console.log('');
console.log('=== DONE ===');