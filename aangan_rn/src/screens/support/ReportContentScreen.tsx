import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';
import { useReportStore } from '../../stores/reportStore';

type ReportContentParams = {
  contentType: string;
  contentId: string;
  contentPreview?: string;
};

type Props = NativeStackScreenProps<any, 'ReportContent'>;

interface ReasonOption {
  value: string;
  labelHi: string;
  labelEn: string;
}

const REPORT_REASONS: ReasonOption[] = [
  { value: 'inappropriate', labelHi: 'अनुचित सामग्री', labelEn: 'Inappropriate Content' },
  { value: 'spam', labelHi: 'स्पैम', labelEn: 'Spam' },
  { value: 'harassment', labelHi: 'उत्पीड़न', labelEn: 'Harassment' },
  { value: 'fake_account', labelHi: 'फ़र्ज़ी अकाउंट', labelEn: 'Fake Account' },
  { value: 'privacy', labelHi: 'प्राइवेसी उल्लंघन', labelEn: 'Privacy Violation' },
  { value: 'other', labelHi: 'अन्य', labelEn: 'Other' },
];

export default function ReportContentScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const { submitReport, isSubmitting } = useReportStore();

  const params = (route.params as ReportContentParams) || {};
  const { contentType = 'unknown', contentId = '', contentPreview } = params;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    const success = await submitReport(
      contentType,
      contentId,
      selectedReason,
      description.trim() || undefined,
    );

    if (success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>{'\\u2705'}</Text>
          <Text style={styles.successTitle}>
            {isHindi ? 'रिपोर्ट भेज दी गई' : 'Report Submitted'}
          </Text>
          {isHindi && (
            <Text style={styles.successTitleSub}>Report Submitted</Text>
          )}
          <Text style={styles.successMessage}>
            {isHindi
              ? 'हम आपकी रिपोर्ट की समीक्षा करेंगे और उचित कार्रवाई करेंगे।'
              : 'We will review your report and take appropriate action.'}
          </Text>
          {isHindi && (
            <Text style={styles.successMessageSub}>
              We will review your report and take appropriate action.
            </Text>
          )}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>
              {isHindi ? 'वापस जाएं' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {isHindi ? 'रिपोर्ट करें' : 'Report Content'}
          </Text>
          {isHindi && (
            <Text style={styles.headerSubtitle}>Report Content</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Content Preview */}
        {contentPreview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>
              {isHindi ? 'सामग्री:' : 'Content:'}
            </Text>
            <Text style={styles.previewText} numberOfLines={3}>
              {contentPreview}
            </Text>
          </View>
        )}

        {/* Reason Selection */}
        <Text style={styles.label}>
          {isHindi ? 'कारण चुनें' : 'Select Reason'}
        </Text>
        {isHindi && <Text style={styles.labelSub}>Select Reason</Text>}

        <View style={styles.reasonList}>
          {REPORT_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.value;
            return (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  isSelected && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${reason.labelHi} — ${reason.labelEn}`}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.reasonTextContainer}>
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextSelected,
                    ]}
                  >
                    {isHindi ? reason.labelHi : reason.labelEn}
                  </Text>
                  {isHindi && (
                    <Text style={styles.reasonTextSub}>{reason.labelEn}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional Description */}
        <Text style={[styles.label, { marginTop: Spacing.xxl }]}>
          {isHindi ? 'विवरण (वैकल्पिक)' : 'Description (Optional)'}
        </Text>
        {isHindi && <Text style={styles.labelSub}>Description (Optional)</Text>}

        <TextInput
          style={styles.textInput}
          placeholder={
            isHindi
              ? 'अधिक विवरण दें...'
              : 'Provide more details...'
          }
          placeholderTextColor={Colors.brownMuted}
          multiline
          maxLength={300}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !selectedReason && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!selectedReason || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isHindi ? 'रिपोर्ट भेजें' : 'Submit Report'}
              </Text>
              {isHindi && (
                <Text style={styles.submitButtonSub}>Submit Report</Text>
              )}
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: Colors.brown,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h2,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.haldiGold,
    ...Shadow.sm,
  },
  previewLabel: {
    ...Typography.labelSmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.xs,
  },
  previewText: {
    ...Typography.body,
    color: Colors.brown,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  labelSub: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.md,
  },
  reasonList: {
    gap: Spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    ...Shadow.sm,
  },
  reasonItemSelected: {
    borderColor: Colors.haldiGold,
    backgroundColor: Colors.creamDark,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  radioSelected: {
    borderColor: Colors.haldiGold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.haldiGold,
  },
  reasonTextContainer: {
    flex: 1,
  },
  reasonText: {
    ...Typography.body,
    color: Colors.brown,
  },
  reasonTextSelected: {
    fontWeight: '600',
  },
  reasonTextSub: {
    ...Typography.caption,
    color: Colors.brownMuted,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    minHeight: 100,
    ...Typography.body,
    color: Colors.brown,
  },
  submitButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    ...Shadow.md,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  submitButtonSub: {
    ...Typography.bodySmall,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.mehndiGreen,
    marginBottom: Spacing.xs,
  },
  successTitleSub: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.lg,
  },
  successMessage: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.brown,
    marginBottom: Spacing.xs,
  },
  successMessageSub: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.brownMuted,
    marginBottom: Spacing.xxl,
  },
  doneButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    ...Shadow.md,
  },
  doneButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
});
