import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { useLanguageStore } from '../stores/languageStore';
import {
  parseCommand,
  getCommandFeedback,
  type VoiceCommand,
} from '../services/voiceCommandParser';

export interface VoiceCommandResult {
  /** Whether a command was matched */
  matched: boolean;
  /** The matched command details */
  command?: VoiceCommand;
  /** Confirmation text that was spoken */
  confirmation?: string;
}

interface UseVoiceCommandsReturn {
  startCommandMode: () => Promise<void>;
  stopCommandMode: () => void;
  isCommandMode: boolean;
  lastTranscript: string;
  commandResult: VoiceCommandResult | null;
}

export function useVoiceCommands(): UseVoiceCommandsReturn {
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [commandResult, setCommandResult] = useState<VoiceCommandResult | null>(
    null,
  );

  const language = useLanguageStore((s) => s.language);
  const isActiveRef = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (!isActiveRef.current) return;

    const topResult = event.results[0];
    if (!topResult) return;

    if (event.isFinal) {
      const text = topResult.transcript;
      setLastTranscript(text);

      const matched = parseCommand(text, language);
      if (matched) {
        const confirmation = getCommandFeedback(matched, language);
        setCommandResult({ matched: true, command: matched, confirmation });

        Speech.speak(confirmation, {
          language: language === 'hi' ? 'hi-IN' : 'en-IN',
        });
      } else {
        setCommandResult({ matched: false });
      }
    }
  });

  useSpeechRecognitionEvent('start', () => {
    if (isActiveRef.current) {
      setIsCommandMode(true);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // If still in command mode, restart recognition for continuous listening
    if (isActiveRef.current) {
      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
      try {
        ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults: false,
          continuous: false,
          maxAlternatives: 1,
        });
      } catch {
        // If restart fails, exit command mode
        isActiveRef.current = false;
        setIsCommandMode(false);
      }
    } else {
      setIsCommandMode(false);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    // On "no-speech" just restart if still in command mode
    if (event.error === 'no-speech' && isActiveRef.current) {
      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
      try {
        ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults: false,
          continuous: false,
          maxAlternatives: 1,
        });
      } catch {
        isActiveRef.current = false;
        setIsCommandMode(false);
      }
      return;
    }
    isActiveRef.current = false;
    setIsCommandMode(false);
  });

  const startCommandMode = useCallback(async () => {
    try {
      setCommandResult(null);
      setLastTranscript('');

      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        return;
      }

      isActiveRef.current = true;
      const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: false,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch {
      isActiveRef.current = false;
      setIsCommandMode(false);
    }
  }, [language]);

  const stopCommandMode = useCallback(() => {
    isActiveRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Already stopped
    }
    setIsCommandMode(false);
  }, []);

  return {
    startCommandMode,
    stopCommandMode,
    isCommandMode,
    lastTranscript,
    commandResult,
  };
}
