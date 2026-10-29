import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  X,
  Mic,
  Radio,
  ArrowRight,
  Car,
  Bus,
  Footprints,
  Bike,
  LocateFixed,
  Crosshair,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Sparkles,
  GraduationCap,
  Compass,
} from 'lucide-react';
import { AppMode, TravelMode } from '../types';
import { voiceRecognition } from '../utils/speechRecognition';

interface TopSearchBarProps {
  appMode: AppMode;
  onAppModeChange: (mode: AppMode) => void;
  origin: string;
  destination: string;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  onCalculateRoutes: () => void;
  isCalculating: boolean;
  onLocateMe: () => void;
  isLocating: boolean;
  detectedLocationLabel?: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onExplorePlaceGrounding: (place: string) => void;
  // Study Mode props
  studyQuery: string;
  onStudyQueryChange: (val: string) => void;
  onLookupStudyPlace: (query?: string) => void;
  isStudyingLoading: boolean;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  appMode,
  onAppModeChange,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  travelMode,
  onTravelModeChange,
  onCalculateRoutes,
  isCalculating,
  onLocateMe,
  isLocating,
  detectedLocationLabel,
  isDarkMode,
  onToggleDarkMode,
  onExplorePlaceGrounding,
  studyQuery,
  onStudyQueryChange,
  onLookupStudyPlace,
  isStudyingLoading,
}) => {
  const [showDirectionsDetails, setShowDirectionsDetails] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Clean up voice listening on unmount
  useEffect(() => {
    return () => {
      voiceRecognition.stopListening();
    };
  }, []);

  // Handle voice-to-text toggle
  const handleToggleVoiceInput = () => {
    if (isVoiceListening) {
      voiceRecognition.stopListening();
      setIsVoiceListening(false);
      return;
    }

    setVoiceError(null);
    setVoiceTranscript('');

    voiceRecognition.startListening({
      onStart: () => {
        setIsVoiceListening(true);
      },
      onResult: (transcript, isFinal) => {
        setVoiceTranscript(transcript);
        if (appMode === 'study') {
          onStudyQueryChange(transcript);
          if (isFinal) {
            setIsVoiceListening(false);
            setTimeout(() => {
              onLookupStudyPlace(transcript);
            }, 150);
          }
        } else {
          onDestinationChange(transcript);
          if (isFinal) {
            setIsVoiceListening(false);
            setTimeout(() => {
              onCalculateRoutes();
            }, 150);
          }
        }
      },
      onError: (err) => {
        setIsVoiceListening(false);
        setVoiceError(err);
        setTimeout(() => setVoiceError(null), 4000);
      },
      onEnd: () => {
        setIsVoiceListening(false);
      },
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto px-2.5 sm:px-4 pt-2.5 sm:pt-3 pointer-events-none select-none z-40">
      <div
        className={`rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl border transition-all duration-300 pointer-events-auto overflow-hidden ${
          isDarkMode
            ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
            : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
        }`}
      >
        {/* Mode Switcher Tabs (Navigation Mode vs Study Mode) */}
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between border-b border-neutral-700/20">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-neutral-950/40 border border-neutral-800">
            <button
              onClick={() => onAppModeChange('navigation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                appMode === 'navigation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Navigation</span>
            </button>

            <button
              onClick={() => onAppModeChange('study')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                appMode === 'study'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Study Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {appMode === 'study' && (
              <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 hidden sm:inline">
                No Routes • Direct Landmark View
              </span>
            )}

            {/* Night / Light Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode
                  ? 'bg-neutral-800 text-amber-300 hover:bg-neutral-700 border-neutral-700'
                  : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-neutral-300'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 fill-amber-300" />
              ) : (
                <Sun className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              )}
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2">
          {/* Brand Pin Icon */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md transition-colors ${
              appMode === 'study'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
            }`}
          >
            {appMode === 'study' ? (
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 fill-white/20" />
            )}
          </div>

          {/* STUDY MODE: Single Place Search Bar */}
          {appMode === 'study' ? (
            <div className="flex-1 relative flex items-center min-w-0">
              <MapPin className="absolute left-2.5 w-4 h-4 text-emerald-400 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={studyQuery}
                onChange={(e) => onStudyQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && studyQuery.trim()) {
                    onLookupStudyPlace();
                  }
                }}
                placeholder="Enter place or landmark to study (e.g. Taj Mahal, Paris, IIT)..."
                className={`w-full pl-8 sm:pl-9 pr-20 sm:pr-22 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none border transition-colors ${
                  isVoiceListening
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/10'
                    : isDarkMode
                    ? 'bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-400 focus:border-emerald-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:border-emerald-500'
                }`}
              />

              {/* Actions */}
              <div className="absolute right-1.5 flex items-center gap-1">
                {studyQuery && (
                  <button
                    type="button"
                    onClick={() => onStudyQueryChange('')}
                    className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Clear query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Direct Go Arrow */}
                {studyQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => onLookupStudyPlace()}
                    disabled={isStudyingLoading}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md flex items-center justify-center"
                    title="Redirect to Place"
                  >
                    {isStudyingLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {/* Voice-to-Text Microphone Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isVoiceListening
                      ? 'bg-emerald-500 text-white animate-pulse shadow-md shadow-emerald-500/50 scale-105'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 hover:text-emerald-400 hover:bg-neutral-700'
                      : 'bg-neutral-200 text-neutral-700 hover:text-emerald-600 hover:bg-neutral-300'
                  }`}
                  title={isVoiceListening ? 'Stop voice recognition' : 'Speak place name using voice-to-text'}
                >
                  {isVoiceListening ? (
                    <Radio className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* NAVIGATION MODE: Origin and Destination */
            <>
              <div className="flex-1 relative flex items-center min-w-0">
                <MapPin className="absolute left-2.5 w-4 h-4 text-rose-500 shrink-0 pointer-events-none" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => onDestinationChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && destination.trim()) {
                      onCalculateRoutes();
                    }
                  }}
                  placeholder="Search destination or address..."
                  className={`w-full pl-8 sm:pl-9 pr-20 sm:pr-22 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none border transition-colors ${
                    isVoiceListening
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/10'
                      : isDarkMode
                      ? 'bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-400 focus:border-blue-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:border-blue-500'
                  }`}
                />

                {/* Input Actions (Clear, Go, Mic) */}
                <div className="absolute right-1.5 flex items-center gap-1">
                  {destination && (
                    <button
                      type="button"
                      onClick={() => onDestinationChange('')}
                      className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                      title="Clear destination"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Direct Go Arrow */}
                  {destination.trim() && (
                    <button
                      type="button"
                      onClick={onCalculateRoutes}
                      disabled={isCalculating}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md flex items-center justify-center"
                      title="Get Directions"
                    >
                      {isCalculating ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* Voice-to-Text Microphone Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      isVoiceListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/50 scale-105'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-300 hover:text-rose-400 hover:bg-neutral-700'
                        : 'bg-neutral-200 text-neutral-700 hover:text-rose-600 hover:bg-neutral-300'
                    }`}
                    title={isVoiceListening ? 'Stop voice recognition' : 'Speak destination using voice-to-text'}
                  >
                    {isVoiceListening ? (
                      <Radio className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Expand Toggle for Starting Point & Travel Mode */}
              <button
                onClick={() => setShowDirectionsDetails(!showDirectionsDetails)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                  showDirectionsDetails
                    ? 'bg-blue-600 text-white border-blue-500'
                    : isDarkMode
                    ? 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:text-black'
                }`}
                title="Toggle travel mode and start location"
              >
                {showDirectionsDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <SlidersHorizontal className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Voice Listening Active Status Overlay */}
        {isVoiceListening && (
          <div className="px-3.5 py-2 bg-emerald-500/10 border-t border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="font-semibold text-emerald-200 shrink-0">Listening:</span>
              <span className="truncate">{voiceTranscript || 'Say place name now...'}</span>
            </div>
            <button
              onClick={handleToggleVoiceInput}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium cursor-pointer shrink-0 ml-2"
            >
              Done
            </button>
          </div>
        )}

        {/* Voice Error Notice */}
        {voiceError && (
          <div className="px-3 py-1.5 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-xs">
            {voiceError}
          </div>
        )}

        {/* Expandable Details: Origin Location & Travel Modes (Navigation mode only) */}
        {appMode === 'navigation' && showDirectionsDetails && (
          <div className="p-3 border-t border-neutral-700/20 space-y-2.5 animate-fadeIn">
            {/* Origin (Starting Point) */}
            <div className="relative flex items-center">
              <span className="absolute left-3 w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-500/30 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </span>
              <input
                type="text"
                value={origin}
                onChange={(e) => onOriginChange(e.target.value)}
                placeholder="Where you are standing (Current Location)..."
                className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs outline-none border transition-colors ${
                  isDarkMode
                    ? 'bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:border-blue-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                }`}
              />
              <button
                onClick={onLocateMe}
                disabled={isLocating}
                className={`absolute right-2 text-neutral-400 hover:text-blue-400 transition-colors p-1 cursor-pointer ${
                  isLocating ? 'animate-pulse text-blue-400' : ''
                }`}
                title="Re-locate GPS"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Travel Mode Selector */}
            <div
              className={`grid grid-cols-4 gap-1 p-1 rounded-2xl border ${
                isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}
            >
              {(
                [
                  { mode: 'DRIVING', icon: Car, label: 'Drive' },
                  { mode: 'TRANSIT', icon: Bus, label: 'Transit' },
                  { mode: 'WALKING', icon: Footprints, label: 'Walk' },
                  { mode: 'BICYCLING', icon: Bike, label: 'Bike' },
                ] as const
              ).map(({ mode, icon: Icon, label }) => {
                const active = travelMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => onTravelModeChange(mode)}
                    className={`py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDarkMode
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Maps Grounding Button */}
            {destination && (
              <button
                onClick={() => onExplorePlaceGrounding(destination)}
                className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Explore Place Details & Traffic Vibe</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  Maps Grounding
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
