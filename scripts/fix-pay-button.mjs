import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-pay-v2', p, 'utf8');
console.log('✅ بکاپ');

let changed = 0;

// چک کنیم onPay در props type هست؟
const typeRegex = /\{\s*item:\s*PendingApproval[\s\S]*?\}/;
const typeMatch = p.match(typeRegex);
if (typeMatch) {
  console.log('── type فعلی ──');
  console.log(typeMatch[0]);
  
  if (!typeMatch[0].includes('onPay')) {
    const newType = typeMatch[0].replace(
      /onNavigate[^,;]*/,
      'onNavigate: () => void; onPay: () => void'
    );
    p = p.replace(typeMatch[0], newType);
    changed++;
    console.log('✅ onPay به type اضافه شد');
  }
}

// درج دکمه پرداخت قبل از دکمه تأیید
// anchor دقیق: خط حاوی onClick={onApprove}
const approveBtnRegex = /(<button\s+onClick=\{onApprove\}[\s\S]*?<\/button>)/;
const approveMatch = p.match(approveBtnRegex);

if (approveMatch) {
  console.log('\n── دکمه تأیید پیدا شد ──');
  console.log(approveMatch[1]);
  
  if (!p.includes('handlePay') || !p.includes('onPay()')) {
    // فقط اگر پچ دکمه اضافه نشده
  }
  
  // افزودن دکمه پرداخت قبل از تأیید
  const payButton = `{item.module === 'petty-cash-request' && item.status === 'APPROVED' && (
              <button
                onClick={onPay}
                className="btn-primary text-sm py-1.5 px-4 bg-amber-600 hover:bg-amber-700"
                title="پرداخت و شارژ تنخواه"
              >
                <Wallet className="w-4 h-4" />
                پرداخت
              </button>
            )}
            `;
  
  p = p.replace(approveMatch[1], payButton + approveMatch[1]);
  changed++;
  console.log('✅ دکمه پرداخت اضافه شد');
} else {
  console.log('❌ دکمه تأیید پیدا نشد');
}

fs.writeFileSync(pagePath, p, 'utf8');
console.log('');
console.log('✅ ذخیره شد (' + changed + ' تغییر)');