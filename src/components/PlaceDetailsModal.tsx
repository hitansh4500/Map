import React from 'react';
import { X, Sparkles, Navigation, ExternalLink, CheckCircle } from 'lucide-react';
import { GroundedPlaceInsight } from '../types';

interface PlaceDetailsModalProps {
  insight: GroundedPlaceInsight | null;
  isLoading: boolean;
  onClose: () => void;
  onNavigateHere: (placeName: string) => void;
  isDarkMode: boolean;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  insight,
  isLoading,
  onClose,
  onNavigateHere,
  isDarkMode,
}) => {
  if (!insight && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl border p-6 overflow-hidden transition-all duration-300 relative ${
          isDarkMode
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Maps Grounding Intelligence
              </span>
              <h3 className="text-lg font-bold leading-tight">
                {insight?.placeName || 'Loading place info...'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-full border transition-colors ${
              isDarkMode
                ? 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
                : 'bg-neutral-100 text-neutral-600 hover:text-black border-neutral-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-neutral-400">
              Grounding Google Maps data via Gemini 3.8 Flash...
            </span>
          </div>
        ) : insight ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Summary */}
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed whitespace-pre-line ${
                isDarkMode
                  ? 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              {insight.summary}
            </div>

            {/* Highlights */}
            {insight.highlights && insight.highlights.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Key Highlights
                </h4>
                <div className="space-y-1.5">
                  {insight.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grounding Sources */}
            {insight.groundingSources && insight.groundingSources.length > 0 && (
              <div className="pt-2 border-t border-neutral-800/40">
                <span className="text-[11px] font-medium text-neutral-400 block mb-1.5">
                  Maps Sources & Verification:
                </span>
                <div className="flex flex-wrap gap-2">
                  {insight.groundingSources.map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                    >
                      <span>{source.title || 'Google Maps Source'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  onNavigateHere(insight.placeName);
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate to this location</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
