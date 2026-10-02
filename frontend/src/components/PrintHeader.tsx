import { formatJalaliToday } from '@/utils/format';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
}

/**
 * سرصفحه چاپ - فقط در حالت print نمایش داده می‌شود
 *
 * چیدمان:
 *   [راست: لوگو + حسابداری اپسای / استودیو معماری اپسای]   [چپ: تاریخ چاپ]
 *   ─────────────────────────────────────────────────
 *                    [عنوان گزارش]
 *                    [زیرعنوان]
 */
export default function PrintHeader({ title, subtitle, meta }: PrintHeaderProps) {
  const today = formatJalaliToday();

  return (
    <div className="print-only">
      <div className="print-header">
        {/* ردیف اول: نام شرکت (راست) + تاریخ (چپ) */}
        <div className="print-header-top">
          <div className="print-header-brand">
            <img
              src="/images/logo.png"
              alt="استودیو معماری اپسای"
              className="print-header-logo"
            />
            <div className="print-header-brand-text">
              <div className="print-header-brand-name">حسابداری اپسای</div>
              <div className="print-header-brand-sub">استودیو معماری اپسای</div>
            </div>
          </div>

          <div className="print-header-date">
            <div className="print-header-date-label">تاریخ چاپ</div>
            <div className="print-header-date-value">{today}</div>
          </div>
        </div>

        {/* خط جداکننده */}
        <div className="print-header-divider"></div>

        {/* عنوان گزارش (وسط‌چین) */}
        <div className="print-header-title">
          <h1>{title}</h1>
          {subtitle && <p className="print-header-subtitle">{subtitle}</p>}
          {meta && <p className="print-header-meta">{meta}</p>}
        </div>
      </div>
    </div>
  );
}
