import React, { useState } from 'react';

export interface SCurveDataPoint {
  period: string; // مثال: 'فروردین', 'اردیبهشت', ...
  plannedPct: number; // پیشرفت برنامه‌ای (۰ تا ۱۰۰)
  actualPhysicalPct: number; // پیشرفت فیزیکی واقعی (۰ تا ۱۰۰)
  financialPct: number; // پیشرفت مالی/ریالی (۰ تا ۱۰۰)
}

interface SCurveChartProps {
  title?: string;
  data: SCurveDataPoint[];
}

export const SCurveChart: React.FC<SCurveChartProps> = ({
  title = 'نمودار S-Curve پیشرفت فیزیکی و مالی پروژه',
  data,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<SCurveDataPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300" dir="rtl">
        داده‌ای برای نمایش نمودار S-Curve وجود ندارد.
      </div>
    );
  }

  const svgWidth = 700;
  const svgHeight = 320;
  const padding = 40;

  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  // تبدیل درصد (۰-۱۰۰) به مختصات Y
  const getY = (val: number) => svgHeight - padding - (Math.min(100, Math.max(0, val)) / 100) * chartHeight;

  // تبدیل ایندکس به مختصات X
  const getX = (index: number) => {
    if (data.length === 1) return padding + chartWidth / 2;
    return padding + (index / (data.length - 1)) * chartWidth;
  };

  // ساخت مسیر منحنی SVG
  const generatePath = (key: keyof SCurveDataPoint) => {
    return data.reduce((acc, point, idx) => {
      const x = getX(idx);
      const y = getY(Number(point[key]) || 0);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-black" dir="rtl">
      <div className="flex items-center justify-between mb-4 border-b pb-3">
        <h3 className="font-bold text-slate-800 text-sm print:text-black">{title}</h3>
        {hoveredPoint && (
          <div className="text-xs bg-slate-100 px-3 py-1 rounded border text-slate-700 flex gap-3 dir-rtl">
            <span><strong>دوره:</strong> {hoveredPoint.period}</span>
            <span className="text-blue-600">برنامه‌ای: {hoveredPoint.plannedPct}٪</span>
            <span className="text-emerald-600">فیزیکی: {hoveredPoint.actualPhysicalPct}٪</span>
            <span className="text-amber-600">مالی: {hoveredPoint.financialPct}٪</span>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
          {/* خطوط شبکه (Grid Lines) */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = getY(pct);
            return (
              <g key={`grid-${pct}`}>
                <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={padding - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {pct}٪
                </text>
              </g>
            );
          })}

          {/* خط پیشرفت برنامه‌ای (آبی خط‌چین) */}
          <path d={generatePath('plannedPct')} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="5 5" />

          {/* خط پیشرفت فیزیکی واقعی (سبز پررنگ) */}
          <path d={generatePath('actualPhysicalPct')} fill="none" stroke="#059669" strokeWidth="3" />

          {/* خط پیشرفت مالی/ریالی (نارنجی/طلایی) */}
          <path d={generatePath('financialPct')} fill="none" stroke="#d97706" strokeWidth="2.5" />

          {/* نقاط تعاملی روی نمودار */}
          {data.map((pt, idx) => {
            const x = getX(idx);
            return (
              <g
                key={`pt-group-${idx}`}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle cx={x} cy={getY(pt.plannedPct)} r="4" fill="#2563eb" />
                <circle cx={x} cy={getY(pt.actualPhysicalPct)} r="4" fill="#059669" />
                <circle cx={x} cy={getY(pt.financialPct)} r="4" fill="#d97706" />

                {/* لیبل محور افقی (زمان/دوره) */}
                <text x={x} y={svgHeight - 12} textAnchor="middle" fontSize="11" fill="#475569" fontWeight="500">
                  {pt.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* راهنمای نمودار (Legend) */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t text-xs font-medium text-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 bg-blue-600 border-b-2 border-dashed border-blue-600"></span>
          <span>پیشرفت برنامه‌ای</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 bg-emerald-600 rounded"></span>
          <span>پیشرفت فیزیکی واقعی (WBS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 bg-amber-600 rounded"></span>
          <span>پیشرفت ریالی / مالی</span>
        </div>
      </div>
    </div>
  );
};