// Real road network routing via Google Maps Directions API with Best Path Finding for Shortest Route

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
      durationSeconds: number;
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
    isShortest?: boolean;
    isFastest?: boolean;
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
  )}&mode=${mode}&departure_time=now&alternatives=true&traffic_model=best_guess&key=${apiKey}`;

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

    // Parse all returned road routes
    const rawRoutes = data.routes.map((r: any, idx: number) => {
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
        instruction: s.html_instructions
          ? s.html_instructions.replace(/<[^>]*>?/gm, ' ')
          : s.instructions || 'Continue',
        distance: s.distance?.text || `${s.distance?.value || 0} m`,
        duration: s.duration?.text || `${Math.round((s.duration?.value || 60) / 60)} min`,
        durationSeconds: s.duration?.value || 60,
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
        originalIndex: idx,
        summary: r.summary || `Road Segment ${idx + 1}`,
        distanceMeters: distMeters,
        durationSeconds: normalDuration,
        durationWithTrafficSeconds: trafficDuration,
        trafficSeverity,
        steps,
        encodedPolyline: r.overview_polyline?.points || '',
        bounds,
      };
    });

    if (rawRoutes.length === 0) return { routes: [] };

    // Best path finding evaluation:
    // 1. Identify minimum road distance
    const minDistanceMeters = Math.min(...rawRoutes.map((r: any) => r.distanceMeters));
    // 2. Identify fastest duration with live traffic
    const minDurationSeconds = Math.min(...rawRoutes.map((r: any) => r.durationWithTrafficSeconds));

    // Sort routes by distance ascending so the shortest route is always chosen first
    const sorted = [...rawRoutes].sort((a, b) => a.distanceMeters - b.distanceMeters);

    const routes = sorted.map((r, rankIdx) => {
      const isShortest = r.distanceMeters === minDistanceMeters;
      const isFastest = r.durationWithTrafficSeconds === minDurationSeconds;

      let title = '';
      if (isShortest && isFastest) {
        title = 'Best Route (Shortest & Fastest)';
      } else if (isShortest) {
        title = `Shortest Route (${(r.distanceMeters / 1000).toFixed(1)} km)`;
      } else if (isFastest) {
        title = `Fastest Route (${Math.round(r.durationWithTrafficSeconds / 60)} min)`;
      } else {
        title = `Alternative Route ${rankIdx + 1} (${(r.distanceMeters / 1000).toFixed(1)} km)`;
      }

      return {
        id: `route-${r.originalIndex}`,
        title,
        summary: r.summary,
        distanceMeters: r.distanceMeters,
        durationSeconds: r.durationSeconds,
        durationWithTrafficSeconds: r.durationWithTrafficSeconds,
        trafficSeverity: r.trafficSeverity,
        steps: r.steps,
        encodedPolyline: r.encodedPolyline,
        bounds: r.bounds,
        isShortest,
        isFastest,
      };
    });

    return { routes };
  } catch (err) {
    console.error('Server error querying Google Directions API:', err);
    return null;
  }
}
