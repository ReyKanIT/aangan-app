import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  isRecording: boolean;
  duration: number;
  amplitudes: number[];
  recordingUri: string | null;
}

const MAX_DURATION_MS = 120_000; // 2 minutes
const MAX_AMPLITUDE_SAMPLES = 50;
const METERING_INTERVAL_MS = 100; // ~10 Hz

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Reset state
      setRecordingUri(null);
      setDuration(0);
      setAmplitudes([]);

      // Create and start recording with M4A preset (mono, 44100Hz, 64kbps)
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;

        setDuration(status.durationMillis);

        if (status.metering != null) {
          // Metering values are in dB (negative). Normalize to 0..1 range.
          // Typical range: -160 dB (silence) to 0 dB (max).
          const normalized = Math.max(
            0,
            Math.min(1, (status.metering + 160) / 160),
          );
          setAmplitudes((prev) => {
            const next = [...prev, normalized];
            return next.length > MAX_AMPLITUDE_SAMPLES
              ? next.slice(next.length - MAX_AMPLITUDE_SAMPLES)
              : next;
          });
        }
      });

      recording.setProgressUpdateInterval(METERING_INTERVAL_MS);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);

      // Auto-stop after max duration
      maxDurationTimerRef.current = setTimeout(async () => {
        if (recordingRef.current) {
          await stopRecordingInternal();
        }
      }, MAX_DURATION_MS);
    } catch (err) {
      setIsRecording(false);
      throw err;
    }
  }, []);

  const stopRecordingInternal = useCallback(async () => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    const recording = recordingRef.current;
    if (!recording) return;

    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
    } catch {
      // Recording may already be stopped
    } finally {
      setIsRecording(false);

      // Restore audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(() => {});
    }
  }, []);

  const stopRecording = useCallback(async () => {
    await stopRecordingInternal();
  }, [stopRecordingInternal]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    duration,
    amplitudes,
    recordingUri,
  };
}
