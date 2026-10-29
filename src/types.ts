export type TravelMode = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING';

export type TrafficSeverity = 'light' | 'moderate' | 'heavy' | 'severe';

export interface TrafficInfo {
  severity: TrafficSeverity;
  label: string;
  delayMinutes: number;
  color: string;
}

export interface NavigationStep {
  id: string;
  instruction: string;
  distance: string;
  duration: string;
  durationSeconds?: number;
  maneuver?: string;
  location: google.maps.LatLngLiteral;
  distanceMeters: number;
}

export interface RouteOption {
  id: string;
  title: string;
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
  durationWithTrafficSeconds: number;
  trafficSeverity: TrafficSeverity;
  steps: NavigationStep[];
  path: google.maps.LatLngLiteral[];
  viewport?: google.maps.LatLngBoundsLiteral;
  warnings?: string[];
  isShortest?: boolean;
  isFastest?: boolean;
}

export type NavState = 'idle' | 'selecting_route' | 'navigating' | 'rerouting' | 'arrived';

export interface PlaceSuggestion {
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  category?: string;
  rating?: number;
  userRatingsTotal?: number;
}

export interface GroundedPlaceInsight {
  placeName: string;
  summary: string;
  address?: string;
  trafficVibe?: string;
  bestTimeToVisit?: string;
  highlights?: string[];
  groundingSources?: Array<{
    title: string;
    url: string;
  }>;
}

export type AppMode = 'navigation' | 'study';

export interface StudyPlace {
  name: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  viewport?: google.maps.LatLngBoundsLiteral;
  types?: string[];
}

