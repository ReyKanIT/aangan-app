import { create } from 'zustand';

const MAX_AMPLITUDES = 50;

interface VoiceMessageState {
  isRecording: boolean;
  recordingDuration: number; // seconds
  amplitudes: number[];
  recordingUri: string | null;
  currentlyPlayingId: string | null;
  playbackPosition: number; // ms
  playbackDuration: number; // ms

  startRecording: () => void;
  stopRecording: () => void;
  addAmplitude: (amplitude: number) => void;
  setRecordingUri: (uri: string | null) => void;
  setPlayback: (id: string, position: number, duration: number) => void;
  stopPlayback: () => void;
  reset: () => void;
}

export const useVoiceMessageStore = create<VoiceMessageState>((set) => ({
  isRecording: false,
  recordingDuration: 0,
  amplitudes: [],
  recordingUri: null,
  currentlyPlayingId: null,
  playbackPosition: 0,
  playbackDuration: 0,

  startRecording: () =>
    set({
      isRecording: true,
      recordingDuration: 0,
      amplitudes: [],
      recordingUri: null,
    }),

  stopRecording: () => set({ isRecording: false }),

  addAmplitude: (amplitude) =>
    set((state) => ({
      amplitudes: [...state.amplitudes, amplitude].slice(-MAX_AMPLITUDES),
    })),

  setRecordingUri: (uri) => set({ recordingUri: uri }),

  setPlayback: (id, position, duration) =>
    set({
      currentlyPlayingId: id,
      playbackPosition: position,
      playbackDuration: duration,
    }),

  stopPlayback: () =>
    set({
      currentlyPlayingId: null,
      playbackPosition: 0,
      playbackDuration: 0,
    }),

  reset: () =>
    set({
      isRecording: false,
      recordingDuration: 0,
      amplitudes: [],
      recordingUri: null,
      currentlyPlayingId: null,
      playbackPosition: 0,
      playbackDuration: 0,
    }),
}));
