/**
 * SkeletonLoader — shimmer placeholders for loading states.
 *
 * Replaces ActivityIndicator spinners with content-shaped shimmers.
 * Cred/Scapia / modern fintech standard pattern.
 *
 * Usage:
 *   <SkeletonLoader width={120} height={16} />
 *   <SkeletonLoader.Circle size={44} />
 *   <SkeletonLoader.Card>
 *     <SkeletonLoader.Circle size={40} />
 *     <SkeletonLoader width={140} height={14} />
 *     <SkeletonLoader width={80} height={12} style={{ marginTop: 6 }} />
 *   </SkeletonLoader.Card>
 *
 * Performance: a single shared timing loop drives opacity on a Reanimated
 * shared value so 100 skeletons cost the same as 1. No per-skeleton timer.
 *
 * Created in v0.15.9.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const BASE_COLOR = '#F1E9D2';
const HIGHLIGHT_COLOR = '#FAF5E3';

interface BoxProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width, height, radius = 6, style }: BoxProps) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: BASE_COLOR,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <SkeletonBox width={size} height={size} radius={size / 2} style={style} />;
}

function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#3A2A12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2EAD3',
  },
});

const SkeletonLoader = Object.assign(SkeletonBox, {
  Circle: SkeletonCircle,
  Card: SkeletonCard,
});

export default SkeletonLoader;
export { HIGHLIGHT_COLOR, BASE_COLOR };
