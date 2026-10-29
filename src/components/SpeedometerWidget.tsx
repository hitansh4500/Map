import React from 'react';
import { Gauge } from 'lucide-react';

interface SpeedometerWidgetProps {
  speedKmh: number;
  isDarkMode: boolean;
  speedLimit?: number;
  className?: string;
}

export const SpeedometerWidget: React.FC<SpeedometerWidgetProps> = ({
  speedKmh,
  isDarkMode,
  speedLimit = 60,
  className = '',
}) => {
  // Clamp speed for visual progress
  const displaySpeed = Math.max(0, Math.round(speedKmh));
  const isOverSpeed = speedLimit > 0 && displaySpeed > speedLimit;

  // Arc calculation (0 to 140 km/h mapped to 0 to 100%)
  const percentage = Math.min(100, Math.round((displaySpeed / 120) * 100));
  const circumference = 2 * Math.PI * 24; // r = 24
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`relative flex items-center gap-2.5 p-2 px-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all select-none pointer-events-auto ${
        isOverSpeed
          ? 'bg-rose-950/90 border-rose-500/60 shadow-rose-900/30 text-rose-100'
          : isDarkMode
          ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
          : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
      } ${className}`}
    >
      {/* Speed Dial SVG Ring */}
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 56 56">
          {/* Background Track */}
          <circle
            cx="28"
            cy="28"
            r="24"
            className={isDarkMode ? 'stroke-neutral-800' : 'stroke-neutral-200'}
            strokeWidth="4"
            fill="transparent"
          />
          {/* Active Speed Progress Arc */}
          <circle
            cx="28"
            cy="28"
            r="24"
            className={`transition-all duration-300 ease-out ${
              isOverSpeed
                ? 'stroke-rose-500'
                : displaySpeed > 40
                ? 'stroke-emerald-400'
                : 'stroke-blue-400'
            }`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Speed Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-base font-extrabold font-mono tracking-tight leading-none ${
              isOverSpeed ? 'text-rose-400' : displaySpeed > 0 ? 'text-emerald-400' : 'opacity-80'
            }`}
          >
            {displaySpeed}
          </span>
        </div>
      </div>

      {/* Speed Labels & GPS Live indicator */}
      <div className="flex flex-col min-w-[50px]">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-90 font-mono">
            km/h
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              displaySpeed > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
            }`}
          />
        </div>
        <span className="text-[10px] opacity-60 font-medium">
          {displaySpeed === 0 ? 'Stationary' : isOverSpeed ? 'Over limit' : 'Cruising'}
        </span>
      </div>

      {/* Speed limit sign (Google Maps style circle with red border) */}
      {speedLimit > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-rose-500 bg-white text-neutral-900 flex flex-col items-center justify-center shrink-0 shadow-sm">
          <span className="text-[10px] font-extrabold font-mono leading-none">{speedLimit}</span>
        </div>
      )}
    </div>
  );
};
