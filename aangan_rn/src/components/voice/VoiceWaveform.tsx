import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

interface VoiceWaveformProps {
  amplitudes: number[]; // 0-1 values, last barCount shown
  isActive: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

const MIN_BAR_HEIGHT_FRACTION = 0.1;
const BAR_WIDTH = 3;
const BAR_GAP = 2;

const WaveformBar: React.FC<{
  amplitude: number;
  isActive: boolean;
  color: string;
  maxHeight: number;
}> = ({ amplitude, isActive, color, maxHeight }) => {
  const barHeight = useSharedValue(maxHeight * MIN_BAR_HEIGHT_FRACTION);

  useEffect(() => {
    const targetHeight = isActive
      ? maxHeight * Math.max(amplitude, MIN_BAR_HEIGHT_FRACTION)
      : maxHeight * MIN_BAR_HEIGHT_FRACTION;

    barHeight.value = withTiming(targetHeight, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [amplitude, isActive, maxHeight, barHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: BAR_WIDTH,
          backgroundColor: color,
          borderRadius: BAR_WIDTH / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  amplitudes,
  isActive,
  color = Colors.haldiGold,
  barCount = 30,
  height = 40,
}) => {
  // Take the last barCount amplitudes, pad with zeros if fewer
  const displayAmplitudes = React.useMemo(() => {
    const slice = amplitudes.slice(-barCount);
    const padded = new Array(barCount).fill(0);
    for (let i = 0; i < slice.length; i++) {
      padded[barCount - slice.length + i] = slice[i];
    }
    return padded;
  }, [amplitudes, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {displayAmplitudes.map((amp, index) => (
        <WaveformBar
          key={index}
          amplitude={amp}
          isActive={isActive}
          color={color}
          maxHeight={height}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
  },
  bar: {
    minHeight: 2,
  },
});

export default VoiceWaveform;
