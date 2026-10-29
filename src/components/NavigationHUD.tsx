import React from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  GitFork,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  AlertTriangle,
  RotateCw,
  Clock,
  Navigation,
} from 'lucide-react';
import { NavigationStep, TrafficSeverity } from '../types';

interface NavigationHUDProps {
  currentStep: NavigationStep | null;
  nextStep: NavigationStep | null;
  stepIndex: number;
  totalSteps: number;
  isRerouting: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onRepeatVoice: () => void;
  isDarkMode: boolean;
  speedKmh?: number;
  remainingDistanceMeters?: number;
  remainingDurationSeconds?: number;
  trafficSeverity?: TrafficSeverity;
  trafficDelayMinutes?: number;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  currentStep,
  nextStep,
  stepIndex,
  totalSteps,
  isRerouting,
  isMuted,
  onToggleMute,
  onRepeatVoice,
  isDarkMode,
  speedKmh = 0,
  remainingDistanceMeters = 0,
  remainingDurationSeconds = 0,
  trafficSeverity = 'light',
  trafficDelayMinutes = 0,
}) => {
  // Helper to render maneuver icon based on instruction or maneuver string
  const renderManeuverIcon = (step: NavigationStep | null) => {
    if (!step) return <ArrowUp className="w-8 h-8 text-emerald-400" />;
    const text = (step.maneuver || step.instruction).toLowerCase();

    if (text.includes('u-turn')) return <RotateCcw className="w-8 h-8 text-emerald-400" />;
    if (text.includes('sharp-left') || text.includes('sharp left')) return <CornerUpLeft className="w-8 h-8 text-emerald-400" />;
    if (text.includes('sharp-right') || text.includes('sharp right')) return <CornerUpRight className="w-8 h-8 text-emerald-400" />;
    if (text.includes('slight-left') || text.includes('slight left') || text.includes('keep left')) return <ArrowUpLeft className="w-8 h-8 text-emerald-400" />;
    if (text.includes('slight-right') || text.includes('slight right') || text.includes('keep right')) return <ArrowUpRight className="w-8 h-8 text-emerald-400" />;
    if (text.includes('turn-left') || text.includes('left')) return <CornerUpLeft className="w-8 h-8 text-emerald-400" />;
    if (text.includes('turn-right') || text.includes('right')) return <CornerUpRight className="w-8 h-8 text-emerald-400" />;
    if (text.includes('fork') || text.includes('merge')) return <GitFork className="w-8 h-8 text-emerald-400" />;
    if (text.includes('roundabout')) return <RotateCw className="w-8 h-8 text-emerald-400" />;
    return <ArrowUp className="w-8 h-8 text-emerald-400" />;
  };

  const cleanInstruction = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  };

  // Format remaining duration into "X min" or "X hr Y min"
  const formatDuration = (seconds: number) => {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  };

  // Format distance into "X m" or "X.X km"
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format target ETA arrival clock
  const getEtaClock = (durationSecs: number) => {
    const arrivalDate = new Date(Date.now() + Math.max(0, durationSecs) * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Traffic badge configuration
  const getTrafficDetails = (severity: TrafficSeverity, delayMins: number) => {
    switch (severity) {
      case 'severe':
        return {
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-500 animate-pulse',
          label: delayMins > 0 ? `+${delayMins} min heavy traffic` : 'Severe delay',
          color: 'text-rose-400',
        };
      case 'heavy':
        return {
          bg: 'bg-red-500/20 border-red-500/40 text-red-300',
          dot: 'bg-red-500 animate-pulse',
          label: delayMins > 0 ? `+${delayMins} min delay` : 'Heavy traffic',
          color: 'text-red-400',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-500',
          label: delayMins > 0 ? `+${delayMins} min moderate traffic` : 'Moderate traffic',
          color: 'text-amber-400',
        };
      case 'light':
      default:
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'On time (smooth traffic)',
          color: 'text-emerald-400',
        };
    }
  };

  const trafficInfo = getTrafficDetails(trafficSeverity, trafficDelayMinutes);
  const etaArrival = getEtaClock(remainingDurationSeconds);
  const progressPercent = totalSteps > 0 ? Math.min(100, Math.round((stepIndex / totalSteps) * 100)) : 0;

  return (
    <div className="w-full max-w-xl mx-auto px-3 pt-3 select-none pointer-events-auto">
      {/* Top Banner Navigation HUD */}
      <div
        className={`rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
          isRerouting
            ? 'bg-amber-950/95 border-amber-600/60 shadow-amber-900/30 text-amber-100'
            : isDarkMode
            ? 'bg-neutral-900/95 border-emerald-500/40 shadow-black/80 text-neutral-100'
            : 'bg-neutral-900/95 border-emerald-600/50 shadow-emerald-950/40 text-white'
        }`}
      >
        {/* Progress bar across top */}
        <div className="w-full bg-neutral-800 h-1">
          <div
            className="bg-emerald-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isRerouting ? (
          <div className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 animate-spin">
              <RotateCw className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Rerouting...
              </div>
              <div className="text-xs text-amber-300/80">
                Off-route detected. Finding optimal alternative route.
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Maneuver & Next Turn Row */}
            <div className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-3.5">
              {/* Turn Maneuver Icon */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                {renderManeuverIcon(currentStep)}
              </div>

              {/* Maneuver Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-400">
                    {currentStep?.distance || 'In 100 m'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30 shrink-0">
                    Step {stepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="text-xs sm:text-sm md:text-base font-medium line-clamp-2 mt-0.5 leading-snug">
                  {currentStep ? cleanInstruction(currentStep.instruction) : 'Continue straight'}
                </div>
              </div>

              {/* Floating Speedometer Mini-Badge */}
              <div className="shrink-0 flex items-center">
                <div
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border font-mono bg-neutral-950/80 border-neutral-700/60 text-emerald-400 shadow-inner"
                  title="Current GPS speed"
                >
                  <span className="text-base sm:text-lg font-extrabold leading-none">
                    {Math.round(speedKmh)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-80 font-sans">
                    km/h
                  </span>
                </div>
              </div>

              {/* Voice and Repeat Action Buttons */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={onToggleMute}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                      : 'bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-400/30'
                  }`}
                  title={isMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onRepeatVoice}
                  className="p-1.5 sm:p-2 rounded-xl bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60 transition-all text-xs flex items-center justify-center cursor-pointer"
                  title="Repeat voice instruction"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real-time Dynamic ETA & Traffic Section */}
            <div className="px-3.5 sm:px-4 py-2 bg-neutral-950/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* ETA Clock & Remaining Time */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-neutral-300">ETA:</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {etaArrival}
                  </span>
                </div>

                <span className="text-neutral-600">•</span>

                <div className="flex items-center gap-1">
                  <span className={`font-mono font-bold text-sm ${trafficInfo.color}`}>
                    {formatDuration(remainingDurationSeconds)}
                  </span>
                  <span className="text-neutral-400 text-[11px]">left</span>
                </div>

                <span className="text-neutral-600">•</span>

                <div className="flex items-center gap-1 text-neutral-300 font-mono font-medium">
                  <Navigation className="w-3 h-3 text-emerald-400 rotate-45" />
                  <span>{formatDistance(remainingDistanceMeters)}</span>
                </div>
              </div>

              {/* Traffic Condition Badge */}
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${trafficInfo.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${trafficInfo.dot}`} />
                <span>{trafficInfo.label}</span>
              </div>
            </div>

            {/* Next subsequent step preview */}
            {nextStep && (
              <div className="px-4 py-1.5 bg-black/40 border-t border-white/5 flex items-center gap-2 text-xs text-neutral-300">
                <span className="text-neutral-400 font-medium">Then:</span>
                <span className="truncate">{cleanInstruction(nextStep.instruction)}</span>
                <span className="ml-auto text-neutral-400 shrink-0 font-mono">
                  {nextStep.distance}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
