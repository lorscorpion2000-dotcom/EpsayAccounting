// F13: resolve partner-specific DETAIL accounts (per-partner payable/employee)
// و resolve پیش‌فرض برای حساب‌های عمومی (VAT, Insurance, Retainage)
import { AccountLevel, AccountNature, AccountDetailType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PartnerNature = 'DEBIT' | 'CREDIT';
export type PartnerDetailType = 'SUPPLIER' | 'CUSTOMER' | 'EMPLOYEE' | 'CONTRACTOR';

/**
 * پیدا/ساخت حساب تفصیلی به ازای یک partner (پیمانکار/پرسنل/تأمین‌کننده).
 * اگر نبود، با کد بعدی زیر همان حساب معین ساخته می‌شود.
 */
export async function resolvePartnerDetailAccount(
  prisma: PrismaService,
  parentCode: string,
  partnerId: string,
  nature: PartnerNature,
  detailType: PartnerDetailType,
) {
  const parent = await prisma.account.findUnique({ where: { code: parentCode } });
  if (!parent) throw new Error('حساب معین ' + parentCode + ' پیدا نشد');

  // ۱) detail موجود برای این partner؟
  const existing = await prisma.account.findFirst({
    where: { parentId: parent.id, detailId: partnerId, isActive: true, isPostable: true },
  });
  if (existing) return existing;

  // ۲) partner پیدا شود
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('طرف حساب ' + partnerId + ' پیدا نشد');

  // ۳) کد بعدی
  const siblings = await prisma.account.findMany({
    where: { parentId: parent.id },
    select: { code: true },
  });
  let maxLast = 0;
  for (const s of siblings) {
    const parts = s.code.split('.');
    const n = parseInt(parts[parts.length - 1], 10) || 0;
    if (n > maxLast) maxLast = n;
  }
  const nextCode = parentCode + '.' + String(maxLast + 1).padStart(2, '0');

  const detail = await prisma.account.create({
    data: {
      code: nextCode,
      name: partner.name,
      level: AccountLevel.DETAIL,
      nature: nature as AccountNature,
      parentId: parent.id,
      isPostable: true,
      isActive: true,
      detailType: detailType as AccountDetailType,
      detailId: partner.id,
    },
  });
  if (parent.isPostable) {
    await prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
  }
  return detail;
}

/**
 * resolve حساب تفصیلی پیش‌فرض (مثلاً .01) زیر یک حساب معین.
 */
export async function resolveDefaultDetailAccount(prisma: PrismaService, parentCode: string) {
  const preferred = await prisma.account.findFirst({
    where: { code: parentCode + '.01', isActive: true, isPostable: true },
  });
  if (preferred) return preferred;

  const parent = await prisma.account.findUnique({ where: { code: parentCode } });
  if (!parent) throw new Error('حساب معین ' + parentCode + ' پیدا نشد');

  const child = await prisma.account.findFirst({
    where: { parentId: parent.id, isActive: true, isPostable: true },
    orderBy: { code: 'asc' },
  });
  if (!child) throw new Error('حساب تفصیلی postable برای ' + parentCode + ' پیدا نشد');
  return child;
}
