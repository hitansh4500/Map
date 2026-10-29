// Real road network routing via Google Maps Directions API

export interface ServerRouteResult {
  routes: Array<{
    id: string;
    title: string;
    summary: string;
    distanceMeters: number;
    durationSeconds: number;
    durationWithTrafficSeconds: number;
    trafficSeverity: 'light' | 'moderate' | 'heavy' | 'severe';
    steps: Array<{
      id: string;
      instruction: string;
      distance: string;
      duration: string;
      maneuver?: string;
      location: { lat: number; lng: number };
      distanceMeters: number;
    }>;
    encodedPolyline: string;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }>;
}

export async function computeRealRoadRoute(
  origin: string,
  destination: string,
  travelMode: string
): Promise<ServerRouteResult | null> {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyBKRcSrW9nYvkpbXRxhBh3ri45hdI9tr-s';

  const mode = travelMode.toLowerCase();
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(
    destination
  )}&mode=${mode}&departure_time=now&alternatives=true&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Google Maps Directions HTTP error:', res.status);
      return null;
    }
    const data = await res.json();
    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      console.warn('Google Maps Directions response status:', data.status, data.error_message);
      return null;
    }

    const routes = data.routes.map((r: any, idx: number) => {
      const leg = r.legs?.[0];
      const distMeters = leg?.distance?.value || 0;
      const normalDuration = leg?.duration?.value || 0;
      const trafficDuration = leg?.duration_in_traffic?.value || normalDuration;

      // Calculate traffic severity based on real delay
      let trafficSeverity: 'light' | 'moderate' | 'heavy' | 'severe' = 'light';
      const delayRatio = trafficDuration / (normalDuration || 1);
      if (delayRatio > 1.4) trafficSeverity = 'severe';
      else if (delayRatio > 1.2) trafficSeverity = 'heavy';
      else if (delayRatio > 1.08) trafficSeverity = 'moderate';

      const steps = (leg?.steps || []).map((s: any, sIdx: number) => ({
        id: `step-${idx}-${sIdx}`,
        instruction: s.html_instructions ? s.html_instructions.replace(/<[^>]*>?/gm, ' ') : s.instructions || 'Continue',
        distance: s.distance?.text || `${s.distance?.value || 0} m`,
        duration: s.duration?.text || `${Math.round((s.duration?.value || 60) / 60)} min`,
        maneuver: s.maneuver || 'straight',
        location: {
          lat: s.start_location?.lat || 0,
          lng: s.start_location?.lng || 0,
        },
        distanceMeters: s.distance?.value || 0,
      }));

      const bounds = {
        north: r.bounds?.northeast?.lat || 0,
        south: r.bounds?.southwest?.lat || 0,
        east: r.bounds?.northeast?.lng || 0,
        west: r.bounds?.southwest?.lng || 0,
      };

      return {
        id: `route-${idx}`,
        title: idx === 0 ? 'Optimal Route (Real Road)' : `Alternative Route ${idx}`,
        summary: r.summary || (idx === 0 ? 'via Main Expressway' : 'via Alternate Highway'),
        distanceMeters: distMeters,
        durationSeconds: normalDuration,
        durationWithTrafficSeconds: trafficDuration,
        trafficSeverity,
        steps,
        encodedPolyline: r.overview_polyline?.points || '',
        bounds,
      };
    });

    return { routes };
  } catch (err) {
    console.error('Server error querying Google Directions API:', err);
    return null;
  }
}
