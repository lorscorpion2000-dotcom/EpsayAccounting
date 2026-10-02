import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// vite.config.ts — manualChunks کامل‌تر
const vcPath = ROOT + '/frontend/vite.config.ts';
let vc = fs.readFileSync(vcPath, 'utf8');

const oldBuild = /build:\s*\{[\s\S]*?\},?\s*\}/;
const newBuild = `build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
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
          'charts': ['recharts'],
        },
      },
    },
  }`;

if (vc.includes("'react-vendor'")) {
  console.log('ℹ vite.config از قبل بهینه است');
} else if (oldBuild.test(vc)) {
  vc = vc.replace(oldBuild, newBuild);
  fs.writeFileSync(vcPath, vc, 'utf8');
  console.log('✅ vite.config.ts به‌روز شد');
}

// lazy loading — router.tsx
const routerPath = ROOT + '/frontend/src/app/router.tsx';
let r = fs.readFileSync(routerPath, 'utf8');

if (!r.includes('lazy(() => import')) {
  console.log('⚠ router.tsx از lazy استفاده نمی‌کند — دستی بررسی شود');
} else {
  console.log('✅ router.tsx از lazy استفاده می‌کند');
}

console.log('');
console.log('=== DONE ===');