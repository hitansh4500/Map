import React, { useState } from 'react';
import { Gauge, Radio, Settings2, Check } from 'lucide-react';

interface SpeedometerWidgetProps {
  speedKmh: number;
  isDarkMode: boolean;
  accuracyMeters?: number;
  isLiveGps?: boolean;
  onSetUserSpeed?: (speed: number) => void;
  manualSpeedOverride?: number | null;
  className?: string;
}

export const SpeedometerWidget: React.FC<SpeedometerWidgetProps> = ({
  speedKmh,
  isDarkMode,
  accuracyMeters,
  isLiveGps = true,
  onSetUserSpeed,
  manualSpeedOverride = null,
  className = '',
}) => {
  const [showSpeedControls, setShowSpeedControls] = useState(false);

  // Clamp speed to non-negative rounded integer
  const effectiveSpeed = manualSpeedOverride !== null ? manualSpeedOverride : Math.max(0, Math.round(speedKmh));

  // Visual arc calculation (0 to 140 km/h mapped to 0 to 100%)
  const percentage = Math.min(100, Math.round((effectiveSpeed / 120) * 100));
  const circumference = 2 * Math.PI * 24; // r = 24
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative flex flex-col gap-1.5 select-none pointer-events-auto ${className}`}>
      {/* Speedometer Card */}
      <div
        className={`flex items-center gap-3 p-2.5 px-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-700/80 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-neutral-300 text-neutral-900 shadow-neutral-500/20'
        }`}
      >
        {/* Speed Dial SVG Ring */}
        <div className="relative w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
          <svg className="w-13 h-13 sm:w-14 sm:h-14 -rotate-90 transform" viewBox="0 0 56 56">
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
                effectiveSpeed > 80
                  ? 'stroke-amber-400'
                  : effectiveSpeed > 0
                  ? 'stroke-emerald-400'
                  : 'stroke-neutral-500'
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
              className={`text-lg sm:text-xl font-extrabold font-mono tracking-tight leading-none ${
                effectiveSpeed > 0 ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            >
              {effectiveSpeed}
            </span>
          </div>
        </div>

        {/* Speed Unit & Live GPS Status */}
        <div className="flex flex-col min-w-[70px]">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider font-mono">
              km/h
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                manualSpeedOverride !== null
                  ? 'bg-amber-400'
                  : isLiveGps
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-neutral-500'
              }`}
              title={manualSpeedOverride !== null ? 'Manual speed set' : 'Live GPS active'}
            />
          </div>

          <span className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1 mt-0.5">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            {manualSpeedOverride !== null ? 'User Set Speed' : effectiveSpeed === 0 ? 'Live (0 km/h)' : 'Live GPS Speed'}
          </span>

          {accuracyMeters && accuracyMeters > 0 && manualSpeedOverride === null && (
            <span className="text-[9px] text-neutral-400 mt-0.5 font-mono">
              ±{Math.round(accuracyMeters)}m GPS
            </span>
          )}
        </div>

        {/* Quick Speed Adjust Button (Allows user to calibrate or set speed) */}
        {onSetUserSpeed && (
          <button
            onClick={() => setShowSpeedControls(!showSpeedControls)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ml-1 ${
              showSpeedControls
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isDarkMode
                ? 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border-neutral-300'
            }`}
            title="Set custom user speed"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Speed Presets Modal / Popover if user wants to set a specific cruising speed */}
      {showSpeedControls && onSetUserSpeed && (
        <div
          className={`p-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex flex-col gap-2 transition-all ${
            isDarkMode
              ? 'bg-neutral-900/95 border-neutral-700 text-white shadow-black/90'
              : 'bg-white/95 border-neutral-300 text-neutral-900 shadow-neutral-400/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold pb-1 border-b border-neutral-700/30">
            <span>Set Driving Speed</span>
            <button
              onClick={() => setShowSpeedControls(false)}
              className="text-[10px] text-neutral-400 hover:text-neutral-200"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'GPS Live', val: null },
              { label: '20', val: 20 },
              { label: '40', val: 40 },
              { label: '60', val: 60 },
            ].map((opt) => {
              const isSelected = manualSpeedOverride === opt.val;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    onSetUserSpeed(opt.val as any);
                  }}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.val !== null && <span className="text-[9px] font-normal opacity-75">km/h</span>}
                </button>
              );
            })}
          </div>

          {/* Slider for precision speed setting */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-neutral-400">0</span>
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={effectiveSpeed}
              onChange={(e) => onSetUserSpeed(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-[10px] font-mono text-neutral-400">120</span>
          </div>
        </div>
      )}
    </div>
  );
};
