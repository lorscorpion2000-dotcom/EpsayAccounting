import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const vcPath = ROOT + '/frontend/vite.config.ts';

// بازنویسی کامل فایل با نسخه صحیح
const content = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
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
  },
});
`;

fs.writeFileSync(vcPath, content, 'utf8');
console.log('✅ vite.config.ts بازسازی شد (' + content.length + ' کاراکتر)');

// تأیید
console.log('\n── خطوط آخر ──');
const lines = content.split('\n');
lines.slice(-5).forEach((l, i) => console.log(String(lines.length - 4 + i).padStart(4) + '| ' + l));