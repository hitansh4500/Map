import React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Navigation,
} from 'lucide-react';
import { RouteOption, TrafficSeverity } from '../types';

interface NavigationBottomBarProps {
  activeRoute: RouteOption;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onExitNavigation: () => void;
  onRecenter: () => void;
  isDarkMode: boolean;
  stepIndex: number;
  totalSteps: number;
}

export const NavigationBottomBar: React.FC<NavigationBottomBarProps> = ({
  activeRoute,
  remainingDistanceMeters,
  remainingDurationSeconds,
  onNextStep,
  onPrevStep,
  onExitNavigation,
  onRecenter,
  isDarkMode,
  stepIndex,
  totalSteps,
}) => {
  // Format remaining time
  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Calculate ETA clock time
  const getEtaClock = (durationSecs: number) => {
    const arrivalDate = new Date(Date.now() + Math.max(0, durationSecs) * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Traffic severity badge styling
  const getTrafficBadge = (severity: TrafficSeverity) => {
    switch (severity) {
      case 'severe':
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          dot: 'bg-rose-500 animate-pulse',
          label: 'Heavy Delay',
        };
      case 'heavy':
        return {
          bg: 'bg-red-500/20 border-red-500/40 text-red-400',
          dot: 'bg-red-500 animate-pulse',
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
          label: activeRoute.isShortest ? 'Shortest Road Route' : 'Fastest Route',
        };
    }
  };

  const trafficBadge = getTrafficBadge(activeRoute.trafficSeverity);
  const etaTime = getEtaClock(remainingDurationSeconds);

  return (
    <div className="w-full max-w-xl mx-auto px-3 pb-3 sm:pb-4 pointer-events-auto select-none">
      <div
        className={`rounded-2xl shadow-2xl backdrop-blur-xl border p-3.5 sm:p-4 transition-all duration-300 ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
        }`}
      >
        {/* Main Stats Row: ETA, Remaining Distance, Traffic status */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-700/20">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-400 font-mono">
                {formatDuration(remainingDurationSeconds)}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${trafficBadge.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${trafficBadge.dot}`} />
                {trafficBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-75 mt-0.5">
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-emerald-400 rotate-45" />
                {formatDistance(remainingDistanceMeters)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                ETA {etaTime}
              </span>
            </div>
          </div>

          {/* Exit navigation button */}
          <button
            onClick={onExitNavigation}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all shrink-0 cursor-pointer"
            title="Exit navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Driver Controls: Re-center & Step Turn Navigation (Simulate Drive and Test Reroute removed) */}
        <div className="flex items-center justify-between pt-3 gap-2">
          {/* Re-center Map on user GPS position */}
          <button
            onClick={onRecenter}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border-neutral-700'
                : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-neutral-300'
            }`}
            title="Re-center on user GPS location"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Re-center GPS</span>
          </button>

          {/* Turn-by-Turn Step Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevStep}
              disabled={stepIndex <= 0}
              className={`p-2 rounded-xl transition-all border disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
              }`}
              title="Previous turn step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-medium px-2 opacity-80">
              {stepIndex + 1}/{totalSteps}
            </span>

            <button
              onClick={onNextStep}
              disabled={stepIndex >= totalSteps - 1}
              className={`p-2 rounded-xl transition-all border disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
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
