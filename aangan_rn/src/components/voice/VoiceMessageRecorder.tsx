import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { VoiceWaveform } from './VoiceWaveform';

interface VoiceMessageRecorderProps {
  onRecordingComplete: (uri: string, durationSeconds: number) => void;
  onCancel: () => void;
}

const MIC_SIZE = DADI_MIN_TAP_TARGET;
const CONTROL_SIZE = 40;

export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(true);
    setElapsedSeconds(0);
    setAmplitudes([]);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      // Simulate amplitude data; replace with real useAudioRecorder data
      setAmplitudes((prev) => [...prev, Math.random() * 0.8 + 0.1]);
    }, 1000);

    // In a real implementation, useAudioRecorder hook would start recording here
  }, []);

  const stopRecording = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    // In a real implementation, useAudioRecorder would return the URI
    const recordingUri = ''; // placeholder - useAudioRecorder provides this
    onRecordingComplete(recordingUri, elapsedSeconds);
  }, [elapsedSeconds, onRecordingComplete]);

  const cancelRecording = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setElapsedSeconds(0);
    setAmplitudes([]);
    onCancel();
  }, [onCancel]);

  if (!isRecording) {
    return (
      <TouchableOpacity
        onPress={startRecording}
        activeOpacity={0.7}
        accessibilityLabel="रिकॉर्ड करें"
        accessibilityRole="button"
        style={styles.micButton}
      >
        <Text style={styles.micIcon}>🎤</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      {/* Cancel Button */}
      <TouchableOpacity
        onPress={cancelRecording}
        activeOpacity={0.7}
        accessibilityLabel="रद्द करें"
        accessibilityRole="button"
        style={styles.cancelButton}
      >
        <Text style={styles.controlIcon}>✕</Text>
      </TouchableOpacity>

      {/* Waveform + Timer */}
      <View style={styles.waveformSection}>
        <VoiceWaveform
          amplitudes={amplitudes}
          isActive={isRecording}
          color={Colors.white}
          barCount={20}
          height={28}
        />
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      </View>

      {/* Stop / Send Button */}
      <TouchableOpacity
        onPress={stopRecording}
        activeOpacity={0.7}
        accessibilityLabel="भेजें"
        accessibilityRole="button"
        style={styles.sendButton}
      >
        <Text style={styles.controlIcon}>✓</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 20,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  cancelButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  waveformSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timer: {
    ...Typography.bodySmall,
    color: Colors.white,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
});

export default VoiceMessageRecorder;
