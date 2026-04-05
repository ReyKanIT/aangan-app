import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

// -- Feature data --

type FeatureStatus = 'complete' | 'in-progress' | 'planned';

interface Feature {
  name: string;
  version: string;
  status: FeatureStatus;
}

const features: Feature[] = [
  { name: 'Authentication (OTP + Email)', version: 'v0.1', status: 'complete' },
  { name: 'Family Tree (3 Levels)', version: 'v0.1', status: 'complete' },
  { name: 'Posts & Feed', version: 'v0.1', status: 'complete' },
  { name: 'Events & RSVP', version: 'v0.1', status: 'complete' },
  { name: 'Security & RLS', version: 'v0.2', status: 'complete' },
  { name: 'Push Notifications', version: 'v0.3', status: 'complete' },
  { name: 'Direct Messaging', version: 'v0.3', status: 'complete' },
  { name: 'Kuldevi / Kuldevta', version: 'v0.4', status: 'complete' },
  { name: 'Life Events & Timeline', version: 'v0.4', status: 'complete' },
  { name: 'Family Reminders', version: 'v0.4', status: 'complete' },
  { name: 'Guest Photo Upload', version: 'v0.4', status: 'complete' },
  { name: 'Voice-to-Text Input', version: 'v0.5', status: 'complete' },
  { name: 'Voice Commands', version: 'v0.5', status: 'complete' },
  { name: 'Voice Messages', version: 'v0.5', status: 'complete' },
  { name: 'Google Sign-In', version: 'v0.6', status: 'planned' },
  { name: 'Video Sharing', version: 'v0.6', status: 'planned' },
  { name: 'Stories/Moments', version: 'v0.7', status: 'planned' },
  { name: 'App Store Release', version: 'v1.0', status: 'planned' },
];

const stages = ['Alpha', 'Beta Testing', 'Production', 'App Store'];
const currentStageIndex = 1; // Beta Testing

// -- Helpers --

function getStatusIcon(status: FeatureStatus): string {
  switch (status) {
    case 'complete':
      return '\u2705';
    case 'in-progress':
      return '\uD83D\uDD04';
    case 'planned':
      return '\uD83D\uDCCB';
  }
}

function getVersionColor(version: string): string {
  switch (version) {
    case 'v0.1':
      return Colors.mehndiGreen;
    case 'v0.2':
      return Colors.info;
    case 'v0.3':
      return Colors.haldiGold;
    case 'v0.4':
      return Colors.warning;
    case 'v0.5':
      return '#9C27B0';
    case 'v0.6':
      return Colors.error;
    case 'v0.7':
      return '#00BCD4';
    case 'v1.0':
      return Colors.brown;
    default:
      return Colors.gray500;
  }
}

// Group features by version
function groupByVersion(items: Feature[]): Record<string, Feature[]> {
  const groups: Record<string, Feature[]> = {};
  for (const item of items) {
    if (!groups[item.version]) {
      groups[item.version] = [];
    }
    groups[item.version].push(item);
  }
  return groups;
}

// -- Sub-components --

function StatsRow() {
  const completeCount = features.filter((f) => f.status === 'complete').length;
  const inProgressCount = features.filter((f) => f.status === 'in-progress').length;
  const plannedCount = features.filter((f) => f.status === 'planned').length;

  return (
    <View style={statsStyles.container}>
      <View style={statsStyles.stat}>
        <Text style={statsStyles.statNumber}>{completeCount}</Text>
        <Text style={statsStyles.statLabel}>Complete</Text>
      </View>
      <View style={statsStyles.divider} />
      <View style={statsStyles.stat}>
        <Text style={[statsStyles.statNumber, { color: Colors.warning }]}>{inProgressCount}</Text>
        <Text style={statsStyles.statLabel}>In Progress</Text>
      </View>
      <View style={statsStyles.divider} />
      <View style={statsStyles.stat}>
        <Text style={[statsStyles.statNumber, { color: Colors.info }]}>{plannedCount}</Text>
        <Text style={statsStyles.statLabel}>Planned</Text>
      </View>
    </View>
  );
}

function ProgressStepper() {
  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.title}>Development Stage</Text>
      <View style={stepperStyles.stepsRow}>
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isLast = index === stages.length - 1;

          return (
            <React.Fragment key={stage}>
              <View style={stepperStyles.stepItem}>
                <View
                  style={[
                    stepperStyles.stepCircle,
                    isCompleted && stepperStyles.stepCircleCompleted,
                    isCurrent && stepperStyles.stepCircleCurrent,
                  ]}
                >
                  <Text
                    style={[
                      stepperStyles.stepCircleText,
                      (isCompleted || isCurrent) && stepperStyles.stepCircleTextActive,
                    ]}
                  >
                    {isCompleted ? '\u2713' : index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    stepperStyles.stepLabel,
                    isCurrent && stepperStyles.stepLabelCurrent,
                    isCompleted && stepperStyles.stepLabelCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {stage}
                </Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    stepperStyles.connector,
                    isCompleted && stepperStyles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

function VersionGroup({ version, items }: { version: string; items: Feature[] }) {
  const color = getVersionColor(version);

  return (
    <View style={versionStyles.container}>
      <View style={[versionStyles.versionBadge, { backgroundColor: color + '20' }]}>
        <Text style={[versionStyles.versionText, { color }]}>{version}</Text>
      </View>
      {items.map((feature) => (
        <View key={feature.name} style={versionStyles.featureRow}>
          <Text style={versionStyles.statusIcon}>{getStatusIcon(feature.status)}</Text>
          <Text style={versionStyles.featureName}>{feature.name}</Text>
        </View>
      ))}
    </View>
  );
}

// -- Main Component --

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const grouped = groupByVersion(features);
  const versionOrder = ['v0.1', 'v0.2', 'v0.3', 'v0.4', 'v0.5', 'v0.6', 'v0.7', 'v1.0'];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.haldiGold} />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Aangan Dashboard</Text>
            <Text style={styles.headerVersion}>v0.5.0 — Voice Enabled</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <StatsRow />

        {/* Progress Stepper */}
        <ProgressStepper />

        {/* Feature List by Version */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Feature Status</Text>
          {versionOrder.map((version) => {
            const items = grouped[version];
            if (!items) return null;
            return <VersionGroup key={version} version={version} items={items} />;
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendRow}>
            <Text style={styles.legendIcon}>{'\u2705'}</Text>
            <Text style={styles.legendText}>Complete</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendIcon}>{'\uD83D\uDD04'}</Text>
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendIcon}>{'\uD83D\uDCCB'}</Text>
            <Text style={styles.legendText}>Planned</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  headerBar: {
    backgroundColor: Colors.haldiGold,
    ...Shadow.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '700',
  },
  headerVersion: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.85,
    marginTop: 2,
  },
  headerSpacer: {
    width: DADI_MIN_TAP_TARGET,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  featuresSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.brown,
    marginBottom: Spacing.md,
  },
  legendContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  legendTitle: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  legendIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  legendText: {
    ...Typography.body,
    color: Colors.brownLight,
  },
});

const statsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.h2,
    color: Colors.mehndiGreen,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
});

const stepperStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  title: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.lg,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 72,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.mehndiGreen,
  },
  stepCircleCurrent: {
    backgroundColor: Colors.haldiGold,
    ...Shadow.md,
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray500,
  },
  stepCircleTextActive: {
    color: Colors.white,
  },
  stepLabel: {
    ...Typography.caption,
    color: Colors.gray500,
    textAlign: 'center',
    fontSize: 12,
  },
  stepLabelCurrent: {
    color: Colors.haldiGold,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: Colors.mehndiGreen,
  },
  connector: {
    height: 2,
    flex: 1,
    backgroundColor: Colors.gray200,
    marginTop: 17,
  },
  connectorCompleted: {
    backgroundColor: Colors.mehndiGreen,
  },
});

const versionStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  versionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  versionText: {
    ...Typography.labelSmall,
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  statusIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  featureName: {
    ...Typography.body,
    color: Colors.brown,
    flex: 1,
  },
});
