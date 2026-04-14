import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';
import { useSupport } from '../../stores/supportStore';
import { secureLog } from '../../utils/security';
import type { SupportTicketCategory } from '../../types/database';

type Props = NativeStackScreenProps<any, 'Feedback'>;

interface CategoryOption {
  value: SupportTicketCategory;
  labelHi: string;
  labelEn: string;
}

const CATEGORIES: CategoryOption[] = [
  { value: 'bug_report', labelHi: 'बग रिपोर्ट', labelEn: 'Bug Report' },
  { value: 'feature_request', labelHi: 'नई सुविधा अनुरोध', labelEn: 'Feature Request' },
  { value: 'general', labelHi: 'सामान्य फ़ीडबैक', labelEn: 'General Feedback' },
  { value: 'complaint', labelHi: 'शिकायत', labelEn: 'Complaint' },
];

const MAX_MESSAGE_LENGTH = 500;

export default function FeedbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const { createTicket } = useSupport();

  const [selectedCategory, setSelectedCategory] = useState<SupportTicketCategory | null>(null);
  const [message, setMessage] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isHindi ? 'अनुमति आवश्यक' : 'Permission Required',
          isHindi
            ? 'स्क्रीनशॉट जोड़ने के लिए गैलरी एक्सेस की अनुमति दें।'
            : 'Please allow gallery access to attach a screenshot.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshotUri(result.assets[0].uri);
      }
    } catch (err: any) {
      secureLog.error('[Feedback] Image picker error:', err.message);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUri(null);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert(
        isHindi ? 'श्रेणी चुनें' : 'Select Category',
        isHindi ? 'कृपया फ़ीडबैक की श्रेणी चुनें।' : 'Please select a feedback category.',
      );
      return;
    }

    if (!message.trim()) {
      Alert.alert(
        isHindi ? 'संदेश लिखें' : 'Enter Message',
        isHindi ? 'कृपया अपना फ़ीडबैक लिखें।' : 'Please enter your feedback message.',
      );
      return;
    }

    setSubmitting(true);

    const categoryLabel = CATEGORIES.find((c) => c.value === selectedCategory);
    const subject = `Aangan Feedback: ${categoryLabel?.labelEn || 'General'}`;

    try {
      const ticket = await createTicket({
        category: selectedCategory,
        subject,
        message: message.trim(),
      });

      if (!ticket) {
        throw new Error('Ticket creation failed');
      }

      setSubmitted(true);
      secureLog.info('[Feedback] Submitted ticket:', ticket.id);
    } catch (err: any) {
      secureLog.error('[Feedback] Submit error:', err.message);
      Alert.alert(
        isHindi ? 'भेज नहीं पाए' : 'Could Not Submit',
        isHindi
          ? 'फ़ीडबैक भेजने में समस्या हुई। कृपया दोबारा कोशिश करें।'
          : 'There was a problem sending your feedback. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>{'\\u2705'}</Text>
          <Text style={styles.successTitle}>
            {isHindi ? 'धन्यवाद!' : 'Thank You!'}
          </Text>
          <Text style={styles.successMessage}>
            {isHindi
              ? 'आपका फ़ीडबैक भेज दिया गया है। हम जल्द ही जवाब देंगे।'
              : 'Your feedback has been sent. We will respond soon.'}
          </Text>
          {isHindi && (
            <Text style={styles.successMessageSub}>
              Your feedback has been sent. We will respond soon.
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
            {isHindi ? 'फ़ीडबैक' : 'Feedback'}
          </Text>
          {isHindi && <Text style={styles.headerSubtitle}>Feedback</Text>}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Picker */}
        <Text style={styles.label}>
          {isHindi ? 'श्रेणी चुनें' : 'Select Category'}
        </Text>
        {isHindi && <Text style={styles.labelSub}>Select Category</Text>}

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {isHindi ? cat.labelHi : cat.labelEn}
                </Text>
                {isHindi && (
                  <Text
                    style={[
                      styles.categoryChipSub,
                      isSelected && styles.categoryChipSubSelected,
                    ]}
                  >
                    {cat.labelEn}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Message Input */}
        <Text style={[styles.label, { marginTop: Spacing.xxl }]}>
          {isHindi ? 'आपका संदेश' : 'Your Message'}
        </Text>
        {isHindi && <Text style={styles.labelSub}>Your Message</Text>}

        <TextInput
          style={styles.textInput}
          placeholder={
            isHindi
              ? 'अपना फ़ीडबैक यहाँ लिखें...'
              : 'Write your feedback here...'
          }
          placeholderTextColor={Colors.brownMuted}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChangeText={setMessage}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {message.length}/{MAX_MESSAGE_LENGTH}
        </Text>

        {/* Screenshot Attachment */}
        <Text style={[styles.label, { marginTop: Spacing.xl }]}>
          {isHindi ? 'स्क्रीनशॉट (वैकल्पिक)' : 'Screenshot (Optional)'}
        </Text>
        {isHindi && <Text style={styles.labelSub}>Screenshot (Optional)</Text>}

        {screenshotUri ? (
          <View style={styles.screenshotContainer}>
            <Image source={{ uri: screenshotUri }} style={styles.screenshotPreview} />
            <TouchableOpacity
              style={styles.removeScreenshot}
              onPress={handleRemoveScreenshot}
            >
              <Text style={styles.removeScreenshotText}>X</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.attachButtonText}>
              {isHindi ? 'स्क्रीनशॉट जोड़ें' : 'Attach Screenshot'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedCategory || !message.trim() || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!selectedCategory || !message.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isHindi ? 'फ़ीडबैक भेजें' : 'Send Feedback'}
              </Text>
              {isHindi && (
                <Text style={styles.submitButtonSub}>Send Feedback</Text>
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
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  labelSub: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    ...Shadow.sm,
  },
  categoryChipSelected: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  categoryChipText: {
    ...Typography.body,
    color: Colors.brown,
  },
  categoryChipTextSelected: {
    color: Colors.white,
  },
  categoryChipSub: {
    ...Typography.caption,
    color: Colors.brownMuted,
    marginTop: 2,
  },
  categoryChipSubSelected: {
    color: Colors.white,
    opacity: 0.8,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    minHeight: 140,
    ...Typography.body,
    color: Colors.brown,
  },
  charCount: {
    ...Typography.caption,
    textAlign: 'right',
    marginTop: Spacing.xs,
    color: Colors.brownMuted,
  },
  screenshotContainer: {
    marginTop: Spacing.sm,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  screenshotPreview: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  removeScreenshot: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeScreenshotText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  attachButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  attachButtonText: {
    ...Typography.body,
    color: Colors.brownMuted,
  },
  submitButton: {
    backgroundColor: Colors.haldiGold,
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
  successEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.mehndiGreen,
    marginBottom: Spacing.md,
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
