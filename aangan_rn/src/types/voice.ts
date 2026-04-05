/**
 * Voice feature type definitions for Aangan
 */

export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  locale: 'hi-IN' | 'en-IN';
  error: string | null;
}

export interface VoiceCommand {
  id: string;
  patterns: {
    hi: string[];
    en: string[];
  };
  action: () => void;
  feedback: {
    hi: string;
    en: string;
  };
}

export interface RecordingState {
  isRecording: boolean;
  duration: number; // seconds
  amplitudes: number[];
  uri: string | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  position: number; // ms
  duration: number; // ms
  currentId: string | null;
}

export interface AudioMessageMetadata {
  audioUrl: string;
  durationSeconds: number;
  messageType: 'text' | 'voice';
}
