import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = 30,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-xl overflow-hidden shadow-sm flex items-center justify-center select-none flex-shrink-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50/80 border border-indigo-100/90 ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1.5"
      >
        {/* 外层经纬度微光环 */}
        <circle
          cx="16"
          cy="16"
          r="9.5"
          stroke="#4f46e5"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* 经纬度立体纵向弧线 */}
        <ellipse
          cx="16"
          cy="16"
          rx="5"
          ry="9.5"
          stroke="#6366f1"
          strokeWidth="1.0"
          strokeOpacity="0.5"
        />

        {/* 赤道横向基准线 */}
        <line
          x1="6.5"
          y1="16"
          x2="25.5"
          y2="16"
          stroke="#4f46e5"
          strokeWidth="0.9"
          strokeOpacity="0.4"
        />

        {/* 中层亮天青雷达扫描环 */}
        <circle
          cx="16"
          cy="16"
          r="6.5"
          stroke="#0284c7"
          strokeWidth="1.4"
          strokeOpacity="0.8"
        />

        {/* 四向瞄准刻度准星 (精致深靛蓝刻度) */}
        <line x1="16" y1="4" x2="16" y2="7" stroke="#4338ca" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="16" y1="25" x2="16" y2="28" stroke="#4338ca" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="4" y1="16" x2="7" y2="16" stroke="#4338ca" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="25" y1="16" x2="28" y2="16" stroke="#4338ca" strokeWidth="1.3" strokeLinecap="round" />

        {/* 中心聚焦菱形瞄准核 */}
        <polygon
          points="16,12.5 19.5,16 16,19.5 12.5,16"
          fill="#4f46e5"
          stroke="#312e81"
          strokeWidth="0.8"
        />

        {/* 核心聚焦点 */}
        <circle cx="16" cy="16" r="1.4" fill="#ffffff" />
      </svg>
    </div>
  );
};
