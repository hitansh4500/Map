import React from 'react';
import { Activity, Eye, EyeOff } from 'lucide-react';

interface TrafficLegendProps {
  isTrafficEnabled: boolean;
  onToggleTraffic: () => void;
  isDarkMode: boolean;
  activeRouteDelayMinutes?: number;
}

export const TrafficLegend: React.FC<TrafficLegendProps> = ({
  isTrafficEnabled,
  onToggleTraffic,
  isDarkMode,
  activeRouteDelayMinutes = 0,
}) => {
  return (
    <div
      className={`rounded-2xl shadow-xl backdrop-blur-md border transition-all duration-300 p-3 text-xs ${
        isDarkMode
          ? 'bg-neutral-900/90 border-neutral-800/80 text-neutral-200 shadow-black/50'
          : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-400/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <button
          onClick={onToggleTraffic}
          className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-lg transition-colors text-xs ${
            isTrafficEnabled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : isDarkMode
              ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700'
          }`}
          title="Toggle real-time traffic overlay"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Real-time Traffic</span>
          {isTrafficEnabled ? (
            <Eye className="w-3 h-3 ml-0.5" />
          ) : (
            <EyeOff className="w-3 h-3 ml-0.5" />
          )}
        </button>

        {isTrafficEnabled && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Traffic condition color indicators */}
      <div className="flex items-center gap-3 pt-1 border-t border-neutral-700/30 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] opacity-80">Light</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <span className="text-[10px] opacity-80">Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span className="text-[10px] opacity-80">Heavy</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-full bg-rose-800 shadow-[0_0_8px_rgba(159,18,57,0.6)]" />
          <span className="text-[10px] opacity-80">Severe</span>
        </div>
      </div>

      {activeRouteDelayMinutes > 0 && (
        <div className="mt-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center justify-between">
          <span>Route Traffic Impact:</span>
          <span className="font-semibold">+{activeRouteDelayMinutes} min delay</span>
        </div>
      )}
    </div>
  );
};
