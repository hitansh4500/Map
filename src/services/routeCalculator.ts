import { NavigationStep, RouteOption, TrafficSeverity, TravelMode } from '../types';

// Standard polyline decoder function (decodes Google Maps encoded polyline into exact LatLng array)
export function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

// Reverse geocode coordinates to human-readable address
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number
): Promise<{ formattedAddress: string; neighborhood: string; city: string; country: string }> {
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        const topResult = response.results[0];
        let neighborhood = '';
        let city = '';
        let country = '';

        for (const comp of topResult.address_components) {
          if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
            neighborhood = comp.long_name;
          }
          if (comp.types.includes('locality')) {
            city = comp.long_name;
          }
          if (comp.types.includes('country')) {
            country = comp.long_name;
          }
        }

        const friendly = neighborhood && city ? `${neighborhood}, ${city}` : topResult.formatted_address;
        return {
          formattedAddress: friendly,
          neighborhood: neighborhood || city,
          city: city,
          country: country,
        };
      }
    } catch (e) {
      console.warn('Google Maps geocoder error:', e);
    }
  }

  return {
    formattedAddress: 'Kandivali West, Mumbai',
    neighborhood: 'Kandivali West',
    city: 'Mumbai',
    country: 'India',
  };
}

// Compute routes using real road network (server API via Google Directions)
export async function computeOptimalRoutes(
  routesLib: any,
  origin: string | google.maps.LatLngLiteral,
  destination: string | google.maps.LatLngLiteral,
  travelMode: TravelMode,
  userCurrentCoord?: google.maps.LatLngLiteral | null
): Promise<RouteOption[]> {
  // Format origin string
  let originStr = '';
  if (typeof origin === 'object' && origin !== null && 'lat' in origin && 'lng' in origin) {
    originStr = `${origin.lat},${origin.lng}`;
  } else if (typeof origin === 'string') {
    originStr = origin.trim();
  }
  if (!originStr && userCurrentCoord) {
    originStr = `${userCurrentCoord.lat},${userCurrentCoord.lng}`;
  }

  // Format destination string
  let destStr = '';
  if (typeof destination === 'object' && destination !== null && 'lat' in destination && 'lng' in destination) {
    destStr = `${destination.lat},${destination.lng}`;
  } else if (typeof destination === 'string') {
    destStr = destination.trim();
  }

  if (!originStr || !destStr) return [];

  // Query real Google Directions API via server proxy for real highway and city road geometry
  try {
    const res = await fetch('/api/compute-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: originStr,
        destination: destStr,
        travelMode,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes.map((r: any) => {
          const path = r.encodedPolyline ? decodePolyline(r.encodedPolyline) : [];
          return {
            id: r.id,
            title: r.title,
            summary: r.summary,
            distanceMeters: r.distanceMeters,
            durationSeconds: r.durationSeconds,
            durationWithTrafficSeconds: r.durationWithTrafficSeconds,
            trafficSeverity: r.trafficSeverity as TrafficSeverity,
            steps: r.steps,
            path,
            viewport: r.bounds,
            isShortest: r.isShortest,
            isFastest: r.isFastest,
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to compute real road route:', err);
  }

  return [];
}
