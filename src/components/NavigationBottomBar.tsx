import React from 'react';
import {
  X,
  Play,
  Pause,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
} from 'lucide-react';
import { RouteOption, TrafficSeverity } from '../types';

interface NavigationBottomBarProps {
  activeRoute: RouteOption;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  onSimulateOffRoute: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onExitNavigation: () => void;
  onRecenter: () => void;
  isDarkMode: boolean;
  stepIndex: number;
}

export const NavigationBottomBar: React.FC<NavigationBottomBarProps> = ({
  activeRoute,
  isSimulating,
  onToggleSimulate,
  onSimulateOffRoute,
  onNextStep,
  onPrevStep,
  onExitNavigation,
  onRecenter,
  isDarkMode,
  stepIndex,
}) => {
  // Format remaining time
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Calculate ETA clock time
  const getEtaClock = (durationSecs: number) => {
    const arrivalDate = new Date(Date.now() + durationSecs * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Traffic severity badge styling
  const getTrafficBadge = (severity: TrafficSeverity) => {
    switch (severity) {
      case 'severe':
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          dot: 'bg-rose-500',
          label: 'Heavy Delay',
        };
      case 'heavy':
        return {
          bg: 'bg-red-500/20 border-red-500/40 text-red-400',
          dot: 'bg-red-500',
          label: 'Slow Traffic',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
          dot: 'bg-amber-500',
          label: 'Moderate Traffic',
        };
      case 'light':
      default:
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'Fastest Route',
        };
    }
  };

  const trafficBadge = getTrafficBadge(activeRoute.trafficSeverity);
  const etaTime = getEtaClock(activeRoute.durationWithTrafficSeconds);

  return (
    <div className="w-full max-w-xl mx-auto px-3 pb-4 pointer-events-auto select-none">
      <div
        className={`rounded-2xl shadow-2xl backdrop-blur-xl border p-4 transition-all duration-300 ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
        }`}
      >
        {/* Main Stats Row: ETA, Distance, Arrival Time */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-700/20">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-400 font-mono">
                {formatDuration(activeRoute.durationWithTrafficSeconds)}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${trafficBadge.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${trafficBadge.dot}`} />
                {trafficBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-75 mt-0.5">
              <span>{formatDistance(activeRoute.distanceMeters)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA {etaTime}
              </span>
            </div>
          </div>

          {/* Exit navigation button */}
          <button
            onClick={onExitNavigation}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all shrink-0"
            title="Exit navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls row: Simulation, Step prev/next, Off-route test */}
        <div className="flex items-center justify-between pt-3 gap-2">
          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulate}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 font-medium text-xs transition-all ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-4 h-4 fill-amber-300" />
                <span>Pause Drive</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-emerald-300" />
                <span>Simulate Drive</span>
              </>
            )}
          </button>

          {/* Test Off-Route Recalculation Button */}
          <button
            onClick={onSimulateOffRoute}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-medium text-xs transition-all border ${
              isDarkMode
                ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700/60'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
            }`}
            title="Simulate deviation from route to trigger auto-recalculation"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Test Reroute</span>
          </button>

          {/* Re-center Map on user */}
          <button
            onClick={onRecenter}
            className={`p-2 rounded-xl transition-all border ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
            }`}
            title="Re-center on vehicle"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Manual Step Forward/Back */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevStep}
              disabled={stepIndex <= 0}
              className={`p-2 rounded-xl transition-all border disabled:opacity-30 disabled:pointer-events-none ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
              }`}
              title="Previous turn step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextStep}
              disabled={stepIndex >= activeRoute.steps.length - 1}
              className={`p-2 rounded-xl transition-all border disabled:opacity-30 disabled:pointer-events-none ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
              }`}
              title="Next turn step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
