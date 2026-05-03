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

interface SpeechRecognitionErrorEvent {
  error: string; // 'not-allowed' | 'service-not-allowed' | 'language-not-supported' | 'no-speech' | 'audio-capture' | 'network' | 'aborted'
  message?: string;
}

// iOS Safari "supports" webkitSpeechRecognition by exposing the constructor
// but every recognition.start() fails with `network` (no actual on-device
// recognizer). Detect the platform up-front so we can either hide the button
// or show a helpful message instead of leaving Dadi tapping a dead mic.
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

export default function VoiceButton({ onResult, lang = 'hi-IN', className }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  // Auto-clear the inline error message after 4s so it doesn't pile up.
  useEffect(() => {
    if (!errorMsg) return;
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 4000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [errorMsg]);

  // Check for SSR and browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as Record<string, unknown>).SpeechRecognition ??
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
      // iOS Safari exposes the API but it doesn't actually work — hide the
      // button there rather than show a permanently-broken mic. Users can
      // type in Hindi via the system keyboard's voice input instead.
      setIsSupported(!!SpeechRecognition && !isIOSSafari());
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
    if (!recognition) {
      setErrorMsg('आवाज़ इनपुट इस ब्राउज़र में नहीं चलता');
      return;
    }

    recognitionRef.current = recognition;
    // Local flags closed over by the handlers below. We can't read the
    // `errorMsg` React state from inside `onend` because the closure captures
    // its initial null value — `onend` would then always overwrite an error
    // message that `onerror` just set. Plain locals avoid that race.
    let resultReceived = false;
    let errorSet = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        resultReceived = true;
        setErrorMsg(null);
        onResult(transcript.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // If we ended without ever firing onresult or onerror, surface a hint —
      // silent ends were the original "voice symbol does nothing" complaint.
      if (!resultReceived && !errorSet) {
        setErrorMsg('कुछ सुनाई नहीं दिया — फिर बोलें');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      errorSet = true;
      // Map the spec'd error codes to Dadi-friendly Hindi messages.
      const msg = (() => {
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            return 'माइक की अनुमति दें — Allow microphone access';
          case 'language-not-supported':
            return 'इस ब्राउज़र में हिंदी नहीं चलती — Try Chrome on Android';
          case 'no-speech':
            return 'कुछ सुनाई नहीं दिया — फिर बोलें';
          case 'audio-capture':
            return 'माइक नहीं मिला — Check device microphone';
          case 'network':
            return 'इंटरनेट ज़रूरी है आवाज़ के लिए';
          case 'aborted':
            return null; // user cancelled — no message needed
          default:
            return 'आवाज़ इनपुट काम नहीं किया';
        }
      })();
      if (msg) setErrorMsg(msg);
    };

    try {
      recognition.start();
      setErrorMsg(null);
      setIsListening(true);
    } catch (e) {
      // .start() throws "InvalidStateError" if already started, or various
      // SecurityErrors in restrictive contexts (e.g. file:// or non-HTTPS).
      setIsListening(false);
      errorSet = true;
      setErrorMsg(e instanceof Error && e.name === 'NotAllowedError'
        ? 'माइक की अनुमति दें'
        : 'आवाज़ इनपुट शुरू नहीं हुआ');
    }
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
    <div className="relative inline-flex">
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
      {errorMsg && (
        <div
          role="alert"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 whitespace-nowrap rounded-lg bg-error text-white text-xs font-body px-3 py-1.5 shadow-md max-w-[240px] text-center"
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
