'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

// Usage in any component with a text input:
// <VoiceButton onResult={(text) => setContent(prev => prev + ' ' + text)} />
// For comment inputs in CommentSection:
// <VoiceButton onResult={(text) => setComment(prev => prev + ' ' + text)} lang="hi-IN" />

interface VoiceButtonProps {
  onResult: (text: string) => void;
  lang?: string; // default 'hi-IN'
  className?: string;
}

// Extend Window for webkit prefix
interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string } }; length: number };
  resultIndex: number;
}

export default function VoiceButton({ onResult, lang = 'hi-IN', className }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  // Check for SSR and browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as Record<string, unknown>).SpeechRecognition ??
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    return recognition;
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, createRecognition, onResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Don't render if not supported
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-200 min-w-[52px] min-h-[52px] w-[52px] h-[52px]',
        isListening
          ? 'bg-red-100 border-2 border-error text-error animate-pulse'
          : 'bg-cream-dark border-2 border-gray-300 text-brown-light hover:border-haldi-gold hover:text-haldi-gold',
        className
      )}
      title={isListening ? 'रिकॉर्डिंग बंद करें — Stop recording' : 'बोलकर लिखें — Speak to type'}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? (
        <span className="relative flex items-center justify-center">
          <span className="absolute w-3 h-3 rounded-full bg-error animate-ping" />
          <span className="relative w-3 h-3 rounded-full bg-error" />
        </span>
      ) : (
        <span className="text-xl">🎤</span>
      )}
    </button>
  );
}
