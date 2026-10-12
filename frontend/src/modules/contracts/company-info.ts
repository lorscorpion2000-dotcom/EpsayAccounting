// frontend/src/modules/contracts/company-info.ts
// اطلاعات ثابت شرکت — آینه‌ی backend/templates/legal-contracts/_company.json
// اگر این مقادیر تغییر کردند، هر دو جا را به‌روز کنید.

export const COMPANY = {
  name: 'استودیو معماری اپسای',
  representative: 'حسن جویانی',
  nationalId: '1465478231',
  address: 'استان اصفهان، شهرستان خوانسار، دهکده گردشگری گلستانکوه',
  postalCode: '8791630010',
  phone: '031-57799501',
  logo: '/images/logo.png',
} as const;
