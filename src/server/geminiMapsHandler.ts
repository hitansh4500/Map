import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export interface MapsGroundingResult {
  text: string;
  groundingMetadata?: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  suggestedPlaces?: Array<{
    name: string;
    category?: string;
    rating?: string;
    address?: string;
    highlight?: string;
  }>;
  groundingSources?: Array<{ title: string; url: string }>;
}

export async function queryMapsGrounding(prompt: string): Promise<MapsGroundingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      text: `Information for "${prompt}". Connect your Gemini API Key in Settings > Secrets to enable live Gemini 3.8 Flash Maps Grounding.`,
      groundingMetadata: null,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    return {
      text: response.text || 'No description provided.',
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Gemini Maps Grounding error:', err);
    return {
      text: `Unable to retrieve live Maps Grounding data: ${err.message || 'Server error'}.`,
      groundingMetadata: null,
    };
  }
}

// Fallback recommendations if API key is not configured yet
function getCuratedDineInFallback(query: string, locationStr: string): AssistantChatResponse {
  const q = query.toLowerCase();
  const loc = locationStr.toLowerCase();

  if (loc.includes('vile parle') || q.includes('vile parle') || loc.includes('mumbai') || loc.includes('kandivali')) {
    return {
      reply: `Here are top-rated dine-in and food recommendations near **${locationStr || 'your area in Mumbai'}**:\n\n1. **Prithvi Café (Juhu / Vile Parle)** — Iconic open-air bohemian cafe famous for Irish coffee, stuffed parathas, and vibrant cultural ambiance.\n2. **Shiv Sagar (Vile Parle West)** — Excellent multi-cuisine vegetarian restaurant known for pav bhaji, South Indian delicacies, and sizzlers.\n3. **Gajalee Coastal Seafood (Vile Parle East)** — Award-winning coastal dining spot famous for tandoori crab, bombil fry, and sol kadhi.\n4. **The Village (Kandivali West)** — Immersive Indian theme restaurant offering authentic traditional thalis with live folk entertainment.\n5. **Amar Juice Centre (Vile Parle)** — Famous late-night institution renowned for pav bhaji, dosas, and fresh seasonal fruit juices.`,
      suggestedPlaces: [
        {
          name: 'Prithvi Café, Juhu',
          category: 'Café & Bistro',
          rating: '4.6 ★',
          address: '20 Janki Kutir, Juhu Church Rd, near Vile Parle',
          highlight: 'Open-air atmosphere, Irish coffee, cultural hub',
        },
        {
          name: 'Shiv Sagar, Vile Parle West',
          category: 'Pure Veg / Casual Dining',
          rating: '4.3 ★',
          address: 'Station Rd, Vile Parle West, Mumbai',
          highlight: 'Legendary pav bhaji, South Indian & Chinese',
        },
        {
          name: 'Gajalee, Vile Parle East',
          category: 'Coastal Seafood Dine-in',
          rating: '4.5 ★',
          address: 'Hanuman Rd, Vile Parle East, Mumbai',
          highlight: 'Tandoori Crab, Butter Garlic Prawns, Sol Kadhi',
        },
        {
          name: 'The Village, Kandivali West',
          category: 'Traditional Buffet',
          rating: '4.2 ★',
          address: 'Raghuleela Mall, Kandivali West, Mumbai',
          highlight: 'Authentic village buffet thali with live shows',
        },
      ],
    };
  }

  return {
    reply: `Here are popular places and dine-in spots near **${locationStr || 'your current location'}**:\n\n• **Bistro Delight** — Fine dining with outdoor patio seating and artisanal coffee.\n• **Urban Spices** — Contemporary family restaurant with regional specialties.\n• **Green Garden Café** — Cozy spot for breakfast, brunch, and artisan bakes.`,
    suggestedPlaces: [
      {
        name: 'Bistro Delight',
        category: 'Bistro & Grill',
        rating: '4.5 ★',
        highlight: 'Fresh artisan coffee & brunch',
      },
      {
        name: 'Urban Spices',
        category: 'Casual Dining',
        rating: '4.4 ★',
        highlight: 'Signature regional curries & breads',
      },
    ],
  };
}

export async function queryAssistantChat(
  message: string,
  history: ChatMessage[] = [],
  locationAddress: string = 'Kandivali West, Mumbai'
): Promise<AssistantChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return getCuratedDineInFallback(message, locationAddress);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Format conversation history for prompt
    const contextPrompt = `You are the Google Maps Assistant. The user is currently located at: "${locationAddress}".
Your task is to provide helpful, conversational recommendations for places to visit, dine-in restaurants, cafes, takeout options, street food, sightseeing, or entertainment based on what the user asks.

User query: "${message}"

Give a friendly, concise, and structured reply. Mention 3 to 4 specific places with cuisine/ambiance details, address if known, and why people love them.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const replyText = response.text || 'Here are some recommendations.';
    const sources: Array<{ title: string; url: string }> = [];

    // Extract grounding sources
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as {
      groundingChunks?: Array<{ maps?: { title?: string; uri?: string }; web?: { title?: string; uri?: string } }>;
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

    // Extract place names from bold text in reply e.g. **Place Name**
    const suggestedPlaces: Array<{ name: string; highlight?: string }> = [];
    const boldMatches = replyText.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
      boldMatches.slice(0, 4).forEach((match) => {
        const cleanName = match.replace(/\*\*/g, '').trim();
        if (cleanName.length > 2 && !cleanName.toLowerCase().includes('recommend') && !cleanName.toLowerCase().includes('option')) {
          suggestedPlaces.push({
            name: cleanName,
            highlight: 'Recommended by Google Maps AI Assistant',
          });
        }
      });
    }

    return {
      reply: replyText,
      suggestedPlaces: suggestedPlaces.length > 0 ? suggestedPlaces : undefined,
      groundingSources: sources.slice(0, 3),
    };
  } catch (error: unknown) {
    console.error('Error in assistant chat:', error);
    return getCuratedDineInFallback(message, locationAddress);
  }
}
