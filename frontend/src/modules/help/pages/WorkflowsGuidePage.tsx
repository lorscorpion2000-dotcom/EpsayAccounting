import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ShoppingCart, ShoppingBag, Wallet, ClipboardList, PackagePlus, FileCheck2, Calendar, ArrowDown, CheckCircle2, XCircle, User, Send, Ban, GitBranch, Info, Package, FileWarning, Lock, Trash2, Ruler } from 'lucide-react';
import clsx from 'clsx';
import { useRef } from 'react';
import PrintButton from '@/components/PrintButton';
import PrintHeader from '@/components/PrintHeader';

interface Step {
  actor: string;
  action: string;
  icon: any;
  color: string;
  target?: string;
}

interface Workflow {
  key: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  steps: Step[];
  onApprove?: string[];
  onReject?: string[];
  route?: string;
}

const WORKFLOWS: Workflow[] = [
  // ═══════════════════════════════════════════════════════
  // ۵ کارت اصلاح‌شده (طبق کشفیات جلسه ۴)
  // ═══════════════════════════════════════════════════════
  {
    key: 'fiscal-year',
    title: 'مدیریت سال مالی',
    description: 'ایجاد، جاری‌سازی، تولید اسناد افتتاحیه/اختتامیه، بستن و بازگشایی سال‌های مالی — مبنای همه اسناد حسابداری',
    icon: Calendar,
    color: 'cyan',
    route: '/settings/fiscal-years',
    steps: [
      { actor: 'مدیر ارشد', action: 'ایجاد سال مالی جدید (کد + نام + بازه)', icon: User, color: 'slate', target: 'رکورد FiscalYear' },
      { actor: 'مدیر ارشد', action: 'تنظیم به‌عنوان سال جاری (isCurrent=true)', icon: CheckCircle2, color: 'emerald', target: 'مبنای ثبت اسناد' },
      { actor: 'حسابدار', action: 'ثبت اسناد در طول سال مالی', icon: FileText, color: 'blue', target: 'JournalEntry' },
      { actor: 'حسابدار', action: 'تولید سند اختتامیه (بستن حساب‌های موقت ۴.x و ۵.x)', icon: FileText, color: 'violet', target: 'سند اختتامیه' },
      { actor: 'مدیر ارشد', action: 'بستن سال مالی', icon: Lock, color: 'amber', target: 'سال بسته‌شده' },
    ],
    onApprove: [
      'فقط یک سال مالی می‌تواند «جاری» باشد — با set-current، سال قبلی خودکار غیرجاری می‌شود',
      'close رد می‌شود اگر در آن سال حتی یک سند DRAFT باشد — ابتدا همه DRAFTها را post یا ابطال کنید',
      'پس از close، هر JE جدید در آن سال با PERIOD_LOCKED رد می‌شود',
      'بازگشایی (reopen): سال CLOSED را به OPEN برمی‌گرداند؛ پرچم isCurrent سایر سال‌ها دست‌نخورده می‌ماند',
      'سند افتتاحیه: مانده‌های دائمی (دارایی/بدهی/سرمایه) از سال قبل منتقل می‌شود',
      'سند اختتامیه: حساب‌های موقت (۴.x درآمد و ۵.x هزینه) بسته و به سود و زیان انباشته (۳.۳) منتقل می‌شوند',
    ],
    onReject: [
      'سال مالی باز است حتی اگر اسناد و تراکنش‌ها داشته باشد — close فقط با DRAFTهای موجود مسدود می‌شود',
      'اگر می‌خواهید فقط یک ماه خاص قفل شود، از «قفل دوره مالی» استفاده کنید (سبک‌تر از close)',
      'برای حذف: از دکمه «آرشیو» (soft-delete، قابل بازیابی از سوابق حذف) استفاده کنید',
      'حذف دائمی فقط توسط admin (غیرقابل بازیابی) — اگر ارجاع داشته باشد خطا می‌دهد',
    ],
  },
  {
    key: 'period-lock',
    title: 'قفل دوره مالی',
    description: 'جلوگیری از ثبت اسناد حسابداری در ماه‌های قفل‌شده — مستقل از بستن کل سال',
    icon: Lock,
    color: 'orange',
    route: '/settings/period-lock',
    steps: [
      { actor: 'حسابدار', action: 'قفل کردن ماه (monthKey میلادی YYYY-MM)', icon: Lock, color: 'slate', target: 'ذخیره در FiscalYear.lockedMonths' },
      { actor: 'سیستم', action: 'چک خودکار در هر ثبت سند (journalsService.create، sales-invoice.approve، ...)', icon: XCircle, color: 'red', target: 'PERIOD_LOCKED' },
      { actor: 'حسابدار', action: 'بازکردن قفل (در صورت نیاز)', icon: Lock, color: 'emerald', target: 'unlock-month' },
    ],
    onApprove: [
      'monthKey به فرمت میلادی YYYY-MM است (مثال: "2026-10" — نه شمسی)',
      'مسیر قفل: POST /api/fiscal-years/{fiscalYearId}/lock-month با بدنه { monthKey: "2026-10" }',
      'مسیر بازکردن: POST /api/fiscal-years/{id}/unlock-month با همان بدنه',
      'بررسی در JournalsService.create() با assertPeriodOpen انجام می‌شود',
      'در صورت قفل بودن ماه → 400 PERIOD_LOCKED با پیام «month YYYY-MM is locked»',
      'قفل روی همه‌ی سرویس‌های نویسنده اعمال می‌شود: /journals، /sales-invoices/:id/approve، /sales-receipts',
      'قفل ماه مستقل از close سال است — می‌توان ماه را قفل کرد و سال باز ماند',
    ],
    onReject: [
      'اگر می‌خواهید کل سال بسته شود → close سال مالی (به کارت «مدیریت سال مالی» مراجعه کنید)',
      'سرویس‌هایی که به سال جاری وابسته‌اند (مانند شارژ تنخواه) نیاز دارند حداقل یک FiscalYear با isCurrent=true & status=OPEN وجود داشته باشد',
      'برای رفع خطای «هیچ سال مالی جاری فعالی وجود ندارد»: PATCH /api/fiscal-years/:id/set-current روی یک سال با status=OPEN',
    ],
  },
  {
    key: 'petty-charge',
    title: 'درخواست شارژ تنخواه',
    description: 'درخواست تأمین نقدینگی تنخواه‌دار از مدیر و پرداخت توسط حسابداری — با سند خودکار',
    icon: Wallet,
    color: 'emerald',
    route: '/petty-cash',
    steps: [
      { actor: 'تنخواه‌دار', action: 'ثبت درخواست شارژ (accountId + amount + reason)', icon: User, color: 'slate', target: 'PENDING' },
      { actor: 'مدیر', action: 'تأیید یا رد', icon: CheckCircle2, color: 'amber', target: 'APPROVED/REJECTED' },
      { actor: 'حسابدار', action: 'پرداخت با انتخاب حساب مبدأ (sourceAccountId)', icon: Wallet, color: 'blue', target: 'PATCH /:id/pay' },
      { actor: 'سیستم', action: 'ثبت JE + افزایش موجودی تنخواه', icon: FileText, color: 'emerald', target: 'PETTY_CASH_CHARGE' },
    ],
    onApprove: [
      'فیلد sourceAccountId در pay الزامی است — حساب بانک یا صندوق که از آن پرداخت می‌شود',
      'بدنه pay: { sourceAccountId: "<account-id>" } — فقط این فیلد',
      'سند خودکار: Dr 1.1.5 (تنخواه‌گردان‌ها) / Cr حساب مبدأ',
      'sourceType = PETTY_CASH_CHARGE، کد JE: JE-PC-YYYY-####',
      'تراکنش متناظر از نوع FUNDING ساخته و به JE لینک می‌شود',
      'موجودی تنخواه به مقدار amount افزایش می‌یابد',
      '⚠ پیش‌نیاز: حداقل یک FiscalYear با isCurrent=true و status=OPEN باید وجود داشته باشد',
    ],
    onReject: [
      'درخواست در وضعیت REJECTED قرار می‌گیرد و دلیل رد نمایش داده می‌شود',
      'تنخواه‌دار می‌تواند ویرایش و دوباره ارسال کند',
      'اگر pay با «هیچ سال مالی جاری فعالی وجود ندارد» مواجه شد، ابتدا یک سال را با set-current جاری کنید',
      'حذف نرم با DELETE /petty-cash/requests/:id/admin (soft-delete پیش‌فرض)',
    ],
  },
  {
    key: 'journal',
    title: 'سند حسابداری دستی',
    description: 'ثبت سند دوبل با کنترل تراز خودکار و مدیریت وضعیت DRAFT/POSTED',
    icon: FileText,
    color: 'emerald',
    route: '/accounting/journals',
    steps: [
      { actor: 'حسابدار', action: 'ثبت سند (DRAFT) با بدنه { fiscalYearId, entryDate, description, lines: [...] }', icon: User, color: 'slate', target: 'JournalEntry.DRAFT' },
      { actor: 'حسابدار', action: 'بازبینی سند', icon: CheckCircle2, color: 'emerald', target: 'پیش‌نمایش' },
      { actor: 'حسابدار', action: 'ثبت نهایی (PATCH /:id/post)', icon: CheckCircle2, color: 'emerald', target: 'POSTED' },
      { actor: 'مدیر مالی', action: 'ابطال (در صورت نیاز)', icon: Ban, color: 'red', target: 'سند معکوس' },
    ],
    onApprove: [
      'مسیر ثبت: POST /api/journals',
      'مسیر ثبت نهایی: PATCH /api/journals/{id}/post (توجه: POST /post کار نمی‌کند، فقط PATCH)',
      'entryDate باید داخل بازه FiscalYear مربوطه باشد',
      'برای یافتن DRAFTهای یک سال: GET /api/journals?status=DRAFT&fiscalYearId={id}',
      'توجه: پارامتر take/limit در GET /journals نادیده گرفته می‌شود (همیشه حداکثر ۵۰ رکورد) — برای نتایج دقیق‌تر از فیلتر status/fiscalYearId استفاده کنید',
      'برای close سال مالی، draftCount باید صفر باشد — ابتدا همه DRAFTها را post یا ابطال کنید',
      'سند POSTED قابل حذف نیست — فقط ابطال (reversal)',
    ],
    onReject: [
      'سند ابطال‌شده: یک سند معکوس خودکار ثبت می‌شود',
      'دلیل ابطال در سند اصلی نمایش داده می‌شود',
      'فیلدهای sourceType و sourceId مشخص می‌کنند سند دستی است یا خودکار',
      'برای حذف نرم سند POSTED: از admin (soft-delete) یا ابطال رسمی استفاده کنید',
    ],
  },
  {
    key: 'admin-hard-delete',
    title: 'حذف نرم و بازگردانی (Recycle Bin)',
    description: 'حذف نرم پیش‌فرض، بازیابی از سوابق، و حذف دائمی توسط admin',
    icon: Trash2,
    color: 'red',
    route: '/recycle-bin',
    steps: [
      { actor: 'کاربر', action: 'حذف رکورد → DELETE /{resource}/{id}/admin', icon: Trash2, color: 'slate', target: 'soft-delete پیش‌فرض' },
      { actor: 'سیستم', action: 'ثبت deletedAt + deletedBy در رکورد', icon: ClipboardList, color: 'amber', target: 'hidden from list' },
      { actor: 'کاربر', action: 'بازیابی از سوابق حذف', icon: CheckCircle2, color: 'emerald', target: 'PATCH /:id/restore' },
      { actor: 'مدیر ارشد', action: 'حذف دائمی (hard)', icon: Ban, color: 'red', target: 'adminHardDelete' },
    ],
    onApprove: [
      'مسیر adminDelete در سرویس مشترک الان **soft-delete** می‌زند (deletedAt + deletedBy)',
      'رکورد soft-deleted از لیست عادی پنهان است اما در /deleted/list نمایش داده می‌شود',
      'restore با استفاده از __withDeleted: true رکورد را برمی‌گرداند',
      'اگر رکورد soft-deleted با همان کلید یونیک دوباره ساخته شود → 400/409 (کلید همچنان اشغال است)',
      'موجودیت‌های پشتیبانی: اسناد، اشخاص، پروژه، قرارداد، کالا، انبار، مشتری، قرارداد فروش، پرسنل، تنخواه و ...',
    ],
    onReject: [
      'حذف دائمی: متد adminHardDelete در SoftDeleteService — فقط در موارد استثنایی',
      'اگر رکورد در جای دیگری ارجاع داشته باشد، hard-delete خطا می‌دهد',
      'بازگرداندن hard-delete فقط از طریق بازیابی DB ممکن است',
      'برای دیدن لیست soft-deleted: GET /{resource}/deleted/list?take=&skip=',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // ۶ کارت جدید
  // ═══════════════════════════════════════════════════════
  {
    key: 'sales-unit-flow',
    title: 'چرخه فروش واحد',
    description: 'از تعریف واحد و مشتری تا قرارداد، فعال‌سازی، فاکتور و دریافت — با اسناد حسابداری خودکار',
    icon: ShoppingBag,
    color: 'violet',
    route: '/sales/units',
    steps: [
      { actor: 'کارشناس فروش', action: 'تعریف واحد قابل فروش (projectId + unitNumber)', icon: User, color: 'slate', target: 'SalesUnit.AVAILABLE' },
      { actor: 'کارشناس فروش', action: 'تعریف مشتری (fullName + nationalId)', icon: User, color: 'slate', target: 'SalesCustomer + تفصیل 1.1.2' },
      { actor: 'کارشناس فروش', action: 'ثبت قرارداد DRAFT + اقساط', icon: FileText, color: 'indigo', target: 'SalesUnit.RESERVED' },
      { actor: 'مدیر فروش', action: 'فعال‌سازی قرارداد', icon: CheckCircle2, color: 'emerald', target: 'ACTIVE + unit SOLD' },
      { actor: 'کارشناس فروش', action: 'صدور فاکتور فروش (DRAFT)', icon: FileText, color: 'blue', target: 'SalesInvoice' },
      { actor: 'مدیر مالی', action: 'تأیید فاکتور', icon: CheckCircle2, color: 'emerald', target: 'JE SALES_INVOICE' },
      { actor: 'حسابداری', action: 'ثبت دریافت (CASH/BANK)', icon: Wallet, color: 'blue', target: 'JE SALES_RECEIPT + PAID' },
    ],
    onApprove: [
      'SalesUnit compound unique: (projectId, unitNumber, block)',
      'SalesContract flow: DRAFT → activate() → ACTIVE، یا cancel(reason) → CANCELLED',
      'اثر جانبی ایجاد قرارداد: unit.status = RESERVED',
      'اثر جانبی activate: unit.status = SOLD',
      'اثر جانبی cancel/remove: unit.status = AVAILABLE',
      'فاکتور فروش: 10% VAT پیش‌فرض — total = subtotal − discount + tax',
      'JE تأیید فاکتور (SALES_INVOICE):',
      '  Dr: تفصیل مشتری 1.1.2.NN به مبلغ total',
      '  Cr: حساب درآمد (mapping SALES_INVOICE_REVENUE — معمولاً 4.1.1 درآمد قراردادها)',
      '  Cr: حساب VAT فروش 2.1.3.01 به مبلغ taxAmount',
      'JE دریافت (SALES_RECEIPT):',
      '  Dr: صندوق 1.1.1.01 (CASH) یا حساب بانک (BANK_TRANSFER با bankAccountId)',
      '  Cr: تفصیل مشتری 1.1.2.NN',
      'approve فاکتور و ثبت receipt به Period Lock احترام می‌گذارند',
      'روش‌های پرداخت CASH و BANK_TRANSFER پشتیبانی می‌شوند؛ CHEQUE/OTHER فعلاً نه',
    ],
    onReject: [
      'حذف قرارداد بدون force فقط در وضعیت DRAFT یا CANCELLED ممکن است',
      'بعد از activate اگر پرداختی ثبت شده باشد، حذف قرارداد رد می‌شود',
      'حذف مشتری فقط با force=true و بعد از پاک‌سازی ارجاعات',
      'فاکتور فقط در وضعیت DRAFT قابل ویرایش یا حذف است',
    ],
  },
  {
    key: 'petty-expense',
    title: 'هزینه از تنخواه',
    description: 'ثبت هزینه، تأیید، و ثبت سند حسابداری خودکار با کاهش موجودی تنخواه',
    icon: Wallet,
    color: 'orange',
    route: '/petty-cash/transactions',
    steps: [
      { actor: 'تنخواه‌دار', action: 'ثبت تراکنش EXPENSE (amount + recipient + category)', icon: User, color: 'slate', target: 'DRAFT' },
      { actor: 'تنخواه‌دار', action: 'ارسال برای تأیید (PATCH /:id/submit)', icon: Send, color: 'amber', target: 'SUBMITTED' },
      { actor: 'حسابدار', action: 'تأیید (PATCH /:id/approve)', icon: CheckCircle2, color: 'emerald', target: 'APPROVED + JE' },
      { actor: 'سیستم', action: 'کاهش موجودی تنخواه', icon: FileText, color: 'emerald', target: 'PETTYCASH_EXPENSE' },
    ],
    onApprove: [
      'سند خودکار: Dr حساب هزینه (بسته به category) / Cr 1.1.5 (تنخواه‌گردان‌ها)',
      'sourceType = PETTYCASH_EXPENSE',
      'موجودی تنخواه به مقدار amount کاهش می‌یابد',
      'فیلدهای اختیاری: partnerId (طرف حساب)، projectId، wbsItemId، invoiceNumber، invoiceImage',
      'submit و approve هر دو با PATCH انجام می‌شوند (نه POST)',
      'پس از approve، JE در journal entries با کد JV-YYYY-NNNNN ثبت می‌شود',
    ],
    onReject: [
      'تراکنش در وضعیت REJECTED قرار می‌گیرد — موجودی تنخواه تغییری نمی‌کند',
      'دلیل رد ثبت می‌شود',
      'حذف نرم با DELETE /petty-cash/transactions/:id/admin',
    ],
  },
  {
    key: 'payroll',
    title: 'دوره حقوق و دستمزد',
    description: 'محاسبه حقوق از حضور و غیاب، تأیید و پرداخت — با ثبت سند PAYROLL_ACCRUAL',
    icon: Calendar,
    color: 'cyan',
    route: '/payroll/periods',
    steps: [
      { actor: 'مدیر مالی', action: 'ایجاد دوره حقوق (year + month + startDate + endDate)', icon: User, color: 'slate', target: 'PayrollPeriod DRAFT' },
      { actor: 'مدیر مالی', action: 'محاسبه از حضور و غیاب (calculate-from-attendance)', icon: ClipboardList, color: 'amber', target: 'PayrollRecord' },
      { actor: 'مدیر مالی', action: 'تأیید دوره (PATCH /approve)', icon: CheckCircle2, color: 'emerald', target: 'APPROVED + JE' },
      { actor: 'مدیر مالی', action: 'پرداخت (PATCH /pay)', icon: Wallet, color: 'blue', target: 'PAID' },
    ],
    onApprove: [
      'مسیر: POST /api/payroll/periods { year, month, title, startDate, endDate, projectId? }',
      'قبل از محاسبه، attendance باید ثبت شده باشد (کارت «حضور و غیاب گروهی»)',
      'calculate-from-attendance: PATCH /api/payroll/periods/:id/calculate-from-attendance',
      'JE PAYROLL_ACCRUAL در مرحله approve ساخته می‌شود (نه قبل)',
      '⚠ باگ #۱۵ (جلسه ۳): JE فعلی فقط net را ثبت می‌کند — سهم بیمه کارمند دور می‌رود',
      'گزارش مالیاتی: GET /api/tax-reports/payroll-tax?year=1405&month=3',
      'کد دوره حقوق: توالی در جدول PayrollPeriod',
    ],
    onReject: [
      'حذف DRAFT دوره با DELETE /:id (soft-delete)',
      'اگر دوره pay شده باشد، حذف مجاز نیست',
      'برای رفع مشکل JE حقوق، باگ #۱۵ را در اولویت قرار دهید',
    ],
  },
  {
    key: 'attendance',
    title: 'حضور و غیاب گروهی',
    description: 'ثبت حضور روزانه پرسنل — پایه محاسبه دوره حقوق',
    icon: ClipboardList,
    color: 'indigo',
    route: '/payroll/attendance',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت گروهی حضور (BulkAttendance)', icon: ClipboardList, color: 'indigo', target: 'attendances table' },
      { actor: 'سیستم', action: 'ذخیره با compound unique (employeeId, attendanceDate)', icon: CheckCircle2, color: 'emerald', target: 'upsert' },
      { actor: 'مدیر مالی', action: 'استفاده در calculate-from-attendance', icon: Wallet, color: 'blue', target: 'PayrollRecord' },
    ],
    onApprove: [
      '⚠ نکته کلیدی: employeeId در attendance = Partner.id (نه EmployeeProfile.id)',
      'مصرف‌کننده باید partnerId را از EmployeeProfile بگیرد و به‌عنوان employeeId بفرستد',
      'مسیر: POST /api/payroll/attendance/bulk { projectId?, items: [{ employeeId, attendanceDate, status, checkIn?, checkOut?, workHours?, overtimeHours?, notes? }] }',
      'status: PRESENT | ABSENT | LEAVE | SICK | MISSION | HOLIDAY',
      'compound unique (employeeId, attendanceDate) — ثبت مجدد، رکورد قبلی را به‌روزرسانی می‌کند (upsert)',
      'پچ #۱۳ (جلسه ۳) روی soft-delete.middleware این compound unique را فعال می‌کند',
    ],
    onReject: [
      'تاریخ‌های آینده معمولاً مجاز نیستند',
      'اگر کارمندی partner ندارد، ابتدا EmployeeProfile با partnerId بسازید',
      'برای بازبینی: GET /api/payroll/attendance?employeeId=<partnerId>',
    ],
  },
  {
    key: 'adjustment',
    title: 'تعدیل صورت‌وضعیت پیمانکار',
    description: 'محاسبه تعدیل بر اساس شاخص‌های تعدیل (مصالح/دستمزد) و ثبت سند خودکار',
    icon: FileCheck2,
    color: 'amber',
    route: '/accounting/adjustments',
    steps: [
      { actor: 'مدیر پروژه', action: 'ثبت شاخص تعدیل (مصالح/دستمزد) برای هر ماه', icon: ClipboardList, color: 'amber', target: 'AdjustmentIndex' },
      { actor: 'حسابدار', action: 'محاسبه تعدیل روی صورت‌وضعیت (calculate)', icon: FileCheck2, color: 'slate', target: 'DRAFT' },
      { actor: 'مدیر مالی', action: 'تأیید محاسبه (confirm)', icon: CheckCircle2, color: 'emerald', target: 'CONFIRMED' },
      { actor: 'حسابدار', action: 'ثبت سند (post)', icon: FileText, color: 'blue', target: 'JE adjustment' },
    ],
    onApprove: [
      'مسیر محاسبه: POST /api/adjustments/calculate { projectId, statementId?, contractId?, periodFrom, periodTo, category, baseAmount, currentYear, currentMonth }',
      'category: MATERIALS یا LABOR (یا مشابه)',
      'شاخص‌ها ابتدا باید در adjustment_indices ثبت شده باشند: GET/POST /adjustment-indices',
      'JE adjustment: Dr/Cr حساب تعدیل پرداختنی و هزینه تعدیل',
      '⚠ باگ #۱۷ (جلسه ۳): coefficient=1 پیش‌فرض است — adjusted_amount = base_amount بدون تغییر',
      'بین confirm و post، محاسبه قابل ویرایش است',
      'در نمونه جلسه ۳: تعدیل 300M با JE JV-1405-00115 ثبت شد',
    ],
    onReject: [
      'اگر شاخص ماه مقصد ثبت نشده باشد، محاسبه رد می‌شود',
      'اگر محاسبه confirm شده باشد، فقط با ابطال قابل تغییر است',
      'حذف محاسبه DRAFT با DELETE /adjustments/:id',
    ],
  },
  {
    key: 'goods-issue',
    title: 'حواله انبار (Goods Issue)',
    description: 'خروج کالا از انبار به کارگاه — کاهش موجودی + ثبت سند GOODS_ISSUE',
    icon: PackagePlus,
    color: 'indigo',
    route: '/warehouse/issues',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت حواله (GIN-YYYY-####) با ردیف‌ها', icon: User, color: 'slate', target: 'DRAFT' },
      { actor: 'انباردار', action: 'تأیید + ثبت نهایی', icon: CheckCircle2, color: 'amber', target: 'POSTED' },
      { actor: 'سیستم', action: 'کاهش Stock + StockMovement + JE GOODS_ISSUE', icon: FileText, color: 'emerald', target: 'JE GOODS_ISSUE' },
    ],
    onApprove: [
      'وضعیت: DRAFT → SUBMITTED → APPROVED → POSTED',
      'JE: Dr حساب مصرف (بسته به پروژه/WBS) / Cr انبار',
      'sourceType = GOODS_ISSUE',
      'کاهش Stock با FIFO یا میانگین (بسته به تنظیمات)',
      'گزارش کاردکس: GET /api/warehouse/reports/kardex?itemId=',
      '⚠ باگ #۴ (جلسه ۳): POST /:id/post پاسخ body خالی می‌دهد (فقط status 200) — ولی JE ثبت می‌شود',
    ],
    onReject: [
      'اگر حواله APPROVED نشده باشد، موجودی کاهش نمی‌یابد',
      'پس از POSTED، ابطال فقط با سند معکوس',
      '⚠ باگ #۵ (جلسه ۳): پیام تأیید daily-report گمراه‌کننده است',
    ],
  },

  // ═══════════════════════════════════════════════════════
  // ۱۱ کارت حفظ‌شده (بدون تغییر)
  // ═══════════════════════════════════════════════════════
  {
    key: 'purchase-request',
    title: 'درخواست خرید (PR)',
    description: 'درخواست خرید کالا توسط کاربر، تأیید مدیر و تبدیل خودکار به دستور خرید',
    icon: ShoppingCart,
    color: 'blue',
    route: '/procurement/requests',
    steps: [
      { actor: 'کاربر', action: 'ثبت درخواست خرید', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر', action: 'تأیید یا رد', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ساخت خودکار PO + اختصاص به کارپرداز', icon: FileText, color: 'emerald', target: 'کارتابل کارپرداز' },
      { actor: 'کارپرداز', action: 'انتخاب تأمین‌کننده و قیمت‌ها', icon: ShoppingBag, color: 'indigo', target: 'PO نهایی' },
    ],
    onApprove: [
      'PR status → ORDERED',
      'سیستم خودکار یک PO با کد PO-YYYY-#### می‌سازد',
      'PO به کارپرداز اختصاص می‌یابد (بر اساس نقش purchaser)',
      'تأمین‌کننده خالی است و باید توسط کارپرداز پر شود',
    ],
    onReject: [
      'PR status → REJECTED',
      'دلیل رد برای درخواست‌کننده ارسال می‌شود',
      '⚠ باگ #۱۰ (جلسه ۳): PR حذف نمی‌شود مگر DRAFT باشد',
    ],
  },
  {
    key: 'purchase-order',
    title: 'دستور خرید (PO)',
    description: 'دستور خرید پس از تأیید PR خودکار ساخته می‌شود — نیازی به تأیید مجدد ندارد',
    icon: ShoppingBag,
    color: 'orange',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'ساخت خودکار PO از PR تأییدشده', icon: FileText, color: 'emerald' },
      { actor: 'کارپرداز', action: 'تکمیل اطلاعات (تأمین‌کننده + قیمت)', icon: ShoppingBag, color: 'indigo', target: 'PO نهایی' },
      { actor: 'کارپرداز', action: 'ارسال به تأمین‌کننده', icon: Send, color: 'amber', target: 'ثبت رسید انبار' },
      { actor: 'انباردار', action: 'ثبت رسید پس از دریافت کالا', icon: PackagePlus, color: 'violet' },
    ],
    onApprove: [
      'PO به تأمین‌کننده ارسال می‌شود (status → SENT)',
      'پس از دریافت کالا، انباردار رسید ثبت می‌کند',
      'موجودی انبار خودکار افزایش می‌یابد',
      '⚠ باگ #۱ (جلسه ۳): PO service پیش‌فرض taxPercent=10 می‌گذارد، PI کپی نمی‌کند',
    ],
    onReject: [
      'حذف PO فقط در وضعیت DRAFT',
      'پس از ثبت GRN، PO قابل ابطال نیست',
    ],
  },
  {
    key: 'goods-receipt',
    title: 'رسید انبار',
    description: 'ثبت دریافت کالا از تأمین‌کننده یا کارگاه',
    icon: PackagePlus,
    color: 'violet',
    route: '/warehouse/receipts',
    steps: [
      { actor: 'انباردار', action: 'ثبت رسید', icon: User, color: 'slate', target: 'کارتابل سرپرست کارگاه' },
      { actor: 'سرپرست کارگاه', action: 'تأیید دریافت', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ثبت نهایی + افزایش موجودی انبار', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'رسید status → POSTED',
      'موجودی انبار افزایش می‌یابد',
      'تراکنش StockMovement ثبت می‌شود',
      'JE GOODS_RECEIPT ساخته می‌شود',
    ],
    onReject: [
      'رسید status → CANCELLED',
      'ثبت نهایی انجام نمی‌شود',
      '⚠ باگ #۲ (جلسه ۳): DELETE /:id/admin نیاز به reason دارد',
      '⚠ باگ #۳ (جلسه ۳): حرکات انبار یتیم بعد از soft-delete رسید',
    ],
  },
  {
    key: 'subcontractor-statement',
    title: 'صورت‌وضعیت پیمانکار',
    description: 'ثبت صورت‌وضعیت پیمانکاران جزء توسط سرپرست کارگاه و تأیید مدیر پروژه',
    icon: FileText,
    color: 'indigo',
    route: '/payroll/subcontractor-statements',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت صورت‌وضعیت (SS-YYYY-####) + ردیف‌های WBS', icon: User, color: 'slate', target: 'کارتابل مدیر پروژه' },
      { actor: 'مدیر پروژه', action: 'پیوست نقشه + تأیید', icon: CheckCircle2, color: 'indigo', target: 'کارتابل مدیر ارشد' },
      { actor: 'مدیر ارشد', action: 'تأیید نهایی', icon: CheckCircle2, color: 'emerald', target: 'کارتابل حسابداری' },
      { actor: 'حسابداری', action: 'پرداخت + ثبت سند', icon: Wallet, color: 'blue', target: 'PAID' },
    ],
    onApprove: [
      'وضعیت‌ها: DRAFT → SUBMITTED → APPROVED → PAID',
      'در هر مرحله، تأییدکننده می‌تواند فایل‌های پیوست اضافه کند',
      'پس از تأیید نهایی، به کارتابل حسابداری منتقل می‌شود',
      '⚠ باگ #۱۶ (جلسه ۳): contractId به LegalContract وصل می‌شود نه ProjectContract — این فیلد را نفرستید',
      'JE PAYROLL_ACCRUAL برای صورت‌وضعیت: Dr هزینه پیمانکاری / Cr حساب پرداختنی پیمانکار',
    ],
    onReject: [
      'صورت‌وضعیت status → REJECTED',
      'دلیل رد برای سرپرست کارگاه نمایش داده می‌شود',
    ],
  },
  {
    key: 'daily-report',
    title: 'گزارش روزانه کارگاه',
    description: 'ثبت وقایع روزانه کارگاه و دریافت تأیید سرپرست',
    icon: ClipboardList,
    color: 'amber',
    route: '/site-ops/daily-reports',
    steps: [
      { actor: 'سرپرست کارگاه', action: 'ثبت گزارش روزانه', icon: User, color: 'slate', target: 'کارتابل مدیر' },
      { actor: 'مدیر پروژه', action: 'تأیید گزارش', icon: CheckCircle2, color: 'indigo' },
      { actor: 'سیستم', action: 'ثبت به‌عنوان سابقه رسمی کارگاه', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'گزارش status → APPROVED',
      'برای گزارشات تحلیلی استفاده می‌شود',
    ],
    onReject: [
      'گزارش status → REJECTED',
      'سرپرست باید دلایل را اصلاح کند',
      '⚠ باگ #۵ (جلسه ۳): پیام approve گمراه‌کننده است',
    ],
  },
  {
    key: 'leave-advance',
    title: 'مرخصی و مساعده',
    description: 'درخواست مرخصی یا مساعده پرسنل',
    icon: Calendar,
    color: 'cyan',
    route: '/payroll/leave-requests',
    steps: [
      { actor: 'پرسنل', action: 'ثبت درخواست', icon: User, color: 'slate', target: 'کارتابل سرپرست' },
      { actor: 'سرپرست کارگاه', action: 'تأیید اول', icon: CheckCircle2, color: 'amber', target: 'کارتابل منابع انسانی' },
      { actor: 'منابع انسانی', action: 'تأیید نهایی', icon: CheckCircle2, color: 'cyan', target: 'کارتابل حسابداری' },
      { actor: 'حسابداری', action: 'پرداخت + ثبت سند', icon: Wallet, color: 'blue' },
    ],
    onApprove: [
      'درخواست به مرحله بعد منتقل می‌شود',
      'در محاسبه حقوق ماهانه لحاظ می‌شود',
    ],
    onReject: [
      'درخواست status → REJECTED',
      'به درخواست‌کننده اطلاع داده می‌شود',
    ],
  },
  {
    key: 'budget-check',
    title: 'کنترل بودجه در تأیید PO',
    description: 'هنگام تأیید دستور خرید، مجموع تعهدات و واقعی با بودجه WBS مقایسه می‌شود',
    icon: ClipboardList,
    color: 'amber',
    route: '/procurement/orders',
    steps: [
      { actor: 'سیستم', action: 'محاسبه بودجه + تعهدات + واقعی', icon: ClipboardList, color: 'slate', target: 'بررسی آستانه' },
      { actor: 'سیستم', action: 'مقایسه با بودجه × (۱ + آستانه)', icon: FileCheck2, color: 'amber', target: 'هشدار یا تأیید' },
      { actor: 'مدیر', action: 'تأیید با وجود هشدار', icon: CheckCircle2, color: 'emerald', target: 'PO → APPROVED' },
    ],
    onApprove: [
      'بودجه از WBS خوانده می‌شود',
      'تعهدات = مجموع PO های APPROVED روی همان WBS',
      'واقعی = مجموع فاکتورهای خرید روی همان WBS',
      'آستانه پیش‌فرض ۱۰٪ — قابل تغییر در کد',
      'اگر مجموع پیش‌بینی از آستانه بگذرد، هشدار نمایش داده می‌شود',
    ],
    onReject: [
      'اگر کاربر تأیید نکند، PO در DRAFT باقی می‌ماند',
      '⚠ باگ #۷ (جلسه ۳): Budget vs Actual endpoint نیست',
    ],
  },
  {
    key: 'fixed-asset',
    title: 'دارایی ثابت از فاکتور خرید',
    description: 'در فاکتور خرید، اقلام CAPITAL به‌صورت خودکار به دارایی ثابت تبدیل می‌شوند',
    icon: Package,
    color: 'violet',
    route: '/procurement/invoices',
    steps: [
      { actor: 'کاربر', action: 'ثبت فاکتور با تیک «دارایی ثابت»', icon: User, color: 'slate', target: 'ذخیره DRAFT' },
      { actor: 'حسابدار', action: 'تأیید فاکتور', icon: CheckCircle2, color: 'amber', target: 'سیستم' },
      { actor: 'سیستم', action: 'ساخت FixedAsset + سند خودکار', icon: FileText, color: 'emerald' },
    ],
    onApprove: [
      'برای هر قلم isCapital، یک FixedAsset ساخته می‌شود',
      'عمر مفید پیش‌فرض ۱۲۰ ماه — قابل تنظیم روی هر ردیف',
      'حساب‌ها از mapping FIXED_ASSET_ACQUISITION و DEPRECIATION_MONTHLY',
      'کد FA-YYYY-#### تولید می‌شود',
      'سند خرید به حساب دارایی (نه هزینه) بدهکار می‌شود',
    ],
  },
  {
    key: 'failed-forwardings',
    title: 'صندوق خطای ارسال گزارش روزانه',
    description: 'ردیف‌هایی که در forward شدن به واحد مقصد خطا خورده‌اند',
    icon: FileWarning,
    color: 'red',
    route: '/site-ops/failed-forwardings',
    steps: [
      { actor: 'سیستم', action: 'تلاش برای forward ردیف‌ها', icon: Send, color: 'slate', target: 'ثبت نتیجه' },
      { actor: 'سیستم', action: 'ثبت FAILED + پیام خطا', icon: XCircle, color: 'red', target: 'صندوق خطا' },
      { actor: 'کاربر', action: 'کلیک Retry در صندوق خطا', icon: CheckCircle2, color: 'emerald', target: 'تلاش مجدد' },
    ],
    onApprove: [
      'Forwarding نهایی به چند جدول: DailyWorkLog، GoodsReceipt، GoodsIssue، EquipmentDailyLog، PurchaseRequest، PettyCashRequest',
      'هر ردیف با کلید یکتا (reportId + sectionType + rowNumber + targetType) ذخیره می‌شود',
      'در صورت موفقیت مجدد، از لیست صندوق خطا حذف می‌شود',
    ],
  },
  {
    key: 'telegram-alerts',
    title: 'هشدار تلگرام در مانیتورینگ',
    description: 'ارسال پیام تلگرام در صورت خطا یا restart سرویس‌ها',
    icon: Send,
    color: 'cyan',
    steps: [
      { actor: 'سیستم', action: 'هر ۵ دقیقه چک HTTP سرویس‌ها', icon: ClipboardList, color: 'slate', target: 'لاگ' },
      { actor: 'سیستم', action: 'در صورت ERROR/WARN/RESTART → تلگرام', icon: Send, color: 'amber' },
    ],
    onApprove: [
      'تنظیمات در E:\\EpsayAccounting\\tools\\telegram.config.json',
      'levels: ERROR, WARN, RESTART',
      'rateLimitSeconds: فاصله حداقل بین پیام‌های هم‌سطح',
      'در هر پیام: نام کامپیوتر + سطح + متن خطا',
    ],
  },
  {
    key: 'custom-units',
    title: 'واحدهای قابل تعریف کاربر',
    description: 'تعریف واحد جدید در Settings و استفاده بلافاصله در همه فرم‌ها',
    icon: Ruler,
    color: 'blue',
    route: '/settings/units',
    steps: [
      { actor: 'مدیر سیستم', action: 'افزودن واحد جدید در تنظیمات', icon: User, color: 'slate', target: 'ذخیره در DB' },
      { actor: 'سیستم', action: 'بارگذاری خودکار در useUnits hook', icon: ClipboardList, color: 'amber' },
      { actor: 'کاربر', action: 'استفاده در فرم کالا/WBS/PR/PO/PI', icon: CheckCircle2, color: 'emerald' },
    ],
    onApprove: [
      'واحدهای سیستمی (NUMBER, KG, TON, M, ...) قابل حذف نیستند — فقط غیرفعال',
      'واحدهای کاربری اگر در اسناد استفاده نشده باشند قابل حذف هستند',
      'کش در useUnits مشترک است — یک بار از API خوانده می‌شود',
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    gradient: 'from-blue-500 to-blue-700' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  gradient: 'from-orange-500 to-orange-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  gradient: 'from-violet-500 to-violet-700' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  gradient: 'from-indigo-500 to-indigo-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   gradient: 'from-amber-500 to-amber-700' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    gradient: 'from-cyan-500 to-cyan-700' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-700',   border: 'border-slate-200',   gradient: 'from-slate-500 to-slate-700' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     gradient: 'from-red-500 to-red-700' },
};

export default function WorkflowsGuidePage() {
  const nav = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand-600" />
            راهنمای گردش کارها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            نقشه کامل گردش همه اسناد در سیستم — از ثبت تا تأیید و اقدام نهایی
          </p>
        </div>
        <PrintButton contentRef={printRef} documentTitle="راهنمای گردش کارها" />
      </div>

      <div ref={printRef} className="space-y-6">
        <PrintHeader title="راهنمای گردش کارها" subtitle="Epsay Accounting — نقشه فرایندها" />

        <div className="card p-5 bg-gradient-to-bl from-blue-50 to-white border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-1">چطور از این راهنما استفاده کنید</h3>
              <p className="text-sm text-blue-700 leading-6">
                برای هر سند، مراحل گردش کار، اقدامات پس از تأیید و اقدامات پس از رد نمایش داده شده است.
                برای رفتن به صفحه هر سند، روی دکمه «مشاهده» کلیک کنید.
                موارد علامت‌گذاری‌شده با ⚠ باگ شناخته‌شده یا نکته مهم است.
              </p>
            </div>
          </div>
        </div>

        {WORKFLOWS.map((wf) => {
          const Icon = wf.icon;
          const colors = COLOR_MAP[wf.color] || COLOR_MAP.slate;
          return (
            <div key={wf.key} className="card overflow-hidden">
              <div className={clsx('p-5 border-b', colors.bg, colors.border)}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br shrink-0', colors.gradient)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={clsx('text-lg font-bold', colors.text)}>{wf.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">{wf.description}</p>
                    </div>
                  </div>
                  {wf.route && (
                    <button
                      onClick={() => nav(wf.route!)}
                      className="btn-secondary text-xs no-print"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      مشاهده
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">مراحل گردش کار</h3>
                <div className="space-y-2">
                  {wf.steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const stepColors = COLOR_MAP[step.color] || COLOR_MAP.slate;
                    return (
                      <div key={idx}>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center shrink-0">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center num">
                              {idx + 1}
                            </span>
                          </div>
                          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stepColors.bg)}>
                            <StepIcon className={clsx('w-4 h-4', stepColors.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-700">{step.actor}:</span>
                              <span className="text-sm text-slate-800">{step.action}</span>
                            </div>
                            {step.target && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                <ArrowLeft className="w-3 h-3 inline text-slate-400" /> {step.target}
                              </div>
                            )}
                          </div>
                        </div>
                        {idx < wf.steps.length - 1 && (
                          <div className="flex items-center ms-3 my-1">
                            <ArrowDown className="w-3 h-3 text-slate-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t">
                  {wf.onApprove && wf.onApprove.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">نکات و پس از تأیید</span>
                      </div>
                      <ul className="space-y-1">
                        {wf.onApprove.map((item, i) => (
                          <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wf.onReject && wf.onReject.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-800">محدودیت‌ها و پس از رد</span>
                      </div>
                      <ul className="space-y-1">
                        {wf.onReject.map((item, i) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                            <span className="text-red-500 mt-0.5">▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="card p-4 bg-slate-50 text-center">
          <p className="text-xs text-slate-500">
            این راهنما برای درک بهتر گردش کارهای سیستم ساخته شده است.
            موارد ⚠ باگ‌های شناخته‌شده‌ای هستند که در جلسه ۴ کشف شدند.
          </p>
        </div>
      </div>
    </div>
  );
}
