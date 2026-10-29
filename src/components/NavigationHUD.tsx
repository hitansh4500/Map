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
} from 'lucide-react';
import { NavigationStep } from '../types';
import { SpeedometerWidget } from './SpeedometerWidget';

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

  return (
    <div className="w-full max-w-xl mx-auto px-3 pt-3 select-none pointer-events-auto">
      {/* Top Banner Navigation HUD */}
      <div
        className={`rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
          isRerouting
            ? 'bg-amber-950/90 border-amber-600/60 shadow-amber-900/30 text-amber-100'
            : isDarkMode
            ? 'bg-neutral-900/95 border-emerald-500/40 shadow-black/80 text-neutral-100'
            : 'bg-emerald-900/95 border-emerald-700/50 shadow-emerald-950/40 text-emerald-50'
        }`}
      >
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
            <div className="p-4 flex items-center gap-3.5">
              {/* Turn Maneuver Icon */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                {renderManeuverIcon(currentStep)}
              </div>

              {/* Maneuver Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-bold tracking-tight font-mono text-emerald-400">
                    {currentStep?.distance || 'In 100 m'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    Step {stepIndex + 1}/{totalSteps}
                  </span>
                </div>
                <div className="text-sm md:text-base font-medium line-clamp-2 mt-0.5 leading-snug">
                  {currentStep ? cleanInstruction(currentStep.instruction) : 'Continue straight'}
                </div>
              </div>

              {/* Floating Speedometer Mini-Badge in HUD */}
              <div className="shrink-0 flex items-center">
                <div
                  className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border font-mono ${
                    isDarkMode
                      ? 'bg-neutral-950/70 border-neutral-700/60 text-emerald-400'
                      : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                  }`}
                  title="Current GPS speed"
                >
                  <span className="text-lg font-extrabold leading-none">
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
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
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
                  className="p-2 rounded-xl bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60 transition-all text-xs flex items-center justify-center cursor-pointer"
                  title="Repeat voice instruction"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Next subsequent step preview */}
            {nextStep && (
              <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex items-center gap-2 text-xs text-neutral-300">
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
