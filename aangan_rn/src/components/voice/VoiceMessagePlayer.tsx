import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number; // seconds
  messageId: string;
}

const BUTTON_SIZE = 36;

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration,
  messageId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const progressWidth = useSharedValue(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      // In a real implementation, useAudioPlayer hook would pause here
    } else {
      setIsPlaying(true);
      // In a real implementation, useAudioPlayer hook would play audioUrl
      // and update currentTime + progressWidth as playback proceeds
      // Example progress animation for visual reference:
      progressWidth.value = withTiming(trackWidth, { duration: duration * 1000 });
    }
  }, [isPlaying, audioUrl, duration, progressWidth, trackWidth]);

  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(duration);

  return (
    <View style={styles.container}>
      {/* Play / Pause Button */}
      <TouchableOpacity
        onPress={togglePlayback}
        activeOpacity={0.7}
        accessibilityLabel={isPlaying ? 'रोकें' : 'चलाएं'}
        accessibilityRole="button"
        style={styles.playButton}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
      </TouchableOpacity>

      {/* Progress + Duration */}
      <View style={styles.progressSection}>
        {/* Progress Bar */}
        <View style={styles.progressTrack} onLayout={onTrackLayout}>
          <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
        </View>

        {/* Duration */}
        <Text style={styles.duration}>{displayTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    minWidth: 180,
  },
  playButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
  progressSection: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.haldiGold,
    borderRadius: 2,
  },
  duration: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray600,
    fontVariant: ['tabular-nums'],
  },
});

export default VoiceMessagePlayer;
