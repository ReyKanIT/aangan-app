import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

interface VoiceCommandOverlayProps {
  navigationRef: any;
}

const FAB_SIZE = 56;
const TIMEOUT_MS = 5000;

export const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  navigationRef,
}) => {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseScale = useSharedValue(1);

  const startPulse = useCallback(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseScale]);

  const stopPulse = useCallback(() => {
    pulseScale.value = withTiming(1, { duration: 200 });
  }, [pulseScale]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const openOverlay = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOverlayVisible(true);
    setTranscript('');
    setStatusMessage('');
    startPulse();

    // Start no-match timeout
    timeoutRef.current = setTimeout(() => {
      setStatusMessage('समझ नहीं आया / Could not understand');
      stopPulse();
      setTimeout(() => {
        setOverlayVisible(false);
      }, 1500);
    }, TIMEOUT_MS);
  }, [startPulse, stopPulse]);

  const closeOverlay = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopPulse();
    setOverlayVisible(false);
  }, [stopPulse]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={openOverlay}
        activeOpacity={0.8}
        accessibilityLabel="वॉइस कमांड"
        accessibilityRole="button"
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>🗣️</Text>
      </TouchableOpacity>

      {/* Fullscreen Overlay */}
      <Modal
        visible={overlayVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOverlay}
      >
        <TouchableWithoutFeedback onPress={closeOverlay}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.overlayContent}>
                {/* Pulsing Mic */}
                <Animated.View style={[styles.micCircle, micAnimatedStyle]}>
                  <Text style={styles.micIcon}>🎤</Text>
                </Animated.View>

                {/* Prompt */}
                <Text style={styles.prompt}>बोलें... / Speak...</Text>

                {/* Live Transcript */}
                {transcript ? (
                  <Text style={styles.transcript}>{transcript}</Text>
                ) : null}

                {/* Status Message */}
                {statusMessage ? (
                  <Text style={styles.statusMessage}>{statusMessage}</Text>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.mehndiGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 26,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  micCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  micIcon: {
    fontSize: 48,
  },
  prompt: {
    ...Typography.h3,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  transcript: {
    ...Typography.body,
    color: Colors.haldiGoldLight,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  statusMessage: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default VoiceCommandOverlay;
