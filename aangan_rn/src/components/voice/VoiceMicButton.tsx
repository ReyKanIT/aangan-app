import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
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
import { DADI_MIN_TAP_TARGET } from '../../theme/typography';

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  mode?: 'replace' | 'append';
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onTranscript,
  onPartialTranscript,
  mode = 'append',
  size = DADI_MIN_TAP_TARGET,
  style,
  disabled = false,
}) => {
  const pulseOpacity = useSharedValue(1);
  const [isListening, setIsListening] = React.useState(false);

  const startPulse = useCallback(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseOpacity]);

  const stopPulse = useCallback(() => {
    pulseOpacity.value = withTiming(1, { duration: 200 });
  }, [pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handlePress = useCallback(async () => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isListening) {
      setIsListening(false);
      stopPulse();
      // Hook would stop recognition and deliver final transcript via onTranscript
    } else {
      setIsListening(true);
      startPulse();
      // In a real implementation, useVoiceInput hook would start recognition
      // and call onTranscript / onPartialTranscript as results arrive.
      // For now we set up the visual state; wire useVoiceInput when available.
    }
  }, [disabled, isListening, startPulse, stopPulse, onTranscript, onPartialTranscript, mode]);

  return (
    <AnimatedTouchable
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel="बोलने के लिए दबाएं"
      accessibilityRole="button"
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isListening ? Colors.error : Colors.haldiGold,
        },
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.45 }]}>🎤</Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default VoiceMicButton;
