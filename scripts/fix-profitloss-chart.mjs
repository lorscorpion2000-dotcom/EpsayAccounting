import fs from 'node:fs';

const p = 'E:/EpsayAccounting/frontend/src/modules/dashboard/pages/DashboardPage.tsx';
let c = fs.readFileSync(p, 'utf8');

console.log('=== Fix profit/loss chart label position ===\n');

// پیدا کردن بلوک BarChart سود و زیان
const oldBlock = `<BarChart data={profitLossData} layout="vertical" margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v: any) => formatNumber(Number(v)) + ' ریال'} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  <Cell fill="#2EC4B6" />
                  <Cell fill="#EB5B38" />
                </Bar>
              </BarChart>`;

const newBlock = `<BarChart 
                data={profitLossData} 
                layout="vertical" 
                margin={{ right: 30, left: 5, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  width={130}
                  tick={{ 
                    fontSize: 14, 
                    fill: '#334155', 
                    fontWeight: 600,
                    textAnchor: 'end',
                  }}
                />
                <Tooltip formatter={(v: any) => formatNumber(Number(v)) + ' ریال'} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={32}>
                  <Cell fill="#2EC4B6" />
                  <Cell fill="#EB5B38" />
                </Bar>
              </BarChart>`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(p, c, 'utf8');
  console.log('✅ Profit/Loss chart labels moved to left');
} else {
  console.log('⚠️ Exact block not found. Trying regex...');
  // روش جایگزین: تغییر YAxis width
  c = c.replace(
    /<YAxis type="category" dataKey="name" axisLine=\{false\} tickLine=\{false\} width=\{80\} \/>/,
    `<YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  width={130}
                  tick={{ 
                    fontSize: 14, 
                    fill: '#334155', 
                    fontWeight: 600,
                    textAnchor: 'end',
                  }}
                />`,
  );
  c = c.replace(
    /<BarChart data=\{profitLossData\} layout="vertical" margin=\{\{ right: 20 \}\}>/,
    `<BarChart 
                data={profitLossData} 
                layout="vertical" 
                margin={{ right: 30, left: 5, top: 10, bottom: 10 }}
              >`,
  );
  c = c.replace(
    /<Bar dataKey="value" radius=\{\[0, 8, 8, 0\]\}>/,
    '<Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={32}>',
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('✅ Applied via regex');
}

console.log('');
console.log('Changes:');
console.log('  ✓ YAxis width: 80 → 130 (فضای بیشتر برای برچسب‌ها)');
console.log('  ✓ textAnchor: end (چسبیدن برچسب به سمت چپ)');
console.log('  ✓ maxBarSize: 32 (میله‌های نازک‌تر)');
console.log('  ✓ margin چپ اضافه شد');
console.log('');
console.log('=============================================');
console.log('  ✅ Done!');
console.log('=============================================');