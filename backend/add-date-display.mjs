import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const FE = 'E:/EpsayAccounting/frontend/src';

function ensureDir(p) { try { mkdirSync(p, { recursive: true }); } catch (e) {} }
function write(path, content) {
  ensureDir(dirname(path));
  if (existsSync(path)) copyFileSync(path, path + '.bak-' + Date.now());
  writeFileSync(path, content, 'utf8');
  console.log('[W] ' + path);
}
function patch(path, transform, label) {
  if (!existsSync(path)) { console.log('[S] ' + label); return; }
  let c = readFileSync(path, 'utf8');
  if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
  const b = c;
  c = transform(c);
  if (c === b) { console.log('[=] ' + label); return; }
  copyFileSync(path, path + '.bak-' + Date.now());
  writeFileSync(path, c, 'utf8');
  console.log('[P] ' + label);
}

// ═══════════════════════════════════════════════════════════
// 1. DateDisplay component
// ═══════════════════════════════════════════════════════════
write(FE + '/components/DateDisplay.tsx', `import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function DateDisplay() {
  const { jalali, gregorian, hijri } = useMemo(() => {
    const now = new Date();

    // Shamsi (Jalali)
    let jalali = '';
    try {
      jalali = new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      jalali = '—';
    }

    // Miladi (Gregorian)
    let gregorian = '';
    try {
      gregorian = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      gregorian = '—';
    }

    // Qamari (Hijri — Umm al-Qura)
    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      hijri = '';
    }

    return { jalali, gregorian, hijri };
  }, []);

  return (
    <div
      className="hidden lg:flex items-center gap-2 text-[11px] px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 whitespace-nowrap shrink-0"
      title="تاریخ امروز"
    >
      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />

      <span className="font-bold text-slate-700">{jalali}</span>

      <span className="text-slate-300">|</span>

      <span className="num text-slate-600 font-medium" dir="ltr">
        {gregorian}
      </span>

      {hijri && (
        <>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{hijri}</span>
        </>
      )}
    </div>
  );
}
`);

// ═══════════════════════════════════════════════════════════
// 2. Patch MainLayout
// ═══════════════════════════════════════════════════════════
patch(FE + '/layouts/MainLayout.tsx', (c) => {
  let changed = false;

  // 2a. Add import — find a COMPLETE import line to insert after
  if (c.indexOf('DateDisplay') === -1) {
    const lines = c.split(/\r?\n/);
    let insertAfter = -1;

    // Prefer inserting after the ErrorBoundary import (single line)
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s+ErrorBoundary\s+from\s+'@\/components\/ErrorBoundary'/.test(lines[i].trim())) {
        insertAfter = i;
        break;
      }
    }

    // Fallback: after last complete import line
    if (insertAfter === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^import\b/.test(line.trim()) && /\bfrom\s+['"][^'"]+['"];?\s*$/.test(line)) {
          insertAfter = i;
        }
      }
    }

    if (insertAfter === -1) {
      console.log('  [!] Could not find import anchor');
    } else {
      lines.splice(insertAfter + 1, 0, "import DateDisplay from '@/components/DateDisplay';");
      c = lines.join('\n');
      changed = true;
      console.log('  + DateDisplay import added after line ' + (insertAfter + 1));
    }
  } else {
    console.log('  [=] DateDisplay import already present');
  }

  // 2b. Insert <DateDisplay /> in header — between search div and user div
  if (c.indexOf('<DateDisplay') === -1) {
    const lines = c.split(/\r?\n/);
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/<header\b/.test(lines[i])) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.log('  [!] <header> not found');
    } else {
      // Find the first `<div className="flex items-center gap-3">` after header
      let insertAt = -1;
      for (let i = headerIdx; i < Math.min(lines.length, headerIdx + 60); i++) {
        if (/<div\s+className="flex items-center gap-3"/.test(lines[i])) {
          insertAt = i;
          break;
        }
      }

      if (insertAt === -1) {
        console.log('  [!] user-info div not found in header');
      } else {
        const indent = (lines[insertAt].match(/^(\s*)/) || [''])[1];
        lines.splice(insertAt, 0, indent + '<DateDisplay />');
        c = lines.join('\n');
        changed = true;
        console.log('  + <DateDisplay /> inserted at line ' + (insertAt + 1));
      }
    }
  } else {
    console.log('  [=] <DateDisplay /> already present');
  }

  return changed ? c : c;
}, 'MainLayout.tsx');

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  DONE');
console.log('  Build: cd E:/EpsayAccounting/frontend && npm run build');
console.log('  Then: Restart-Service Epsay-Frontend (as Admin)');
console.log('═══════════════════════════════════════════════');