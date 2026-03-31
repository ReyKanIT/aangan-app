import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';

interface PanchangData {
  date: string;
  vikram_samvat: string;
  maas: string;
  tithi: string;
  paksha: string;
  nakshatra: string;
  yoga: string;
  sunrise: string;
  sunset: string;
}

interface PanchangWidgetProps {
  data?: PanchangData;
}

// Default fallback when panchang_2026.json is not loaded yet
const DEFAULT_DATA: PanchangData = {
  date: new Date().toISOString().split('T')[0],
  vikram_samvat: '2083',
  maas: 'चैत्र',
  tithi: 'शुक्ल प्रतिपदा',
  paksha: 'शुक्ल',
  nakshatra: 'अश्विनी',
  yoga: 'शोभन',
  sunrise: '06:15',
  sunset: '18:30',
};

function PanchangRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function PanchangWidget({ data }: PanchangWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const panchang = data || DEFAULT_DATA;

  const toggle = () => {
    Animated.timing(animValue, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const bodyHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const rotateZ = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🙏</Text>
          <View>
            <Text style={styles.headerTitle}>आज का पंचांग</Text>
            <Text style={styles.headerSubtitle}>Today's Panchang</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.tithiPreview}>{panchang.tithi}</Text>
          <Animated.Text style={[styles.chevron, { transform: [{ rotateZ }] }]}>
            ▼
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Body */}
      <Animated.View style={[styles.body, { height: bodyHeight }]}>
        <View style={styles.bodyInner}>
          <PanchangRow label="विक्रम संवत" value={panchang.vikram_samvat} />
          <PanchangRow label="मास" value={panchang.maas} />
          <PanchangRow label="तिथि" value={panchang.tithi} />
          <PanchangRow label="पक्ष" value={panchang.paksha} />
          <PanchangRow label="नक्षत्र" value={panchang.nakshatra} />
          <PanchangRow label="योग" value={panchang.yoga} />
          <View style={styles.sunRow}>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>🌅</Text>
              <Text style={styles.sunLabel}>सूर्योदय</Text>
              <Text style={styles.sunValue}>{panchang.sunrise}</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>🌇</Text>
              <Text style={styles.sunLabel}>सूर्यास्त</Text>
              <Text style={styles.sunValue}>{panchang.sunset}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.haldiGoldLight,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  headerTitle: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 15,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tithiPreview: {
    ...Typography.labelSmall,
    color: Colors.haldiGold,
    marginRight: Spacing.sm,
  },
  chevron: {
    fontSize: 12,
    color: Colors.haldiGold,
  },
  body: {
    overflow: 'hidden',
  },
  bodyInner: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.haldiGoldLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
  },
  rowLabel: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    flex: 1,
  },
  rowValue: {
    ...Typography.body,
    color: Colors.brown,
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  sunRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  sunItem: {
    alignItems: 'center',
  },
  sunIcon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  sunLabel: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  sunValue: {
    ...Typography.label,
    color: Colors.haldiGold,
    marginTop: 2,
  },
});
