import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Mic,
  Radio,
  Navigation,
  Volume2,
  VolumeX,
  MapPin,
  Star,
  RotateCcw,
  Utensils,
  Coffee,
  ExternalLink,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { voiceRecognition } from '../utils/speechRecognition';
import { speechService } from '../utils/speech';

export interface SuggestedPlace {
  name: string;
  category?: string;
  rating?: string;
  address?: string;
  highlight?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedPlaces?: SuggestedPlace[];
  groundingSources?: Array<{ title: string; url: string }>;
  timestamp: Date;
}

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHere: (placeName: string) => void;
  locationAddress: string;
  isDarkMode: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Dine-in Restaurants', icon: Utensils, query: 'Top dine-in restaurants with good ambiance nearby' },
  { label: 'Cozy Cafes', icon: Coffee, query: 'Best cafes for coffee and working nearby' },
  { label: 'Pure Veg Spots', icon: Star, query: 'Famous pure vegetarian restaurants nearby' },
  { label: 'Street Food Hubs', icon: Compass, query: 'Popular street food places and chaat spots nearby' },
  { label: 'Late Night Food', icon: Sparkles, query: 'Late night dine-in or food places open right now' },
];

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({
  isOpen,
  onClose,
  onNavigateHere,
  locationAddress,
  isDarkMode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I'm your **Google Maps AI Concierge**. I can find top-rated dine-in restaurants, cozy cafes, street food gems, and sightseeing spots near **${locationAddress || 'your location'}**.\n\nAsk me anything or tap one of the recommendations below, and you can start route navigation in 1 click!`,
      suggestedPlaces: [
        {
          name: 'Prithvi Café, Juhu',
          category: 'Café & Bistro',
          rating: '4.6 ★',
          address: 'Juhu Church Rd, near Vile Parle / Juhu',
          highlight: 'Open-air ambiance, Irish coffee, and cutting chai',
        },
        {
          name: 'Shiv Sagar, Vile Parle West',
          category: 'Pure Veg / Multi-Cuisine',
          rating: '4.3 ★',
          address: 'Station Rd, Vile Parle West, Mumbai',
          highlight: 'Legendary pav bhaji, South Indian & sizzlers',
        },
        {
          name: 'The Village, Kandivali West',
          category: 'Traditional Buffet',
          rating: '4.2 ★',
          address: 'Raghuleela Mall, Kandivali West, Mumbai',
          highlight: 'Authentic Indian village thali experience',
        },
      ],
      timestamp: new Date(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  // Clean up voice recognition
  useEffect(() => {
    return () => {
      voiceRecognition.stopListening();
    };
  }, []);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setInputMessage('');
    if (isVoiceActive) {
      voiceRecognition.stopListening();
      setIsVoiceActive(false);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          locationAddress: locationAddress || 'Kandivali West, Mumbai',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI assistant response');
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here are some places for you.',
        suggestedPlaces: data.suggestedPlaces,
        groundingSources: data.groundingSources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Voice read aloud if toggled
      if (autoSpeakReplies && data.reply) {
        // Strip markdown stars for speech
        const speechText = data.reply.replace(/\*\*/g, '').replace(/[#•\-]/g, '');
        speechService.speak(speechText.slice(0, 200));
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an issue: ${error.message || 'Please check your connection and try again.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (isVoiceActive) {
      voiceRecognition.stopListening();
      setIsVoiceActive(false);
      return;
    }

    voiceRecognition.startListening({
      onStart: () => setIsVoiceActive(true),
      onResult: (transcript, isFinal) => {
        setInputMessage(transcript);
        if (isFinal) {
          setIsVoiceActive(false);
          handleSendMessage(transcript);
        }
      },
      onError: () => setIsVoiceActive(false),
      onEnd: () => setIsVoiceActive(false),
    });
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. What kind of food or places are you looking for near **${locationAddress || 'your current area'}**?`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSpeakPlace = (place: SuggestedPlace) => {
    const text = `${place.name}. ${place.category || ''}. Rating ${place.rating || ''}. ${place.highlight || place.address || ''}`;
    speechService.speak(text, 'urgent');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Container */}
      <div
        className={`w-full max-w-2xl h-[92vh] sm:h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-300 ${
          isDarkMode
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-black/90'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">Maps AI Concierge</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 truncate max-w-xs sm:max-w-md">
                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                <span className="truncate">{locationAddress || 'Current Location'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto speech toggle */}
            <button
              onClick={() => setAutoSpeakReplies(!autoSpeakReplies)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                autoSpeakReplies
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title={autoSpeakReplies ? 'Voice playback enabled' : 'Enable voice responses'}
            >
              {autoSpeakReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clear chat history */}
            <button
              onClick={handleClearChat}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title="Clear chat history"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close modal */}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-neutral-800 text-neutral-300 hover:text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:text-black'
              }`}
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div
          className={`px-3 py-2 border-b overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0 ${
            isDarkMode ? 'bg-neutral-950/40 border-neutral-800/80' : 'bg-neutral-50/50 border-neutral-200/80'
          }`}
        >
          <span className="text-[11px] font-semibold text-neutral-400 shrink-0 uppercase tracking-wider pl-1">
            Quick Ask:
          </span>
          {QUICK_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleSendMessage(item.query)}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                  isDarkMode
                    ? 'bg-neutral-800/80 border-neutral-700 hover:bg-neutral-700 text-neutral-200 hover:text-white'
                    : 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700 hover:text-black shadow-sm'
                }`}
              >
                <Icon className="w-3 h-3 text-blue-500" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                    : isDarkMode
                    ? 'bg-neutral-800/90 border border-neutral-700/60 text-neutral-100 rounded-tl-none shadow-md'
                    : 'bg-neutral-100 border border-neutral-200 text-neutral-900 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Formatted Text Message */}
                <div className="whitespace-pre-line space-y-1.5">
                  {msg.content.split('\n').map((line, idx) => {
                    if (!line.trim()) return <div key={idx} className="h-1" />;
                    // Basic bold text rendering
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={idx} className="leading-snug">
                        {parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <strong key={pIdx} className="font-semibold text-blue-400 dark:text-blue-300">
                                {part.slice(2, -2)}
                              </strong>
                            );
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>

                {/* Grounding Sources */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-700/40 text-[11px] flex flex-wrap gap-1.5 items-center">
                    <span className="text-neutral-400 font-medium">Maps Grounding:</span>
                    {msg.groundingSources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:underline"
                      >
                        <span>{source.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Suggested Places Cards (1-Click Navigate Here) */}
              {msg.suggestedPlaces && msg.suggestedPlaces.length > 0 && (
                <div className="mt-2.5 w-full max-w-[94%] sm:max-w-[90%] grid grid-cols-1 gap-2">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Recommended Places (Tap to Navigate)</span>
                  </div>

                  {msg.suggestedPlaces.map((place, pIdx) => (
                    <div
                      key={pIdx}
                      className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm hover:shadow-md ${
                        isDarkMode
                          ? 'bg-neutral-950/80 border-neutral-800 hover:border-blue-500/50'
                          : 'bg-white border-neutral-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-neutral-100 dark:text-neutral-100 truncate">
                            {place.name}
                          </h4>
                          {place.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium border border-blue-500/20">
                              {place.category}
                            </span>
                          )}
                          {place.rating && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                              {place.rating}
                            </span>
                          )}
                        </div>

                        {place.highlight && (
                          <p className="text-[11px] text-neutral-400 line-clamp-1">{place.highlight}</p>
                        )}
                        {place.address && (
                          <p className="text-[10px] text-neutral-500 line-clamp-1 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                            <span>{place.address}</span>
                          </p>
                        )}
                      </div>

                      {/* Action Buttons: Navigate Here & Speak */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleSpeakPlace(place)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                          title="Listen to details"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            onNavigateHere(place.name);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 fill-white/20" />
                          <span>Navigate Here</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-neutral-500 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2 animate-fadeIn">
              <div
                className={`px-4 py-3 rounded-2xl rounded-tl-none border text-xs flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-neutral-800/80 border-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span>Searching Google Maps & Gemini 3.8 Flash for recommendations...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Listening Status Banner */}
        {isVoiceActive && (
          <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/30 text-rose-300 flex items-center justify-between text-xs animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-semibold text-rose-200">Listening to your voice:</span>
              <span className="truncate">{inputMessage || 'Speak restaurant or place query now...'}</span>
            </div>
            <button
              onClick={handleToggleVoice}
              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-rose-100 font-semibold cursor-pointer shrink-0 ml-2"
            >
              Done
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div
          className={`p-3 sm:p-4 border-t flex items-center gap-2 shrink-0 ${
            isDarkMode ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask for dine-in restaurants, cafes, street food..."
              disabled={isLoading}
              className={`w-full pl-3.5 pr-10 py-2.5 rounded-2xl text-xs sm:text-sm font-medium outline-none border transition-colors ${
                isVoiceActive
                  ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/10'
                  : isDarkMode
                  ? 'bg-neutral-900 border-neutral-700/80 text-neutral-100 placeholder-neutral-500 focus:border-blue-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 shadow-inner'
              }`}
            />

            {/* Voice Mic inside input */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`absolute right-2 p-1.5 rounded-xl transition-all cursor-pointer ${
                isVoiceActive
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/50'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-rose-400 hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-rose-600 hover:bg-neutral-100'
              }`}
              title="Voice input"
            >
              {isVoiceActive ? <Radio className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer ${
              inputMessage.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95'
                : 'bg-neutral-800 text-neutral-500 opacity-50 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
