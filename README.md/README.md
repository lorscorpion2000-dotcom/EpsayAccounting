# 🏛️ Epsay Accounting

<div align="center">

![CI](https://github.com/lorscorpion2000-dotcom/EpsayAccounting/actions/workflows/ci.yml/badge.svg)

**سیستم جامع حسابداری استودیو معماری اپسای**

Progressive Web App | React + Vite | NestJS + Prisma | PostgreSQL

</div>

---

## ✨ ویژگی‌ها

- 📊 **حسابداری دوطرفه** — دفتر روزنامه، دفتر کل، تراز آزمایشی
- 💰 **مدیریت دارایی‌ها** — تنخواه، اموال، سرمایه شرکا
- 📁 **مدیریت پروژه‌ها** — WBS، بودجه، قرارداد، صورت‌وضعیت
- 🛒 **خرید و انبار** — درخواست خرید، RFQ، سفارش، رسید، حواله، کاردکس
- 👥 **منابع انسانی** — کارکنان، حضور و غیاب، حقوق و دستمزد، مرخصی
- 📈 **گزارشات** — ترازنامه، سود و زیان، سنی حساب‌ها، جریان نقدی
- 🔐 **امنیت** — JWT، RBAC، مجوزهای دقیق کاربری
- 📱 **PWA** — نصب روی موبایل/دسکتاپ، کار آفلاین

## 🛠️ تکنولوژی‌ها

### Frontend
| پکیج | کاربرد |
|------|--------|
| React 18 + TypeScript | UI |
| Vite | Build tool + Dev server |
| TailwindCSS | Styling |
| React Router | Routing |
| Zustand | State management |
| React Hook Form + Zod | فرم و اعتبارسنجی |
| Vite PWA Plugin | Service Worker + Manifest |
| Recharts | نمودار |
| Lucide React | آیکون‌ها |

### Backend
| پکیج | کاربرد |
|------|--------|
| NestJS | Framework |
| Prisma | ORM |
| PostgreSQL | دیتابیس |
| JWT + Passport | احراز هویت |
| Swagger | مستندات API |
| Class Validator | اعتبارسنجی |

## 📁 ساختار پروژه

EpsayAccounting/
├── .github/workflows/ # CI/CD pipelines
├── backend/ # NestJS API
│ ├── src/ # کد اصلی
│ ├── prisma/ # schema دیتابیس
│ └── uploads/ # فایل‌های آپلودی کاربر (gitignore)
├── frontend/ # React PWA
│ ├── src/ # کد اصلی
│ ├── public/ # فایل‌های استاتیک + آیکون‌های PWA
│ └── dist/ # build output (gitignore)
└── scripts/ # ابزارهای کمکی

## 🚀 راه‌اندازی

### پیش‌نیازها

- **Node.js** 20 یا بالاتر
- **PostgreSQL** 14 یا بالاتر
- **npm** یا **pnpm**

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
Backend: http://localhost:3000/api

Swagger Docs: http://localhost:3000/api/docs
cd frontend
npm install
npm run dev

Frontend: http://localhost:5173
