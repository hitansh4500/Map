// Speech synthesis utility for turn-by-turn navigation guidance

class SpeechEngine {
  private isMuted: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Look for clear English voice (Google US English, Samantha, Daniel, Natural)
    this.preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public cancel() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public cleanHtml(text: string): string {
    return text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
  }

  public speak(instruction: string, priority: 'normal' | 'urgent' = 'normal') {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const cleanText = this.cleanHtml(instruction).trim();
    if (!cleanText) return;

    if (priority === 'urgent') {
      this.cancel();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.02; // natural conversational pacing
      utterance.pitch = 1.0;
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis could not speak:', e);
    }
  }
}

export const speechService = new SpeechEngine();
