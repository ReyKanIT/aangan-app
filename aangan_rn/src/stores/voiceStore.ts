import { create } from 'zustand';

interface VoiceState {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  locale: 'hi-IN' | 'en-IN';
  error: string | null;

  setListening: (isListening: boolean) => void;
  setTranscript: (transcript: string) => void;
  setPartialTranscript: (partialTranscript: string) => void;
  setLocale: (locale: 'hi-IN' | 'en-IN') => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  transcript: '',
  partialTranscript: '',
  locale: 'hi-IN',
  error: null,

  setListening: (isListening) => set({ isListening }),
  setTranscript: (transcript) => set({ transcript }),
  setPartialTranscript: (partialTranscript) => set({ partialTranscript }),
  setLocale: (locale) => set({ locale }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      isListening: false,
      transcript: '',
      partialTranscript: '',
      locale: 'hi-IN',
      error: null,
    }),
}));
