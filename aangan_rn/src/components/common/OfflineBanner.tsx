import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { NetworkMonitor } from '../../utils/network';

const BANNER_HEIGHT = 44;
const ANIMATION_DURATION = 300;
const WARNING_BG = '#FFF3CD';
const WARNING_TEXT = '#856404';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!NetworkMonitor.isOnline);
  const translateY = useRef(new Animated.Value(offline ? 0 : -BANNER_HEIGHT)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handleChange = (isOnline: boolean) => {
      setOffline(!isOnline);
    };

    NetworkMonitor.subscribe(handleChange);
    return () => {
      NetworkMonitor.unsubscribe(handleChange);
    };
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: offline ? 0 : -BANNER_HEIGHT,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [offline, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📡</Text>
        <View style={styles.textContainer}>
          <Text style={styles.hindiText}>इंटरनेट कनेक्शन नहीं है</Text>
          <Text style={styles.englishText}>No internet connection</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: WARNING_BG,
  },
  content: {
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  hindiText: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 20,
    color: WARNING_TEXT,
  },
  englishText: {
    ...Typography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    color: WARNING_TEXT,
  },
});
