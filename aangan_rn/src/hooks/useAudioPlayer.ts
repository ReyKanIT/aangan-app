import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { secureLog } from '../utils/security';

interface UseAudioPlayerReturn {
  loadAudio: (uri: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  isPlaying: boolean;
  position: number;
  duration: number;
  isLoaded: boolean;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      // Unloaded or error state
      if (status.error) {
        secureLog.warn('Playback error:', status.error);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const loadAudio = useCallback(
    async (uri: string) => {
      // Unload any existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      setIsLoaded(false);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          onPlaybackStatusUpdate,
        );

        soundRef.current = sound;

        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setDuration(status.durationMillis ?? 0);
          setIsLoaded(true);
        }
      } catch (err) {
        setIsLoaded(false);
        throw err;
      }
    },
    [onPlaybackStatusUpdate],
  );

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.pauseAsync();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(positionMs);
  }, []);

  return {
    loadAudio,
    play,
    pause,
    seek,
    isPlaying,
    position,
    duration,
    isLoaded,
  };
}
