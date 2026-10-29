import { GroundedPlaceInsight } from '../types';

export async function fetchPlaceGrounding(placeQuery: string): Promise<GroundedPlaceInsight | null> {
  try {
    const res = await fetch('/api/maps-grounding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Provide up-to-date Google Maps details, traffic vibe, operating status, popular highlights, and visitor tips for "${placeQuery}". Include coordinates or landmark address if available.`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    const text: string = data.text || '';

    // Extract grounding sources if provided in metadata
    const sources: Array<{ title: string; url: string }> = [];
    const groundingMetadata = data.groundingMetadata as {
      groundingChunks?: Array<{ web?: { title?: string; uri?: string }; maps?: { title?: string; uri?: string } }>;
    } | null;

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.maps?.uri && chunk.maps?.title) {
          sources.push({ title: chunk.maps.title, url: chunk.maps.uri });
        } else if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, url: chunk.web.uri });
        }
      }
    }

    // Parse highlights
    const highlights: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('*') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) && trimmed.length > 5 && trimmed.length < 140) {
        highlights.push(trimmed.replace(/^[-*•\d.]+\s*/, ''));
      }
    }

    return {
      placeName: placeQuery,
      summary: text,
      highlights: highlights.slice(0, 4),
      groundingSources: sources.slice(0, 3),
    };
  } catch (error) {
    console.error('Failed to fetch Maps Grounding info:', error);
    return null;
  }
}
