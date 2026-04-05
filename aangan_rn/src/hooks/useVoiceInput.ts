import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useLanguageStore } from '../stores/languageStore';

interface UseVoiceInputReturn {
  startListening: () => Promise<void>;
  stopListening: () => void;
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}

const SILENCE_TIMEOUT_MS = 15_000;

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const language = useLanguageStore((s) => s.language);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      ExpoSpeechRecognitionModule.stop();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  // Listen for partial / final results
  useSpeechRecognitionEvent('result', (event) => {
    const topResult = event.results[0];
    if (!topResult) return;

    if (event.isFinal) {
      setTranscript(topResult.transcript);
      setPartialTranscript('');
    } else {
      setPartialTranscript(topResult.transcript);
      // Reset silence timer on every partial result (user is still speaking)
      resetSilenceTimer();
    }
  });

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
    resetSilenceTimer();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    clearSilenceTimer();
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message || event.error);
    setIsListening(false);
    clearSilenceTimer();
  });

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setPartialTranscript('');

      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission not granted');
        return;
      }

      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(message);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Already stopped – ignore
    }
  }, [clearSilenceTimer]);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    partialTranscript,
    error,
  };
}
