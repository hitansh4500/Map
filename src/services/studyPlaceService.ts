import { StudyPlace } from '../types';

export async function lookupPlaceForStudy(placeQuery: string): Promise<StudyPlace | null> {
  const query = placeQuery.trim();
  if (!query) return null;

  // 1. Try browser Google Maps Geocoder if Google SDK is loaded
  if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: query });
      if (response.results && response.results.length > 0) {
        const top = response.results[0];
        const location = {
          lat: top.geometry.location.lat(),
          lng: top.geometry.location.lng(),
        };

        const viewport = top.geometry.viewport
          ? {
              north: top.geometry.viewport.getNorthEast().lat(),
              south: top.geometry.viewport.getSouthWest().lat(),
              east: top.geometry.viewport.getNorthEast().lng(),
              west: top.geometry.viewport.getSouthWest().lng(),
            }
          : undefined;

        return {
          name: query,
          formattedAddress: top.formatted_address,
          location,
          viewport,
          types: top.types,
        };
      }
    } catch (e) {
      console.warn('Browser geocoder warning, falling back to server proxy:', e);
    }
  }

  // 2. Fallback to server geocoding endpoint
  try {
    const res = await fetch('/api/geocode-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const data: StudyPlace = await res.json();
      return data;
    }
  } catch (err) {
    console.error('Failed to lookup place for study mode:', err);
  }

  return null;
}
