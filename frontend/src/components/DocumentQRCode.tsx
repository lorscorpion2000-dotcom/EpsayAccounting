import React from 'react';

interface DocumentQRCodeProps {
  documentType: 'DAILY_REPORT' | 'JOURNAL_ENTRY' | 'INVOICE' | 'PETTY_CASH';
  documentCode: string;
  issuedAt?: string;
  verifyUrl?: string;
}

const TYPE_LABELS: Record<string, string> = {
  DAILY_REPORT: 'گزارش روزانه کارگاه',
  JOURNAL_ENTRY: 'سند حسابداری',
  INVOICE: 'فاکتور مالی',
  PETTY_CASH: 'صورت تنخواه',
};

export const DocumentQRCode: React.FC<DocumentQRCodeProps> = ({
  documentType,
  documentCode,
  issuedAt,
  verifyUrl,
}) => {
  // تولید لینک استعلام اصالت سند
  const baseUrl = verifyUrl || window.location.origin;
  const targetVerifyUrl = `${baseUrl}/verify?type=${documentType}&code=${encodeURIComponent(documentCode)}`;

  // تولید آدرس تصویر QR کد به صورت مستقیم و بدون نیاز به نصب بسته جدید
  const qrImageUrl = `[suspicious link removed]{encodeURIComponent(
    targetVerifyUrl
  )}`;

  return (
    <div className="flex items-center gap-3 p-2 border border-slate-300 rounded bg-white w-fit print:border-black" dir="rtl">
      <img
        src={qrImageUrl}
        alt={`کد QR استعلام ${documentCode}`}
        className="w-16 h-16 object-contain"
      />
      <div className="text-[10px] space-y-0.5 text-slate-600 print:text-black">
        <p className="font-bold text-slate-800 print:text-black">
          {TYPE_LABELS[documentType] || 'سند رسمی اپسای'}
        </p>
        <p className="font-mono dir-ltr text-right">کد: {documentCode}</p>
        {issuedAt && <p>تاریخ: {issuedAt}</p>}
        <p className="text-[9px] text-brand-600 print:text-black font-medium mt-1">
          اسکن جهت استعلام اصالت
        </p>
      </div>
    </div>
  );
};