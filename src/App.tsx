import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { ShieldCheck } from 'lucide-react';

import { MapContainer } from './components/MapContainer';
import { NavigationHUD } from './components/NavigationHUD';
import { NavigationBottomBar } from './components/NavigationBottomBar';
import { TopSearchBar } from './components/TopSearchBar';
import { RouteBottomSheet } from './components/RouteBottomSheet';
import { TrafficLegend } from './components/TrafficLegend';
import { PlaceDetailsModal } from './components/PlaceDetailsModal';
import { QuotaBanner } from './components/QuotaBanner';
import { SpeedometerWidget } from './components/SpeedometerWidget';
import { StudyCard } from './components/StudyCard';

import { RouteOption, TravelMode, GroundedPlaceInsight, AppMode, StudyPlace } from './types';
import { speechService } from './utils/speech';
import { computeOptimalRoutes, reverseGeocodeLatLng } from './services/routeCalculator';
import { fetchPlaceGrounding } from './services/groundingService';
import { lookupPlaceForStudy } from './services/studyPlaceService';

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

// Calculate distance in meters between two coordinates (Haversine formula)
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

  // Application Mode: 'navigation' or 'study'
  const [appMode, setAppMode] = useState<AppMode>('navigation');

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

  // Study Mode state (users enter place name only, redirected directly, no routes shown)
  const [studyQuery, setStudyQuery] = useState<string>('');
  const [studyPlace, setStudyPlace] = useState<StudyPlace | null>(null);
  const [isStudyingLoading, setIsStudyingLoading] = useState<boolean>(false);

  // Navigation mode state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Real user GPS live speed in km/h
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [manualSpeedOverride, setManualSpeedOverride] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>(undefined);

  // Real-time Device Tracking position & heading
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

  // Maps Grounding modal state
  const [groundingInsight, setGroundingInsight] = useState<GroundedPlaceInsight | null>(null);
  const [isGroundingLoading, setIsGroundingLoading] = useState<boolean>(false);

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
          setGpsAccuracy(position.coords.accuracy);

          // Update speed if provided
          if (position.coords.speed !== null && !isNaN(position.coords.speed) && position.coords.speed >= 0) {
            setSpeedKmh(Math.round(position.coords.speed * 3.6));
          }

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
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      setUserPosition(KANDIVALI_MUMBAI_LOCATION);
      setOrigin('Current Location (Kandivali West, Mumbai)');
      setDetectedLocationLabel('Kandivali West, Mumbai');
      setIsLocating(false);
    }
  }, []);

  // Run geolocation on mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      handleLocateUser();
    }
  }, [handleLocateUser]);

  // 2. Continuous Real-Time User GPS Tracking & Live Speedometer
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (isCloudProxyCoordinate(lat, lng)) return;

        const updatedPos = { lat, lng };
        setUserPosition(updatedPos);
        setGpsAccuracy(pos.coords.accuracy);

        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading);
        }

        // Live Speedometer calculation directly from device geolocation
        const rawSpeed = pos.coords.speed;
        if (rawSpeed !== null && !isNaN(rawSpeed) && rawSpeed >= 0) {
          const liveKmh = Math.round(rawSpeed * 3.6);
          setSpeedKmh(liveKmh);
        } else {
          // Precise delta calculation based on real displacement over time
          const now = Date.now();
          if (lastPosRef.current && lastTimeRef.current) {
            const distMeters = calculateDistanceMeters(lastPosRef.current, updatedPos);
            const timeSec = (now - lastTimeRef.current) / 1000;
            if (timeSec >= 0.8 && timeSec <= 12) {
              if (distMeters < 1.0) {
                setSpeedKmh(0);
              } else {
                const calculatedSpeedKmh = Math.round((distMeters / timeSec) * 3.6);
                setSpeedKmh(Math.min(160, Math.max(0, calculatedSpeedKmh)));
              }
            }
          }
          lastPosRef.current = updatedPos;
          lastTimeRef.current = now;
        }

        // If actively navigating, auto-advance steps when user arrives within turn radius
        if (isNavigating && activeRoute && activeRoute.steps.length > 0) {
          const currentStepLoc = activeRoute.steps[stepIndex]?.location;
          if (currentStepLoc) {
            const distToStep = calculateDistanceMeters(updatedPos, currentStepLoc);
            if (distToStep < 25 && stepIndex < activeRoute.steps.length - 1) {
              setStepIndex((cur) => {
                const next = cur + 1;
                const nextStepObj = activeRoute.steps[next];
                if (nextStepObj) {
                  speechService.speak(`In ${nextStepObj.distance}, ${nextStepObj.instruction}`);
                }
                return next;
              });
            }
          }
        }
      },
      (err) => {
        console.warn('Real-time watchPosition warning:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isNavigating, activeRoute, stepIndex]);

  // 3. Best Path Finding Route Calculation (Google Directions with Shortest Road Network Path)
  const handleCalculateRoutes = useCallback(async () => {
    if (!destination.trim()) {
      setRoutes([]);
      return;
    }

    setIsCalculating(true);
    // In navigation mode, clear study place so route is prioritized
    setStudyPlace(null);

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
    } catch (err) {
      console.error('Failed to compute route:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [routesLib, userPosition, destination, travelMode]);

  // Recalculate routes when travel mode changes in navigation mode
  useEffect(() => {
    if (appMode === 'navigation' && destination.trim()) {
      handleCalculateRoutes();
    }
  }, [travelMode, appMode]);

  // 4. Study Mode Place Lookup & Direct Redirection (NO ROUTE SHOWN)
  const handleLookupStudyPlace = async (overrideQuery?: string) => {
    const q = (overrideQuery || studyQuery).trim();
    if (!q) return;

    setIsStudyingLoading(true);
    // CRITICAL: Clear all routes so NO route is shown in Study Mode!
    setRoutes([]);
    setIsNavigating(false);

    try {
      const result = await lookupPlaceForStudy(q);
      if (result) {
        setStudyPlace(result);
        speechService.speak(`Redirecting to ${result.name}. Study Mode active.`);
      }
    } catch (err) {
      console.error('Study place lookup error:', err);
    } finally {
      setIsStudyingLoading(false);
    }
  };

  const handleClearStudyPlace = () => {
    setStudyPlace(null);
    setStudyQuery('');
  };

  // Switch between App Modes
  const handleAppModeChange = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'study') {
      // In study mode: clear all routes
      setRoutes([]);
      setIsNavigating(false);
      speechService.cancel();
    } else {
      // Returning to navigation mode: clear study place
      setStudyPlace(null);
      if (destination.trim()) {
        handleCalculateRoutes();
      }
    }
  };

  // Switch from Study Mode to Navigation to travel to the studied place
  const handleNavigateFromStudy = (placeName: string) => {
    setAppMode('navigation');
    setDestination(placeName);
    setStudyPlace(null);
    setTimeout(() => {
      handleCalculateRoutes();
    }, 100);
  };

  // 5. Start navigation (tracks REAL user device movements)
  const handleStartNavigation = () => {
    if (!activeRoute) return;
    setIsNavigating(true);
    setStudyPlace(null);
    setStepIndex(0);
    lastPosRef.current = null;
    lastTimeRef.current = null;

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
    lastPosRef.current = null;
    lastTimeRef.current = null;
    speechService.cancel();
  };

  // 6. Maps Grounding place lookup via Gemini 3.8 Flash
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

  // Dynamic ETA & Remaining route distance calculation
  const currentStep = activeRoute?.steps[stepIndex] || null;
  const nextStep = activeRoute?.steps[stepIndex + 1] || null;

  const remainingSteps = activeRoute ? activeRoute.steps.slice(stepIndex) : [];
  const remainingDistanceMeters =
    remainingSteps.length > 0
      ? remainingSteps.reduce((acc, step) => acc + (step.distanceMeters || 0), 0)
      : activeRoute?.distanceMeters || 0;

  const totalRouteDistance = activeRoute?.distanceMeters || 1;
  const remainingFraction = Math.max(0, Math.min(1, remainingDistanceMeters / totalRouteDistance));
  const remainingDurationSeconds = activeRoute
    ? Math.max(
        30,
        Math.round(
          activeRoute.durationWithTrafficSeconds *
            (remainingFraction || 1 / Math.max(1, activeRoute.steps.length))
        )
      )
    : 0;

  const trafficDelayMinutes = activeRoute
    ? Math.max(0, Math.round((activeRoute.durationWithTrafficSeconds - activeRoute.durationSeconds) / 60))
    : 0;

  // Effective speed to display
  const effectiveSpeed = manualSpeedOverride !== null ? manualSpeedOverride : speedKmh;

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

      {/* Main Map Canvas with Modern AdvancedMarker & Smooth Redirect */}
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
          studyPlace={studyPlace}
        />
      </div>

      {/* Top Destination & Study Mode Search Bar (Pinned at top of screen) */}
      {!isNavigating && (
        <div className="fixed top-0 inset-x-0 z-40">
          <TopSearchBar
            appMode={appMode}
            onAppModeChange={handleAppModeChange}
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
            studyQuery={studyQuery}
            onStudyQueryChange={setStudyQuery}
            onLookupStudyPlace={handleLookupStudyPlace}
            isStudyingLoading={isStudyingLoading}
          />
        </div>
      )}

      {/* Turn-by-Turn Navigation HUD (Displays real-time ETA, traffic delay, and remaining distance) */}
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
            speedKmh={effectiveSpeed}
            remainingDistanceMeters={remainingDistanceMeters}
            remainingDurationSeconds={remainingDurationSeconds}
            trafficSeverity={activeRoute?.trafficSeverity || 'light'}
            trafficDelayMinutes={trafficDelayMinutes}
          />
        </div>
      )}

      {/* Live Speedometer Widget showing actual live user GPS speed */}
      {isNavigating && (
        <div className="fixed left-3 sm:left-4 bottom-28 z-30 pointer-events-auto">
          <SpeedometerWidget
            speedKmh={effectiveSpeed}
            isDarkMode={isDarkMode}
            accuracyMeters={gpsAccuracy}
            isLiveGps={manualSpeedOverride === null}
            onSetUserSpeed={setManualSpeedOverride}
            manualSpeedOverride={manualSpeedOverride}
          />
        </div>
      )}

      {/* Floating Traffic Legend Button/Indicator (Visible when not actively navigating) */}
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

      {/* Bottom Route Summary Drawer (When NOT navigating and routes exist in navigation mode) */}
      {!isNavigating && appMode === 'navigation' && !studyPlace && (
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

      {/* Bottom Study Place Card (When in Study Mode and a place is selected, NO ROUTES SHOWN) */}
      {!isNavigating && studyPlace && (
        <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
          <StudyCard
            studyPlace={studyPlace}
            onClearStudyPlace={handleClearStudyPlace}
            onSwitchMapType={setMapTypeId}
            currentMapType={mapTypeId}
            onExplorePlaceGrounding={handleExplorePlaceGrounding}
            onNavigateHere={handleNavigateFromStudy}
            onZoomInPlace={() => {
              // Trigger map camera to zoom in close to examine place
              setMapTypeId((prev) => (prev === 'roadmap' ? 'satellite' : prev));
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Bottom Navigation HUD (Displayed during active navigation with clean driver controls) */}
      {isNavigating && activeRoute && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <NavigationBottomBar
            activeRoute={activeRoute}
            remainingDistanceMeters={remainingDistanceMeters}
            remainingDurationSeconds={remainingDurationSeconds}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onExitNavigation={handleExitNavigation}
            onRecenter={handleLocateUser}
            isDarkMode={isDarkMode}
            stepIndex={stepIndex}
            totalSteps={activeRoute.steps.length}
          />
        </div>
      )}

      {/* Grounded Place Details Modal */}
      <PlaceDetailsModal
        insight={groundingInsight}
        isLoading={isGroundingLoading}
        onClose={() => setGroundingInsight(null)}
        onNavigateHere={(placeName) => {
          setAppMode('navigation');
          setDestination(placeName);
          setStudyPlace(null);
          setTimeout(() => {
            handleCalculateRoutes();
          }, 100);
        }}
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
