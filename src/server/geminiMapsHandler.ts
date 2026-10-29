import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export interface MapsGroundingResult {
  text: string;
  groundingMetadata?: unknown;
}

export async function queryMapsGrounding(prompt: string): Promise<MapsGroundingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      text: `Maps Grounding information for: "${prompt}". Connect your Gemini API Key in Settings > Secrets to enable live Gemini 3.8 Flash Maps Grounding.`,
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
