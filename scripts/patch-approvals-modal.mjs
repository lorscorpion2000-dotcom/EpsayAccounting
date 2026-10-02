import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const pagePath = ROOT + '/frontend/src/modules/approvals/pages/ApprovalsPage.tsx';
let p = fs.readFileSync(pagePath, 'utf8');

fs.writeFileSync(pagePath + '.bak-accountpicker', p, 'utf8');
console.log('✅ بکاپ');

let changes = 0;

// 1) import AccountPickerModal
if (!p.includes('AccountPickerModal')) {
  p = p.replace(
    "import { approvalsApi, PendingApproval, ApprovalStats } from '../services/approvals.api';",
    "import { approvalsApi, PendingApproval, ApprovalStats } from '../services/approvals.api';\nimport AccountPickerModal from '@/modules/petty-cash/components/AccountPickerModal';"
  );
  changes++;
  console.log('✅ import AccountPickerModal');
}

// 2) state برای مودال انتخاب حساب
if (!p.includes('payingItem')) {
  p = p.replace(
    "const [actionLoading, setActionLoading] = useState(false);",
    "const [actionLoading, setActionLoading] = useState(false);\n  const [payingItem, setPayingItem] = useState<PendingApproval | null>(null);"
  );
  changes++;
  console.log('✅ state payingItem');
}

// 3) جایگزینی handlePay قدیمی
const oldHandlePay = p.match(/const handlePay = async[\s\S]*?\n  \};/);

if (oldHandlePay) {
  const newHandlePay = `const handlePay = async (sourceAccountId: string) => {
    if (!payingItem) return;
    try {
      await approvalsApi.pettyCashPay(payingItem.id, sourceAccountId);
      toast.success('تنخواه با موفقیت شار شد');
      setPayingItem(null);
      loadData();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در پرداخت');
      throw e;
    }
  };`;
  p = p.replace(oldHandlePay[0], newHandlePay);
  changes++;
  console.log('✅ handlePay به\u200Cروز شد (با sourceAccountId)');
} else {
  console.log('❌ handlePay پیدا نشد');
}

// 4) پچ onPay در ApprovalCard — بهجای فراخوانی مستقیم مودال باز کند
const oldOnPay = /onPay=\{\(\) => handlePay\(item\.id\)\}/;
const newOnPay = `onPay={() => setPayingItem(item)}`;

if (p.match(oldOnPay)) {
  p = p.replace(oldOnPay, newOnPay);
  changes++;
  console.log('✅ onPay → باز کردن مودال');
} else if (p.includes('onPay=')) {
  // چک کنیم anchor متفاوت است
  const altMatch = p.match(/onPay=\{\(\) => handlePay\([^)]+\)\}/);
  if (altMatch) {
    p = p.replace(altMatch[0], newOnPay);
    changes++;
    console.log('✅ onPay (regex) → باز کردن مودال');
  } else {
    console.log('ℹ onPay از قبل درست است');
  }
}

// 5) افزودن مودال به JSX — قبل از آخرین </div>
if (!p.includes('<AccountPickerModal')) {
  // anchor: قبل از آخرین ); که return را میبندد
  const lastReturnClose = p.lastIndexOf('    </div>\n  );\n}');
  if (lastReturnClose > 0) {
    const modalJsx = `
      <AccountPickerModal
        isOpen={!!payingItem}
        amount={Number(payingItem?.amount || 0)}
        pettyAccountName={payingItem?.accountName}
        requestCode={payingItem?.code}
        onClose={() => setPayingItem(null)}
        onConfirm={handlePay}
      />
`;
    p = p.slice(0, lastReturnClose) + modalJsx + p.slice(lastReturnClose);
    changes++;
    console.log('✅ modal به JSX اضافه شد');
  } else {
    // تلاش دیگر
    const altClose = p.lastIndexOf('    </div>\r\n  );\r\n}');
    if (altClose > 0) {
      const modalJsx = `\r
      <AccountPickerModal\r
        isOpen={!!payingItem}\r
        amount={Number(payingItem?.amount || 0)}\r
        pettyAccountName={payingItem?.accountName}\r
        requestCode={payingItem?.code}\r
        onClose={() => setPayingItem(null)}\r
        onConfirm={handlePay}\r
      />\r
`;
      p = p.slice(0, altClose) + modalJsx + p.slice(altClose);
      changes++;
      console.log('✅ modal به JSX اضافه شد (CRLF)');
    } else {
      console.log('❌ anchor بستن return پیدا نشد');
      // نمایش ۱۰ خط آخر
      const lines = p.split('\n');
      console.log('\n── ۱۰ خط آخر ──');
      lines.slice(-10).forEach((l, i) => console.log(String(lines.length - 9 + i).padStart(4) + '| ' + l));
    }
  }
} else {
  console.log('ℹ modal از قبل هست');
}

fs.writeFileSync(pagePath, p, 'utf8');
console.log('');
console.log('✅ ApprovalsPage.tsx ذخیره شد (' + changes + ' تغییر)');