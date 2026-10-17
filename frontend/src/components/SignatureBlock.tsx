import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export interface SignatureSlot {
  /** عنوان ستون — مثلاً «تهیه‌کننده»، «نماینده کارفرما» */
  title: string;
  /** نوع — امضای کاربر جاری / مهر شرکت / خالی */
  type: 'current-user' | 'company-stamp' | 'empty';
  /** متن پایین جای امضا (پیش‌فرض: «نام و امضا») */
  caption?: string;
}

interface Props {
  /** آرایه‌ی اسلات‌های امضا */
  slots: SignatureSlot[];
  /** فاصله‌ی بالا (پیش‌فرض 40px) */
  marginTop?: number;
  /** ارتفاع هر جای امضا (پیش‌فرض 50px) */
  signatureHeight?: number;
  /** اندازه‌ی فونت (پیش‌فرض text-xs) */
  className?: string;
}

/**
 * بلوک امضا — قابل استفاده در همه‌ی صفحات چاپی
 *
 * نمونه:
 *   <SignatureBlock slots={[
 *     { title: 'تهیه‌کننده', type: 'current-user' },
 *     { title: 'مهر شرکت', type: 'company-stamp', caption: 'مهر پیمانکار' },
 *     { title: 'نماینده کارفرما', type: 'empty' },
 *   ]} />
 */
export default function SignatureBlock({
  slots,
  marginTop = 40,
  signatureHeight = 50,
  className = 'text-xs',
}: Props) {
  const [userSignature, setUserSignature] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string>('');
  const [companyStamp, setCompanyStamp] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const needUser = slots.some((s) => s.type === 'current-user');
    const needCompany = slots.some((s) => s.type === 'company-stamp');
    if (!needUser && !needCompany) {
      setLoaded(true);
      return;
    }

    (async () => {
      if (needUser) {
        try {
          const { data } = await api.get('/auth/me');
          setUserSignature(data.signatureUrl || null);
          setUserFullName(data.fullName || '');
        } catch { /* silent */ }
      }
      if (needCompany) {
        try {
          const { data } = await api.get('/company-profile');
          setCompanyStamp(data.stampUrl || null);
        } catch { /* silent */ }
      }
      setLoaded(true);
    })();
  }, []);

  const cols = slots.length;
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: '12px',
    marginTop: `${marginTop}px`,
  };

  return (
    <div className={className} style={gridStyle}>
      {slots.map((slot, i) => {
        const imgSrc =
          slot.type === 'current-user' ? userSignature :
          slot.type === 'company-stamp' ? companyStamp :
          null;
        const caption = slot.caption || 'نام و امضا';
        const finalCaption =
          slot.type === 'current-user' && userFullName ? userFullName : caption;

        return (
          <div key={i} className="text-center">
            <div className="font-bold mb-2">{slot.title}</div>
            <div style={{ height: signatureHeight, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {loaded && imgSrc ? (
                <img
                  src={imgSrc}
                  alt={slot.title}
                  style={{ maxHeight: signatureHeight, maxWidth: '100%', objectFit: 'contain' }}
                />
              ) : null}
            </div>
            <div className="border-t border-slate-400 pt-1">{finalCaption}</div>
          </div>
        );
      })}
    </div>
  );
}
