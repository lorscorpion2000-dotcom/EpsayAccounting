import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) MainLayout — افزودن Scale و AlertCircle به import lucide
// ═══════════════════════════════════════════════════════════════
const mlPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let ml = fs.readFileSync(mlPath, 'utf8');

const lucideMatch = ml.match(/import\s+\{([\s\S]*?)\}\s+from\s+'lucide-react';/);
if (lucideMatch) {
  const imports = lucideMatch[1];
  const needed = ['Scale', 'AlertCircle'];
  const missing = needed.filter((n) => !new RegExp('\\b' + n + '\\b').test(imports));
  if (missing.length) {
    const trimmed = imports.replace(/\s+$/, '');
    const hasTrailing = trimmed.endsWith(',');
    const newImports = hasTrailing
      ? trimmed + ' ' + missing.join(', ') + ' '
      : trimmed + ', ' + missing.join(', ') + ' ';
    ml = ml.replace(lucideMatch[0], "import {" + newImports + "} from 'lucide-react';");
    fs.writeFileSync(mlPath, ml, 'utf8');
    console.log('OK MainLayout — افزود: ' + missing.join(', '));
  } else {
    console.log('SKIP MainLayout');
  }
}

// ═══════════════════════════════════════════════════════════════
// 2) ChartOfAccountsPage — recursive call missing props
// ═══════════════════════════════════════════════════════════════
const chartPath = ROOT + '/frontend/src/modules/accounting/pages/ChartOfAccountsPage.tsx';
let chart = fs.readFileSync(chartPath, 'utf8');

// پیدا کردن recursive <AccountNode ... onDelete={onDelete} />
// و افزودن onEdit/onAddChild بعد از onDelete
const recursiveRegex = /(<AccountNode[\s\S]*?onDelete=\{onDelete\})([\s\S]*?\/>)/g;
if (chart.match(recursiveRegex)) {
  chart = chart.replace(recursiveRegex, (m, part1, part2) => {
    // چک کن که از قبل onEdit ندارد
    if (part1.includes('onEdit=') || part2.includes('onEdit=')) return m;
    return part1 + '\n              onEdit={onEdit}\n              onAddChild={onAddChild}' + part2;
  });
  fs.writeFileSync(chartPath, chart, 'utf8');
  console.log('OK ChartOfAccountsPage — onEdit/onAddChild اضافه شد');
} else {
  // الگوی دیگر: بدون onDelete
  const altRegex = /(<AccountNode[\s\S]*?search=\{search\})([\s\S]*?\/>)/g;
  if (chart.match(altRegex)) {
    chart = chart.replace(altRegex, (m, part1, part2) => {
      if (part1.includes('onEdit=') || part2.includes('onEdit=')) return m;
      return part1 + '\n              onDelete={onDelete}\n              onEdit={onEdit}\n              onAddChild={onAddChild}' + part2;
    });
    fs.writeFileSync(chartPath, chart, 'utf8');
    console.log('OK ChartOfAccountsPage — props اضافه شد (alt)');
  } else {
    console.log('!! recursive call پیدا نشد — بررسی دستی');
  }
}

console.log('');
console.log('=== DONE ===');