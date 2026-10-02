import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const chartPath = ROOT + '/frontend/src/modules/accounting/pages/ChartOfAccountsPage.tsx';
let chart = fs.readFileSync(chartPath, 'utf8');

// الگوی دقیق خط ۲۷۹: onDelete={onDelete} بلافاصله قبل از />
const old = `              onDelete={onDelete}
            />`;

const neu = `              onDelete={onDelete}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />`;

let count = 0;
while (chart.includes(old)) {
  chart = chart.replace(old, neu);
  count++;
}

if (count > 0) {
  fs.writeFileSync(chartPath, chart, 'utf8');
  console.log('OK ' + count + ' recursive call پچ شد');
} else {
  // الگوی متفاوت — بدون indent
  const old2 = `onDelete={onDelete}\n            />`;
  if (chart.includes(old2)) {
    chart = chart.replace(old2, `onDelete={onDelete}\n              onEdit={onEdit}\n              onAddChild={onAddChild}\n            />`);
    fs.writeFileSync(chartPath, chart, 'utf8');
    console.log('OK پچ شد (الگوی دوم)');
  } else {
    console.log('!! الگو پیدا نشد — نمایش خطوط ۲۷۰-۲۹۰');
    const lines = chart.split('\n');
    for (let i = 270; i < 290 && i < lines.length; i++) {
      console.log(String(i + 1).padStart(4) + '| ' + lines[i]);
    }
  }
}