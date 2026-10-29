import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { MapContainer } from './components/MapContainer';
import { NavigationHUD } from './components/NavigationHUD';
import { NavigationBottomBar } from './components/NavigationBottomBar';
import { TopSearchBar } from './components/TopSearchBar';
import { RouteBottomSheet } from './components/RouteBottomSheet';
import { TrafficLegend } from './components/TrafficLegend';
import { PlaceDetailsModal } from './components/PlaceDetailsModal';
import { QuotaBanner } from './components/QuotaBanner';
import { SpeedometerWidget } from './components/SpeedometerWidget';
import { AIChatbotModal } from './components/AIChatbotModal';

import { RouteOption, TravelMode, GroundedPlaceInsight } from './types';
import { speechService } from './utils/speech';
import { computeOptimalRoutes, reverseGeocodeLatLng } from './services/routeCalculator';
import { fetchPlaceGrounding } from './services/groundingService';

// Fallback to demo key if .env is not present
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBKRcSrW9nYvkpbXRxhBh3ri45hdI9tr-s';

// Fixed initial location anchor: Kandivali West, Mumbai, India
const KANDIVALI_MUMBAI_LOCATION: google.maps.LatLngLiteral = {
  lat: 19.2062,
  lng: 72.8488,
};

// Filter out European cloud proxy exit nodes (Amsterdam / London) from Cloud Run server
const isCloudProxyCoordinate = (lat: number, lng: number): boolean => {
  if (lat >= 52.0 && lat <= 53.0 && lng >= 4.0 && lng <= 6.0) return true;
  if (lat >= 51.0 && lat <= 52.0 && lng >= -1.0 && lng <= 0.6) return true;
  return false;
};

// Calculate distance in meters between two coordinates (Haversine)
function calculateDistanceMeters(p1: google.maps.LatLngLiteral, p2: google.maps.LatLngLiteral): number {
  const R = 6371e3;
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const dPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLambda = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MainAppContent: React.FC<{
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  quotaExceeded: boolean;
  setQuotaExceeded: (val: boolean) => void;
}> = ({ isDarkMode, setIsDarkMode, quotaExceeded, setQuotaExceeded }) => {
  const routesLib = useMapsLibrary('routes');

  // Map state
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [isTrafficEnabled, setIsTrafficEnabled] = useState<boolean>(true);

  // Search & Routing state (Starting point locked to Kandivali West, Mumbai)
  const [origin, setOrigin] = useState<string>('Current Location (Kandivali West, Mumbai)');
  const [destination, setDestination] = useState<string>('');
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string>('Kandivali West, Mumbai');
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [proxyBlockedNotice, setProxyBlockedNotice] = useState<boolean>(false);

  // Navigation mode state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speedKmh, setSpeedKmh] = useState<number>(0);

  // Real-time Device Tracking state & Demo simulation toggle
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentPathIndex, setCurrentPathIndex] = useState<number>(0);
  const [userPosition, setUserPosition] = useState<google.maps.LatLngLiteral>(() => {
    try {
      const saved = localStorage.getItem('user_geo_location_mumbai');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!isCloudProxyCoordinate(parsed.lat, parsed.lng)) {
          return parsed;
        }
      }
    } catch (e) {
      // fallback
    }
    return KANDIVALI_MUMBAI_LOCATION;
  });
  const [userHeading, setUserHeading] = useState<number>(0);

  // Maps Grounding & AI Concierge modal state
  const [groundingInsight, setGroundingInsight] = useState<GroundedPlaceInsight | null>(null);
  const [isGroundingLoading, setIsGroundingLoading] = useState<boolean>(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<google.maps.LatLngLiteral | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const hasMountedRef = useRef<boolean>(false);
  const activeRoute = routes[selectedRouteIndex] || null;

  // 1. Geolocation: Detect User's Real-Time Standing Position
  const handleLocateUser = useCallback(async () => {
    setIsLocating(true);
    setProxyBlockedNotice(false);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Reject European cloud runner proxy IP coordinate (Amsterdam/London)
          if (isCloudProxyCoordinate(lat, lng)) {
            console.warn('Rejected cloud proxy IP coordinate. Retaining Kandivali West, Mumbai.');
            setUserPosition(KANDIVALI_MUMBAI_LOCATION);
            setOrigin('Current Location (Kandivali West, Mumbai)');
            setDetectedLocationLabel('Kandivali West, Mumbai');
            setProxyBlockedNotice(true);
            setTimeout(() => setProxyBlockedNotice(false), 5000);
            setIsLocating(false);
            return;
          }

          const legitimatePos = { lat, lng };
          setUserPosition(legitimatePos);
          try {
            localStorage.setItem('user_geo_location_mumbai', JSON.stringify(legitimatePos));
            const geocoded = await reverseGeocodeLatLng(lat, lng);
            const label = geocoded.neighborhood || geocoded.city || 'Your Location';
            setOrigin(`Current Location (${label})`);
            setDetectedLocationLabel(label);
          } catch (e) {
            setOrigin('Current Location');
            setDetectedLocationLabel('Current Location');
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          setUserPosition(KANDIVALI_MUMBAI_LOCATION);
          setOrigin('Current Location (Kandivali West, Mumbai)');
          setDetectedLocationLabel('Kandivali West, Mumbai');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setUserPosition(KANDIVALI_MUMBAI_LOCATION);
      setOrigin('Current Location (Kandivali West, Mumbai)');
      setDetectedLocationLabel('Kandivali West, Mumbai');
      setIsLocating(false);
    }
  }, []);

  // Run geolocation ONLY ONCE on mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      handleLocateUser();
    }
  }, [handleLocateUser]);

  // 2. Real road route calculation (via server proxy)
  const handleCalculateRoutes = useCallback(async () => {
    if (!destination.trim()) {
      setRoutes([]);
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedRoutes = await computeOptimalRoutes(
        routesLib,
        userPosition,
        destination,
        travelMode,
        userPosition
      );
      setRoutes(calculatedRoutes);
      setSelectedRouteIndex(0);
      setStepIndex(0);
      setCurrentPathIndex(0);
    } catch (err) {
      console.error('Failed to compute route:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [routesLib, userPosition, destination, travelMode]);

  // Automatically recalculate when travel mode changes
  useEffect(() => {
    if (destination.trim()) {
      handleCalculateRoutes();
    }
  }, [travelMode]);

  // 3. Real Device Movement Tracking with navigator.geolocation.watchPosition & Real-Time Speedometer
  useEffect(() => {
    if (!isNavigating || isSimulating) {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (isCloudProxyCoordinate(lat, lng)) return;

          const updatedPos = { lat, lng };
          setUserPosition(updatedPos);
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            setUserHeading(pos.coords.heading);
          }

          // Calculate real-time speed in km/h
          const rawSpeed = pos.coords.speed;
          if (rawSpeed !== null && !isNaN(rawSpeed) && rawSpeed >= 0) {
            setSpeedKmh(Math.round(rawSpeed * 3.6));
          } else {
            const now = Date.now();
            if (lastPosRef.current && lastTimeRef.current) {
              const distMeters = calculateDistanceMeters(lastPosRef.current, updatedPos);
              const timeSec = (now - lastTimeRef.current) / 1000;
              if (timeSec > 0.5 && timeSec < 15) {
                const calculatedSpeedKmh = Math.round((distMeters / timeSec) * 3.6);
                setSpeedKmh(Math.min(160, Math.max(0, calculatedSpeedKmh)));
              }
            }
            lastPosRef.current = updatedPos;
            lastTimeRef.current = now;
          }
        },
        (err) => {
          console.warn('Real-time watchPosition warning:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
      );
    }

    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
    };
  }, [isNavigating, isSimulating]);

  // 4. Start navigation (tracks REAL device GPS movements)
  const handleStartNavigation = () => {
    if (!activeRoute) return;
    setIsNavigating(true);
    setIsSimulating(false);
    setStepIndex(0);
    setCurrentPathIndex(0);
    setSpeedKmh(0);
    lastPosRef.current = null;
    lastTimeRef.current = null;

    const startPos = activeRoute.path[0] || userPosition;
    setUserPosition(startPos);

    if (activeRoute.steps.length > 0) {
      const firstStep = activeRoute.steps[0];
      speechService.speak(
        `Starting route to ${destination}. In ${firstStep.distance}, ${firstStep.instruction}`
      );
    }
  };

  // Exit navigation
  const handleExitNavigation = () => {
    setIsNavigating(false);
    setIsSimulating(false);
    setSpeedKmh(0);
    lastPosRef.current = null;
    lastTimeRef.current = null;
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
    }
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
    speechService.cancel();
  };

  // 5. Optional Demo Drive Simulation (Simulates cruising speed)
  useEffect(() => {
    if (!isNavigating || !isSimulating || !activeRoute) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
      return;
    }

    simulationTimerRef.current = setInterval(() => {
      setCurrentPathIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= activeRoute.path.length) {
          setIsSimulating(false);
          setSpeedKmh(0);
          speechService.speak('You have arrived at your destination!', 'urgent');
          return prevIndex;
        }

        const prevPos = activeRoute.path[prevIndex];
        const nextPos = activeRoute.path[nextIndex];
        setUserPosition(nextPos);

        const simulatedSpeed = Math.round(44 + Math.sin(nextIndex * 0.5) * 6);
        setSpeedKmh(simulatedSpeed);

        const dy = nextPos.lat - prevPos.lat;
        const dx = (nextPos.lng - prevPos.lng) * Math.cos((prevPos.lat * Math.PI) / 180);
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        setUserHeading(angle >= 0 ? angle : angle + 360);

        const approxStepIndex = Math.min(
          activeRoute.steps.length - 1,
          Math.floor((nextIndex / activeRoute.path.length) * activeRoute.steps.length)
        );

        setStepIndex((curStep) => {
          if (approxStepIndex > curStep) {
            const newStep = activeRoute.steps[approxStepIndex];
            speechService.speak(`In ${newStep.distance}, ${newStep.instruction}`);
            return approxStepIndex;
          }
          return curStep;
        });

        return nextIndex;
      });
    }, 700);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [isNavigating, isSimulating, activeRoute]);

  // 6. Simulate Off-Route Deviation & Recalculate
  const handleSimulateOffRoute = async () => {
    if (!activeRoute) return;
    setIsRerouting(true);
    speechService.speak('Off-route detected. Recalculating route...', 'urgent');

    const deviatedPos = {
      lat: userPosition.lat + 0.003,
      lng: userPosition.lng - 0.004,
    };
    setUserPosition(deviatedPos);

    setTimeout(async () => {
      try {
        const rerouted = await computeOptimalRoutes(
          routesLib,
          deviatedPos,
          destination,
          travelMode,
          deviatedPos
        );
        setRoutes(rerouted);
        setSelectedRouteIndex(0);
        setStepIndex(0);
        setCurrentPathIndex(0);
        setIsRerouting(false);
        speechService.speak('Rerouted. Continue straight to follow optimal route.');
      } catch (e) {
        setIsRerouting(false);
      }
    }, 1500);
  };

  // 7. Maps Grounding place lookup via Gemini 3.8 Flash
  const handleExplorePlaceGrounding = async (query: string) => {
    setIsGroundingLoading(true);
    setGroundingInsight(null);
    const result = await fetchPlaceGrounding(query);
    setGroundingInsight(result);
    setIsGroundingLoading(false);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    speechService.setMuted(nextMuted);
  };

  const handleRepeatVoice = () => {
    if (activeRoute && activeRoute.steps[stepIndex]) {
      const step = activeRoute.steps[stepIndex];
      speechService.speak(`In ${step.distance}, ${step.instruction}`, 'urgent');
    }
  };

  const handleNextStep = () => {
    if (!activeRoute) return;
    setStepIndex((prev) => {
      const next = Math.min(activeRoute.steps.length - 1, prev + 1);
      const step = activeRoute.steps[next];
      speechService.speak(`In ${step.distance}, ${step.instruction}`);
      return next;
    });
  };

  const handlePrevStep = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const currentStep = activeRoute?.steps[stepIndex] || null;
  const nextStep = activeRoute?.steps[stepIndex + 1] || null;
  const trafficDelayMinutes = activeRoute
    ? Math.max(0, Math.round((activeRoute.durationWithTrafficSeconds - activeRoute.durationSeconds) / 60))
    : 0;

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans transition-colors duration-500 ${
        isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      {/* Quota Defense Banner */}
      <QuotaBanner visible={quotaExceeded} onDismiss={() => setQuotaExceeded(false)} />

      {/* Cloud Proxy Blocked Safe Notice */}
      {proxyBlockedNotice && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 px-3 py-1.5 text-xs text-center sticky top-0 z-50 shadow-md flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Locked to verified location in Kandivali West, Mumbai. Proxy IP rejected.</span>
        </div>
      )}

      {/* Main Map Canvas with Modern AdvancedMarker */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          isDarkMode={isDarkMode}
          mapTypeId={mapTypeId}
          isTrafficEnabled={isTrafficEnabled}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRouteIndex={setSelectedRouteIndex}
          userPosition={userPosition}
          userHeading={userHeading}
          isNavigating={isNavigating}
          onLocateMe={handleLocateUser}
          isLocating={isLocating}
        />
      </div>

      {/* Top Destination Entry Bar (Pinned at top of screen for all devices) */}
      {!isNavigating && (
        <div className="fixed top-0 inset-x-0 z-40">
          <TopSearchBar
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            onCalculateRoutes={handleCalculateRoutes}
            isCalculating={isCalculating}
            onLocateMe={handleLocateUser}
            isLocating={isLocating}
            detectedLocationLabel={detectedLocationLabel}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onExplorePlaceGrounding={handleExplorePlaceGrounding}
            onOpenAIChat={() => setIsAIChatOpen(true)}
          />
        </div>
      )}

      {/* Turn-by-Turn Navigation HUD (Displayed at top during active navigation) */}
      {isNavigating && (
        <div className="fixed top-0 inset-x-0 z-40">
          <NavigationHUD
            currentStep={currentStep}
            nextStep={nextStep}
            stepIndex={stepIndex}
            totalSteps={activeRoute?.steps.length || 0}
            isRerouting={isRerouting}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onRepeatVoice={handleRepeatVoice}
            isDarkMode={isDarkMode}
            speedKmh={speedKmh}
          />
        </div>
      )}

      {/* Floating Speedometer Widget on Map during active navigation */}
      {isNavigating && (
        <div className="fixed left-3 sm:left-4 bottom-24 z-30 pointer-events-auto">
          <SpeedometerWidget
            speedKmh={speedKmh}
            isDarkMode={isDarkMode}
            speedLimit={60}
          />
        </div>
      )}

      {/* Floating Traffic Legend Button/Indicator */}
      {!isNavigating && (
        <div className="fixed left-3 sm:left-4 bottom-3 sm:bottom-4 z-30 pointer-events-auto">
          <TrafficLegend
            isTrafficEnabled={isTrafficEnabled}
            onToggleTraffic={() => setIsTrafficEnabled(!isTrafficEnabled)}
            isDarkMode={isDarkMode}
            activeRouteDelayMinutes={trafficDelayMinutes}
          />
        </div>
      )}

      {/* Floating AI Concierge Quick Trigger Button */}
      {!isNavigating && (
        <button
          onClick={() => setIsAIChatOpen(true)}
          className={`fixed right-3 sm:right-4 bottom-3 sm:bottom-4 z-30 pointer-events-auto px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl sm:rounded-3xl shadow-2xl flex items-center gap-2 border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${
            isDarkMode
              ? 'bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 border-purple-500/50 text-white shadow-purple-950/80 hover:border-purple-400'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 border-purple-400 text-white shadow-purple-500/30 hover:opacity-95'
          }`}
          title="Open AI Concierge for Dine-in & Places"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">Dine-in & Places AI</span>
        </button>
      )}

      {/* Bottom Route Summary Drawer (When NOT navigating and routes exist) */}
      {!isNavigating && (
        <div className="fixed bottom-0 inset-x-0 z-20 pointer-events-none">
          <RouteBottomSheet
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRouteIndex={setSelectedRouteIndex}
            onStartNavigation={handleStartNavigation}
            isCalculating={isCalculating}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Bottom Navigation HUD (Displayed during active navigation) */}
      {isNavigating && activeRoute && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <NavigationBottomBar
            activeRoute={activeRoute}
            isSimulating={isSimulating}
            onToggleSimulate={() => setIsSimulating(!isSimulating)}
            onSimulateOffRoute={handleSimulateOffRoute}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onExitNavigation={handleExitNavigation}
            onRecenter={handleLocateUser}
            isDarkMode={isDarkMode}
            stepIndex={stepIndex}
          />
        </div>
      )}

      {/* Grounded Place Details Modal */}
      <PlaceDetailsModal
        insight={groundingInsight}
        isLoading={isGroundingLoading}
        onClose={() => setGroundingInsight(null)}
        onNavigateHere={(placeName) => {
          setDestination(placeName);
          setTimeout(() => {
            handleCalculateRoutes();
          }, 100);
        }}
        isDarkMode={isDarkMode}
      />

      {/* AI Assistant Chatbot Modal for Dine-in & Places */}
      <AIChatbotModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onNavigateHere={(placeName) => {
          setDestination(placeName);
          setIsAIChatOpen(false);
          speechService.speak(`Route set to ${placeName}. Calculating optimal driving directions.`);
          setTimeout(() => {
            handleCalculateRoutes();
          }, 150);
        }}
        locationAddress={detectedLocationLabel || 'Kandivali West, Mumbai'}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuota);
    };
  }, []);

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['routes', 'maps', 'geometry', 'marker']}
    >
      <MainAppContent
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        quotaExceeded={quotaExceeded}
        setQuotaExceeded={setQuotaExceeded}
      />
    </APIProvider>
  );
}
