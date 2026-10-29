import React, { useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Plus, Minus, Compass, Crosshair, MapPin, Navigation as NavIcon, GraduationCap } from 'lucide-react';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../utils/mapStyles';
import { RouteOption, StudyPlace } from '../types';

interface MapContainerProps {
  isDarkMode: boolean;
  mapTypeId: string;
  isTrafficEnabled: boolean;
  routes: RouteOption[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  userPosition: google.maps.LatLngLiteral;
  userHeading: number;
  isNavigating: boolean;
  onLocateMe: () => void;
  isLocating: boolean;
  studyPlace?: StudyPlace | null;
}

// Inner layer controller that manages camera transitions, polylines, traffic, and smooth zooming
const MapLayersController: React.FC<{
  isTrafficEnabled: boolean;
  routes: RouteOption[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  userPosition: google.maps.LatLngLiteral;
  isNavigating: boolean;
  isDarkMode: boolean;
  onLocateMe: () => void;
  isLocating: boolean;
  studyPlace?: StudyPlace | null;
}> = ({
  isTrafficEnabled,
  routes,
  selectedRouteIndex,
  onSelectRouteIndex,
  userPosition,
  isNavigating,
  isDarkMode,
  onLocateMe,
  isLocating,
  studyPlace,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const zoomAnimationRef = useRef<number | null>(null);
  const targetZoomRef = useRef<number | null>(null);

  // Enable native fractional zoom and smooth gestures on the Google Map instance
  useEffect(() => {
    if (!map) return;
    map.setOptions({
      isFractionalZoomEnabled: true,
      gestureHandling: 'greedy',
    });
  }, [map]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
      }
    };
  }, []);

  // Smooth camera redirect when Study Place is chosen
  useEffect(() => {
    if (!map || !studyPlace) return;

    if (studyPlace.viewport) {
      map.fitBounds(studyPlace.viewport, 60);
    } else if (studyPlace.location) {
      map.panTo(studyPlace.location);
      smoothZoomTo(16.5, 400);
    }
  }, [map, studyPlace]);

  // 1. Manage real-time traffic layer
  useEffect(() => {
    if (!map) return;

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }

    if (isTrafficEnabled) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, isTrafficEnabled]);

  // 2. Render route polylines along real roads (ONLY when NOT in study mode)
  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // In study mode: NO routes shown
    if (studyPlace || !routes || routes.length === 0) return;

    const newPolylines: google.maps.Polyline[] = [];

    // Render unselected routes in subtle gray
    routes.forEach((route, idx) => {
      if (idx === selectedRouteIndex) return;

      const altPolyline = new google.maps.Polyline({
        path: route.path,
        geodesic: true,
        strokeColor: isDarkMode ? '#475569' : '#94a3b8',
        strokeOpacity: 0.7,
        strokeWeight: 5,
        zIndex: 5,
        map: map,
      });

      altPolyline.addListener('click', () => {
        onSelectRouteIndex(idx);
      });

      newPolylines.push(altPolyline);
    });

    // Render active selected route with glowing road outline
    const selectedRoute = routes[selectedRouteIndex];
    if (selectedRoute && selectedRoute.path.length > 0) {
      // Glow underlay
      const glowPolyline = new google.maps.Polyline({
        path: selectedRoute.path,
        geodesic: true,
        strokeColor: isDarkMode ? '#1e3a8a' : '#93c5fd',
        strokeOpacity: 0.8,
        strokeWeight: 10,
        zIndex: 10,
        map: map,
      });
      newPolylines.push(glowPolyline);

      // Main line
      const mainPolyline = new google.maps.Polyline({
        path: selectedRoute.path,
        geodesic: true,
        strokeColor: selectedRoute.isShortest ? '#10b981' : '#3b82f6',
        strokeOpacity: 0.95,
        strokeWeight: 6,
        zIndex: 15,
        map: map,
      });
      newPolylines.push(mainPolyline);
    }

    polylinesRef.current = newPolylines;

    // Fit camera bounds when route changes and user is not navigating
    if (!isNavigating && selectedRoute && selectedRoute.path.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      selectedRoute.path.forEach((pt) => bounds.extend(pt));
      bounds.extend(userPosition);
      map.fitBounds(bounds, {
        top: 110,
        bottom: 220,
        left: 50,
        right: 50,
      });
    }

    return () => {
      newPolylines.forEach((p) => p.setMap(null));
    };
  }, [map, routes, selectedRouteIndex, isDarkMode, isNavigating, studyPlace]);

  // 3. Keep camera centered on vehicle with smooth tilt during active navigation
  useEffect(() => {
    if (!map || !isNavigating || !userPosition) return;
    map.panTo(userPosition);
    const curZoom = map.getZoom() || 14;
    if (curZoom < 17) {
      smoothZoomTo(17.5, 300);
    }
  }, [map, isNavigating, userPosition]);

  // Smooth Quartic Zoom Animation Engine
  const smoothZoomTo = (targetZoom: number, durationMs: number = 280) => {
    if (!map) return;
    const clampedTarget = Math.min(21, Math.max(2, targetZoom));
    const startZoom = map.getZoom() || 14;
    if (Math.abs(startZoom - clampedTarget) < 0.01) return;

    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }

    targetZoomRef.current = clampedTarget;
    const startTime = performance.now();

    const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = easeOutQuart(progress);
      const currentZoom = startZoom + (clampedTarget - startZoom) * easedProgress;

      map.setZoom(currentZoom);

      if (progress < 1) {
        zoomAnimationRef.current = requestAnimationFrame(animate);
      } else {
        map.setZoom(clampedTarget);
        zoomAnimationRef.current = null;
        targetZoomRef.current = null;
      }
    };

    zoomAnimationRef.current = requestAnimationFrame(animate);
  };

  const handleZoomIn = () => {
    if (!map) return;
    const base = targetZoomRef.current !== null ? targetZoomRef.current : (map.getZoom() || 14);
    smoothZoomTo(Math.floor(base) + 1, 260);
  };

  const handleZoomOut = () => {
    if (!map) return;
    const base = targetZoomRef.current !== null ? targetZoomRef.current : (map.getZoom() || 14);
    smoothZoomTo(Math.ceil(base) - 1, 260);
  };

  const handleResetHeading = () => {
    if (map) {
      map.setHeading(0);
      if (studyPlace) {
        map.panTo(studyPlace.location);
        smoothZoomTo(17, 320);
      } else {
        map.panTo(userPosition);
        smoothZoomTo(16, 320);
      }
    }
  };

  const handleLocateMeSmooth = () => {
    if (map && userPosition) {
      map.panTo(userPosition);
      const curZoom = map.getZoom() || 14;
      if (curZoom < 15) {
        smoothZoomTo(16, 350);
      }
    }
    onLocateMe();
  };

  return (
    <div className="absolute right-3 sm:right-4 bottom-24 z-30 flex flex-col items-center gap-2 pointer-events-auto select-none">
      {/* Re-locate button */}
      <button
        onClick={handleLocateMeSmooth}
        disabled={isLocating}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center justify-center transition-all cursor-pointer ${
          isLocating
            ? 'bg-blue-500 text-white animate-pulse'
            : isDarkMode
            ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200 hover:text-blue-400 hover:bg-neutral-800 active:scale-90'
            : 'bg-white/95 border-neutral-200 text-neutral-800 hover:text-blue-600 hover:bg-neutral-50 active:scale-90'
        }`}
        title="Re-center on current location"
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* Zoom In & Zoom Out button cluster */}
      <div
        className={`flex flex-col rounded-2xl shadow-xl backdrop-blur-xl border overflow-hidden ${
          isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/95 border-neutral-200'
        }`}
      >
        <button
          onClick={handleZoomIn}
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center transition-colors cursor-pointer border-b ${
            isDarkMode
              ? 'border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:text-white'
              : 'border-neutral-200 text-neutral-800 hover:bg-neutral-100'
          }`}
          title="Zoom in (+)"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={handleZoomOut}
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center transition-colors cursor-pointer ${
            isDarkMode
              ? 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
              : 'text-neutral-800 hover:bg-neutral-100'
          }`}
          title="Zoom out (-)"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* Reset Compass Heading */}
      <button
        onClick={handleResetHeading}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center justify-center transition-all cursor-pointer ${
          isDarkMode
            ? 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
            : 'bg-white/95 border-neutral-200 text-neutral-700 hover:bg-neutral-50'
        }`}
        title="Reset North orientation"
      >
        <Compass className="w-4 h-4 text-rose-500" />
      </button>
    </div>
  );
};

export const MapContainer: React.FC<MapContainerProps> = ({
  isDarkMode,
  mapTypeId,
  isTrafficEnabled,
  routes,
  selectedRouteIndex,
  onSelectRouteIndex,
  userPosition,
  userHeading,
  isNavigating,
  onLocateMe,
  isLocating,
  studyPlace,
}) => {
  const activeRoute = !studyPlace ? routes[selectedRouteIndex] || null : null;
  const startCoord = !studyPlace ? activeRoute?.path?.[0] || userPosition : null;
  const endCoord = !studyPlace ? activeRoute?.path?.[activeRoute.path.length - 1] || null : null;

  return (
    <div className="relative w-full h-full">
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={userPosition}
        defaultZoom={14}
        mapId="DEMO_MAP_ID"
        mapTypeId={mapTypeId}
        styles={isDarkMode ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        disableDefaultUI={true}
        gestureHandling="greedy"
        isFractionalZoomEnabled={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Modern AdvancedMarker for Study Mode Place (No routes) */}
        {studyPlace && (
          <AdvancedMarker position={studyPlace.location} title={studyPlace.name}>
            <div className="flex flex-col items-center group cursor-pointer animate-fadeIn">
              <div className="px-3 py-1 rounded-xl bg-neutral-950/90 text-white border border-emerald-500/50 text-xs font-bold shadow-2xl mb-1.5 flex items-center gap-1.5 backdrop-blur-md">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="capitalize truncate max-w-[200px]">{studyPlace.name}</span>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 border-2 border-white shadow-2xl flex items-center justify-center text-white">
                  <MapPin className="w-6 h-6 fill-white/30" />
                </div>
                <span className="absolute w-14 h-14 rounded-2xl bg-emerald-500/30 animate-ping -z-10" />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Modern AdvancedMarker for Starting Location (only in navigation mode) */}
        {startCoord && !studyPlace && (
          <AdvancedMarker position={startCoord} title="Starting Point">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-500/30" />
          </AdvancedMarker>
        )}

        {/* Modern AdvancedMarker for Destination (only in navigation mode) */}
        {endCoord && !studyPlace && (
          <AdvancedMarker position={endCoord} title="Destination">
            <div className="flex flex-col items-center">
              <MapPin className="w-7 h-7 text-rose-500 fill-rose-500 drop-shadow-lg animate-bounce" />
            </div>
          </AdvancedMarker>
        )}

        {/* Modern AdvancedMarker for User Vehicle Location */}
        {userPosition && (
          <AdvancedMarker position={userPosition} title="Your Live Location">
            {isNavigating ? (
              <div
                className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-2xl flex items-center justify-center transition-transform duration-300"
                style={{ transform: `rotate(${userHeading || 0}deg)` }}
              >
                <NavIcon className="w-5 h-5 text-white fill-white" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md z-10" />
                <span className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping" />
              </div>
            )}
          </AdvancedMarker>
        )}

        <MapLayersController
          isTrafficEnabled={isTrafficEnabled}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRouteIndex={onSelectRouteIndex}
          userPosition={userPosition}
          isNavigating={isNavigating}
          isDarkMode={isDarkMode}
          onLocateMe={onLocateMe}
          isLocating={isLocating}
          studyPlace={studyPlace}
        />
      </Map>
    </div>
  );
};
