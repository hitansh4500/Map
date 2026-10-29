import React, { useState } from 'react';
import {
  GraduationCap,
  MapPin,
  X,
  Compass,
  Layers,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ZoomIn,
  Navigation,
} from 'lucide-react';
import { StudyPlace } from '../types';

interface StudyCardProps {
  studyPlace: StudyPlace;
  onClearStudyPlace: () => void;
  onSwitchMapType: (type: string) => void;
  currentMapType: string;
  onExplorePlaceGrounding: (place: string) => void;
  onNavigateHere: (placeName: string) => void;
  onZoomInPlace: () => void;
  isDarkMode: boolean;
}

export const StudyCard: React.FC<StudyCardProps> = ({
  studyPlace,
  onClearStudyPlace,
  onSwitchMapType,
  currentMapType,
  onExplorePlaceGrounding,
  onNavigateHere,
  onZoomInPlace,
  isDarkMode,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);

  const coordsString = `${studyPlace.location.lat.toFixed(5)}, ${studyPlace.location.lng.toFixed(5)}`;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coordsString);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 pb-3 sm:pb-4 pointer-events-none select-none z-30">
      <div
        className={`rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl border p-3.5 sm:p-4 transition-all duration-300 pointer-events-auto ${
          isDarkMode
            ? 'bg-neutral-900/95 border-emerald-500/40 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-emerald-600/40 text-neutral-900 shadow-neutral-400/30'
        }`}
      >
        {/* Top Header Row with Mode Badge & Dismiss */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-700/20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Study Mode Active</span>
            </span>
            <span className="text-[11px] text-neutral-400 hidden sm:inline">
              Pure Landmark View (No Routes)
            </span>
          </div>

          <button
            onClick={onClearStudyPlace}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
                : 'bg-neutral-100 text-neutral-600 hover:text-black border-neutral-300'
            }`}
            title="Close study view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Place Identification */}
        <div className="pt-2.5 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight truncate capitalize">
              {studyPlace.name}
            </h2>

            <button
              onClick={handleCopyCoords}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-neutral-800/80 text-neutral-300 hover:text-white border-neutral-700'
                  : 'bg-neutral-100 text-neutral-700 hover:text-black border-neutral-200'
              }`}
              title="Copy GPS Coordinates"
            >
              {copiedCoords ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-neutral-400" />
                  <span>{coordsString}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
            {studyPlace.formattedAddress}
          </p>
        </div>

        {/* Map Imagery View Mode Buttons (Roadmap vs Satellite vs Terrain) */}
        <div className="mt-3 pt-2.5 border-t border-neutral-700/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">View:</span>
            {[
              { id: 'roadmap', label: 'Roads' },
              { id: 'satellite', label: 'Satellite' },
              { id: 'hybrid', label: 'Hybrid' },
              { id: 'terrain', label: 'Terrain' },
            ].map((layer) => {
              const active = currentMapType === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => onSwitchMapType(layer.id)}
                  className={`px-2 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : isDarkMode
                      ? 'bg-neutral-800/70 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                  }`}
                >
                  {layer.label}
                </button>
              );
            })}
          </div>

          {/* Quick Zoom In to study details */}
          <button
            onClick={onZoomInPlace}
            className={`p-1.5 px-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border-neutral-700'
                : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-neutral-300'
            }`}
            title="Zoom in to inspect structure"
          >
            <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Close Up</span>
          </button>
        </div>

        {/* Action Row: Study Insights & Optional Navigation */}
        <div className="mt-3 pt-2.5 border-t border-neutral-700/20 flex items-center gap-2">
          {/* Grounding & Insights */}
          <button
            onClick={() => onExplorePlaceGrounding(studyPlace.formattedAddress || studyPlace.name)}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Study Insights & History</span>
          </button>

          {/* Switch to Directions if user wants to travel there */}
          <button
            onClick={() => onNavigateHere(studyPlace.formattedAddress || studyPlace.name)}
            className={`py-2 px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border-neutral-700'
                : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-neutral-300'
            }`}
            title="Switch to Navigation Mode and get directions"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Get Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
