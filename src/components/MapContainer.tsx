import React, { useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Plus, Minus, Compass, Crosshair, MapPin, Navigation as NavIcon } from 'lucide-react';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../utils/mapStyles';
import { RouteOption } from '../types';

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
}

// Inner layer controller that manages polylines and traffic layer
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
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

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

  // 2. Render route polylines along real roads
  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!routes || routes.length === 0) return;

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
        strokeColor: isDarkMode ? '#38bdf8' : '#2563eb',
        strokeOpacity: 1.0,
        strokeWeight: 6,
        zIndex: 12,
        map: map,
      });
      newPolylines.push(mainPolyline);

      // Auto-fit bounds so BOTH current location and destination are visible together!
      if (!isNavigating) {
        const bounds = new google.maps.LatLngBounds();
        selectedRoute.path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { top: 90, right: 70, bottom: 100, left: 70 });
      }
    }

    polylinesRef.current = newPolylines;

    return () => {
      newPolylines.forEach((p) => p.setMap(null));
    };
  }, [map, routes, selectedRouteIndex, isDarkMode, isNavigating, onSelectRouteIndex]);

  // Pan to user location when navigating
  useEffect(() => {
    if (map && isNavigating && userPosition) {
      map.panTo(userPosition);
    }
  }, [map, userPosition, isNavigating]);

  // Zoom handlers
  const handleZoomIn = () => {
    if (map) {
      const curZoom = map.getZoom() || 14;
      map.setZoom(curZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const curZoom = map.getZoom() || 14;
      map.setZoom(curZoom - 1);
    }
  };

  const handleResetHeading = () => {
    if (map) {
      map.setHeading(0);
      map.panTo(userPosition);
    }
  };

  return (
    <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-2 pointer-events-auto select-none">
      {/* Re-locate button */}
      <button
        onClick={onLocateMe}
        disabled={isLocating}
        className={`w-11 h-11 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center justify-center transition-all cursor-pointer ${
          isLocating
            ? 'bg-blue-500 text-white animate-pulse'
            : isDarkMode
            ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200 hover:text-blue-400 hover:bg-neutral-800'
            : 'bg-white/95 border-neutral-200 text-neutral-800 hover:text-blue-600 hover:bg-neutral-50'
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
          className={`w-11 h-11 flex items-center justify-center transition-colors cursor-pointer border-b ${
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
          className={`w-11 h-11 flex items-center justify-center transition-colors cursor-pointer ${
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
        className={`w-10 h-10 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center justify-center transition-all cursor-pointer ${
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
}) => {
  const activeRoute = routes[selectedRouteIndex] || null;
  const startCoord = activeRoute?.path?.[0] || userPosition;
  const endCoord = activeRoute?.path?.[activeRoute.path.length - 1] || null;

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
        // MANDATORY: Use gmp_mcp_codeassist_v1_aistudio attribution ID
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Modern AdvancedMarker for Starting Location */}
        {startCoord && (
          <AdvancedMarker position={startCoord} title="Starting Point">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-500/30" />
          </AdvancedMarker>
        )}

        {/* Modern AdvancedMarker for Destination */}
        {endCoord && (
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
        />
      </Map>
    </div>
  );
};
