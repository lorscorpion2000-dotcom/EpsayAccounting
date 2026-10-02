interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * لوگوی استودیو معماری اپسای
 */
export default function Logo({ size = 40, className = '', showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/images/logo.png"
        alt="استودیو معماری اپسای"
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
      />
      {showText && (
        <div className="leading-tight">
          <div className="font-bold text-slate-800">حسابداری اپسای</div>
          <div className="text-xs text-slate-500">Epsay Accounting</div>
        </div>
      )}
    </div>
  );
}
