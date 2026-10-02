import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

// بکاپ
fs.writeFileSync(pagePath + '.bak-pay-v1', p, 'utf8');
console.log('✅ بکاپ: ApprovalsPage.tsx.bak-pay-v1');

let changes = 0;

// 1) import Wallet — از قبل هست (خط 6)
if (!p.includes('Wallet')) {
  console.log('❌ Wallet در imports نیست — باید دستی');
} else {
  console.log('✅ Wallet از قبل import شده');
}

// 2) افزودن تابع handlePay قبل از "return ("
if (!p.includes('const handlePay')) {
  // anchor: handleAction
  const anchor = p.match(/(const handleAction = async[\s\S]*?\n  \};)/);
  if (anchor) {
    const payFn = anchor[1] + `

  const handlePay = async (id: string) => {
    setActionLoading(true);
    try {
      await approvalsApi.pettyCashPay(id);
      toast.success('تنخواه با موفقیت شارژ شد');
      loadData();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در پرداخت');
    } finally { setActionLoading(false); }
  };`;
    p = p.replace(anchor[1], payFn);
    changes++;
    console.log('✅ handlePay اضافه شد');
  } else {
    console.log('❌ anchor handleAction پیدا نشد');
  }
} else {
  console.log('ℹ handlePay از قبل هست');
}

// 3) افزودن onPay به ApprovalCard call
const cardCallRegex = /(<ApprovalCard[\s\S]*?)(onReject=\{\(\) => setActionItem\(\{ item, action: 'reject' \}\)\})([\s\S]*?\/>)/;
const cardMatch = p.match(cardCallRegex);

if (cardMatch && !p.includes('onPay=')) {
  const newCall = cardMatch[1] + cardMatch[2] + 
    "\n              onPay={() => handlePay(item.id)}" + 
    cardMatch[3];
  p = p.replace(cardMatch[0], newCall);
  changes++;
  console.log('✅ onPay به ApprovalCard اضافه شد');
} else if (p.includes('onPay=')) {
  console.log('ℹ onPay از قبل هست');
} else {
  console.log('❌ anchor ApprovalCard پیدا نشد');
}

// 4) افزودن دکمه Wallet در ApprovalCard props
// ApprovalCard signature: function ApprovalCard({ item, onApprove, onReject, onNavigate }: ...)
const cardSigRegex = /function ApprovalCard\(\{([^}]+)\}/;
const sigMatch = p.match(cardSigRegex);

if (sigMatch && !sigMatch[1].includes('onPay')) {
  const oldSig = sigMatch[1];
  const newSig = oldSig.trimEnd() + ', onPay';
  p = p.replace(sigMatch[0], 'function ApprovalCard({' + newSig + '}');
  changes++;
  console.log('✅ onPay به signature ApprovalCard اضافه شد');
}

// 5) پیدا کردن type def کارت — احتمالاً inline یا جداگانه
// اگر type جداگانه است، اضافه کن
const typeRegex = /\{\s*item:\s*PendingApproval;\s*onApprove[^}]+\}/;
const typeMatch = p.match(typeRegex);
if (typeMatch && !typeMatch[0].includes('onPay')) {
  const newType = typeMatch[0].replace('onNavigate', 'onNavigate: () => void; onPay: () => void');
  if (newType !== typeMatch[0]) {
    p = p.replace(typeMatch[0], newType);
    changes++;
    console.log('✅ onPay به type اضافه شد');
  }
}

// 6) افزودن دکمه Wallet قبل از دکمه تأیید (خط 512-518)
// فقط برای petty-cash-request با status APPROVED
if (!p.includes('handlePayForRequest') && !p.includes('onPay()')) {
  const approveBtnAnchor = `            <button
              onClick={onApprove}
              className="btn-primary text-sm py-1.5 px-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              تأیید
            </button>`;

  const approveBtnAnchorCRLF = approveBtnAnchor.replace(/\n/g, '\r\n');

  const payBtn = `            {item.module === 'petty-cash-request' && item.status === 'APPROVED' && (
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

  if (p.includes(approveBtnAnchorCRLF)) {
    p = p.replace(approveBtnAnchorCRLF, payBtn.replace(/\n/g, '\r\n') + approveBtnAnchorCRLF);
    changes++;
    console.log('✅ دکمه پرداخت اضافه شد (CRLF)');
  } else if (p.includes(approveBtnAnchor)) {
    p = p.replace(approveBtnAnchor, payBtn + approveBtnAnchor);
    changes++;
    console.log('✅ دکمه پرداخت اضافه شد (LF)');
  } else {
    console.log('❌ anchor دکمه تأیید پیدا نشد — باید دستی');
    
    // نمایش ناحیه 490-530
    const lines = p.split('\n');
    console.log('\n── خطوط 490-530 ──');
    for (let i = 489; i < 530 && i < lines.length; i++) {
      console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
    }
  }
}

fs.writeFileSync(pagePath, p, 'utf8');
console.log('');
console.log('✅ ApprovalsPage.tsx ذخیره شد (' + changes + ' تغییر)');