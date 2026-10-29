import React, { useState, useEffect } from 'react';
import {
  Car,
  Bus,
  Footprints,
  Bike,
  Navigation,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Crosshair,
  LocateFixed,
  X,
  Mic,
  MicOff,
  Radio,
  Search,
} from 'lucide-react';
import { RouteOption, TravelMode } from '../types';
import { voiceRecognition } from '../utils/speechRecognition';

interface RouteSearchPanelProps {
  origin: string;
  destination: string;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  routes: RouteOption[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  onStartNavigation: () => void;
  isCalculating: boolean;
  onSwapOriginDestination: () => void;
  onExplorePlaceGrounding: (place: string) => void;
  isDarkMode: boolean;
  onLocateMe: () => void;
  isLocating: boolean;
  detectedLocationLabel?: string;
  onCalculateRoutes: () => void;
}

export const RouteSearchPanel: React.FC<RouteSearchPanelProps> = ({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  travelMode,
  onTravelModeChange,
  routes,
  selectedRouteIndex,
  onSelectRouteIndex,
  onStartNavigation,
  isCalculating,
  onExplorePlaceGrounding,
  isDarkMode,
  onLocateMe,
  isLocating,
  detectedLocationLabel,
  onCalculateRoutes,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
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
        onDestinationChange(transcript);
        if (isFinal) {
          setIsVoiceListening(false);
          // Immediately trigger automatic route calculation on voice completion!
          setTimeout(() => {
            onCalculateRoutes();
          }, 150);
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
    <div
      className={`rounded-3xl shadow-2xl backdrop-blur-xl border transition-all duration-300 w-full max-w-md overflow-hidden ${
        isDarkMode
          ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-black/80'
          : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-400/30'
      }`}
    >
      {/* Search Header */}
      <div className="p-4 border-b border-neutral-700/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Navigation className="w-4 h-4 fill-blue-400/20" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Navigation Routes</h2>
              <p className="text-[11px] opacity-70">
                {detectedLocationLabel ? `From ${detectedLocationLabel}` : 'Real-time GPS & live traffic'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLocateMe}
              disabled={isLocating}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                isLocating
                  ? 'bg-blue-500/30 text-blue-300 border-blue-400 animate-pulse'
                  : isDarkMode
                  ? 'bg-neutral-800 text-blue-400 border-neutral-700 hover:bg-neutral-700'
                  : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
              }`}
              title="Locate my position via GPS"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs px-2.5 py-1 rounded-xl border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                  : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:text-black'
              }`}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
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
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Origin and Destination Inputs */}
          <div className="space-y-2">
            {/* Origin (Where you are standing) */}
            <div className="relative flex items-center">
              <span className="absolute left-3 w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-500/30 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </span>
              <input
                type="text"
                value={origin}
                onChange={(e) => onOriginChange(e.target.value)}
                placeholder="Where you are standing (Current Location)..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs outline-none border transition-colors ${
                  isDarkMode
                    ? 'bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:border-blue-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                }`}
              />
              <button
                onClick={onLocateMe}
                className="absolute right-2.5 text-neutral-400 hover:text-blue-400 transition-colors p-1 cursor-pointer"
                title="Use current GPS location"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination with Voice-to-Text Recognition and Direct Route Search Button */}
            <div className="relative flex items-center">
              <MapPin className="absolute left-2.5 w-4 h-4 text-rose-500" />
              <input
                type="text"
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && destination.trim()) {
                    onCalculateRoutes();
                  }
                }}
                placeholder="Where to? (Type or speak destination)..."
                className={`w-full pl-9 pr-24 py-2.5 rounded-xl text-xs outline-none border transition-colors font-medium ${
                  isVoiceListening
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/10'
                    : isDarkMode
                    ? 'bg-neutral-950/80 border-neutral-800 text-neutral-100 placeholder-neutral-400 focus:border-emerald-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:border-emerald-500'
                }`}
              />

              <div className="absolute right-2 flex items-center gap-1">
                {/* Clear Destination Button */}
                {destination && (
                  <button
                    type="button"
                    onClick={() => onDestinationChange('')}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors p-1 cursor-pointer"
                    title="Clear destination"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Direct Get Route Arrow Button */}
                {destination.trim() && (
                  <button
                    type="button"
                    onClick={onCalculateRoutes}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md flex items-center justify-center"
                    title="Calculate route and view both locations on map"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Voice-to-Text Recognition Microphone Button */}
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
          </div>

          {/* Voice Listening Active Status Overlay / Visualizer */}
          {isVoiceListening && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="font-semibold text-rose-200">Listening...</span>
                <span className="text-[11px] text-neutral-300 truncate max-w-[180px]">
                  {voiceTranscript ? `"${voiceTranscript}"` : 'Say your destination now'}
                </span>
              </div>
              <button
                onClick={handleToggleVoiceInput}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Voice Error Notice */}
          {voiceError && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <MicOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{voiceError}</span>
            </div>
          )}

          {/* Maps Grounding feature button */}
          {destination && (
            <button
              onClick={() => onExplorePlaceGrounding(destination)}
              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="font-medium">Get Place Highlights & Traffic Vibe</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                Maps Grounding
              </span>
            </button>
          )}

          {/* Route Alternatives List or Empty state */}
          {isCalculating ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs opacity-70">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Calculating optimal routes with live traffic...</span>
            </div>
          ) : !destination ? (
            <div
              className={`p-3.5 rounded-2xl border text-center text-xs ${
                isDarkMode
                  ? 'bg-neutral-950/40 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}
            >
              <span>Type destination and press Enter, or tap the microphone to speak where you want to go.</span>
            </div>
          ) : routes.length > 0 ? (
            <div className="space-y-2 pt-2 border-t border-neutral-700/20">
              <div className="text-[11px] font-medium opacity-60">
                Available Routes ({routes.length})
              </div>
              {routes.map((route, idx) => {
                const isSelected = idx === selectedRouteIndex;
                const trafficDelayMins = Math.round(
                  (route.durationWithTrafficSeconds - route.durationSeconds) / 60
                );

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRouteIndex(idx)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                        : isDarkMode
                        ? 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800/40'
                        : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-emerald-400 font-mono">
                          {formatDuration(route.durationWithTrafficSeconds)}
                        </span>
                        <span className="text-xs opacity-75">
                          {formatDistance(route.distanceMeters)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-neutral-400">
                        {route.summary || `Route ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      {trafficDelayMins > 0 ? (
                        <span className="text-amber-400 flex items-center gap-1 font-medium">
                          <TrendingUp className="w-3 h-3" />+{trafficDelayMins} min traffic delay
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">Fastest route now</span>
                      )}

                      <span className="opacity-60">{route.steps.length} turns</span>
                    </div>
                  </div>
                );
              })}

              {/* Start Navigation CTA */}
              <button
                onClick={onStartNavigation}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer mt-3"
              >
                <span>Start Navigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-4 text-center text-xs opacity-60">
              No routes found. Please check your destination query.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
