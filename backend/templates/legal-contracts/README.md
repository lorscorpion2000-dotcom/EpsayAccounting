# قالب‌های قرارداد حقوقی

این پوشه شامل قالب‌های HTML قراردادها و اطلاعات ثابت شرکت است.

## فایل‌ها

- `_company.json` — اطلاعات ثابت شرکت (نام، نماینده، کد ملی، آدرس، تلفن، لوگو)
- `CONTRACTOR_AGREEMENT.html` — قالب قرارداد پیمانکاری
- `WORKER_EMPLOYMENT.html` — قالب قرارداد کارگری (همکاری)

## جایگزینی placeholder ها

تمام placeholder ها با الگوی `{{path.to.value}}` نوشته شده‌اند و توسط
`frontend/src/utils/contract-template.ts → renderContractTemplate()` جایگزین می‌شوند.

### placeholder های قرارداد

| placeholder | منبع |
|---|---|
| `{{code}}` | `contract.code` |
| `{{title}}` | `contract.title` |
| `{{subject}}` | `contract.subject` |
| `{{registrationNumber}}` | `contract.registrationNumber` |
| `{{registrationDate}}` | `contract.registrationDate` (شمسی) |
| `{{startDate}}` | `contract.startDate` (شمسی) |
| `{{endDate}}` | `contract.endDate` (شمسی) |
| `{{durationText}}` | `contract.durationText` |
| `{{workLocation}}` | `contract.workLocation` |
| `{{workHoursPerWeek}}` | `contract.workHoursPerWeek` |
| `{{totalAmount}}` | `contract.totalAmount` |
| `{{salaryMonthly}}` | `contract.salaryMonthly` |
| `{{salaryDaily}}` | `contract.salaryDaily` |
| `{{salaryHourly}}` | `contract.salaryHourly` |
| `{{guaranteeType}}` | `contract.guaranteeType` |
| `{{guaranteeNumber}}` | `contract.guaranteeNumber` |
| `{{guaranteeAmount}}` | `contract.guaranteeAmount` |
| `{{guaranteeBank}}` | `contract.guaranteeBank` |
| `{{supervisorName}}` | `contract.supervisorName` |
| `{{companySignerName}}` | `contract.companySignerName` |
| `{{workerSignerName}}` | `contract.workerSignerName` |
| `{{itemsTable}}` | جدول اقلام قرارداد (auto-generated) |

### placeholder های طرف قرارداد (`party`)

| placeholder | منبع |
|---|---|
| `{{party.fullName}}` | نام کامل طرف |
| `{{party.fatherName}}` | نام پدر |
| `{{party.nationalId}}` | کد ملی / شناسه ملی |
| `{{party.registrationNumber}}` | شماره ثبت شرکت |
| `{{party.economicCode}}` | کد اقتصادی |
| `{{party.birthDate}}` | تاریخ تولد (شمسی) |
| `{{party.mobilePhone}}` | موبایل |
| `{{party.landlinePhone}}` | تلفن ثابت |
| `{{party.address}}` | آدرس |
| `{{party.postalCode}}` | کد پستی |
| `{{party.bankName}}` | نام بانک |
| `{{party.bankAccount}}` | شماره حساب |
| `{{party.bankSheba}}` | شماره شبا |
| `{{party.job}}` | شغل |
| `{{party.education}}` | تحصیلات |
| `{{party.insuranceNumber}}` | شماره بیمه |
| `{{party.representative}}` | نام نماینده (اگر حقوقی) |
| `{{party.position}}` | سمت نماینده |

### placeholder های شرکت (از `_company.json`)

| placeholder | مقدار |
|---|---|
| `{{company.name}}` | نام شرکت |
| `{{company.representative}}` | نماینده |
| `{{company.nationalId}}` | کد ملی نماینده |
| `{{company.address}}` | آدرس |
| `{{company.postalCode}}` | کد پستی |
| `{{company.phone}}` | تلفن |
| `{{company.logo}}` | مسیر لوگو |

## نحوه بارگذاری در DB

```powershell
cd E:\EpsayAccounting\backend
node _b15-seed.mjs
```

## نکته امنیت (F3)

همه مقادیر `{{...}}` قبل از جایگزینی HTML-escape می‌شوند و خروجی نهایی
با DOMPurify sanitize می‌شود. پس نیازی به escape دستی نیست.
