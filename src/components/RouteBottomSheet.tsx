import React, { useState } from 'react';
import { ArrowRight, TrendingUp, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { RouteOption } from '../types';

interface RouteBottomSheetProps {
  routes: RouteOption[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  onStartNavigation: () => void;
  isCalculating: boolean;
  isDarkMode: boolean;
}

export const RouteBottomSheet: React.FC<RouteBottomSheetProps> = ({
  routes,
  selectedRouteIndex,
  onSelectRouteIndex,
  onStartNavigation,
  isCalculating,
  isDarkMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isCalculating) {
    return (
      <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-none z-30">
        <div
          className={`p-4 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl border flex items-center justify-center gap-3 text-xs sm:text-sm font-medium pointer-events-auto ${
            isDarkMode
              ? 'bg-neutral-900/95 border-neutral-800 text-neutral-200 shadow-black/80'
              : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-400/30'
          }`}
        >
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Calculating optimal route with live road traffic...</span>
        </div>
      </div>
    );
  }

  if (!routes || routes.length === 0) return null;

  const activeRoute = routes[selectedRouteIndex] || routes[0];
  const trafficDelayMins = Math.max(
    0,
    Math.round((activeRoute.durationWithTrafficSeconds - activeRoute.durationSeconds) / 60)
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-none select-none z-30">
      <div
        className={`rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl border p-3.5 sm:p-4 transition-all duration-300 pointer-events-auto ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
        }`}
      >
        {/* Header row with minimize toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-700/20">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatDuration(activeRoute.durationWithTrafficSeconds)}
            </span>
            <span className="text-xs sm:text-sm opacity-75 font-medium">
              ({formatDistance(activeRoute.distanceMeters)})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
                  : 'bg-neutral-100 text-neutral-600 hover:text-black border-neutral-300'
              }`}
              title={isMinimized ? 'Expand route details' : 'Minimize card'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Route Details & Traffic summary */}
        {!isMinimized && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 truncate">
                {activeRoute.summary || 'Fastest Route'}
              </span>

              {trafficDelayMins > 0 ? (
                <span className="text-amber-400 flex items-center gap-1 font-medium shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />+{trafficDelayMins} min traffic
                </span>
              ) : (
                <span className="text-emerald-400 font-medium shrink-0">Normal traffic</span>
              )}
            </div>

            {/* Alternatives pill selector if more than 1 route exists */}
            {routes.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
                {routes.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRouteIndex(idx)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                      idx === selectedRouteIndex
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : isDarkMode
                        ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    Route {idx + 1} ({formatDuration(r.durationWithTrafficSeconds)})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start Navigation CTA */}
        <button
          onClick={onStartNavigation}
          className="w-full mt-2.5 py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-white/20" />
          <span>Start Navigation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
