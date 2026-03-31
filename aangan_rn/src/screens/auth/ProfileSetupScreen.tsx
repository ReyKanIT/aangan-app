import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { VALIDATION, INDIAN_STATES } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { secureLog } from '../../utils/security';

type Props = NativeStackScreenProps<any, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [village, setVillage] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { session, updateProfile } = useAuthStore();

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = '\u0928\u093E\u092E \u0921\u093E\u0932\u0947\u0902';
    } else if (displayName.trim().length < VALIDATION.nameMinLength) {
      newErrors.displayName = '\u0928\u093E\u092E \u0915\u092E \u0938\u0947 \u0915\u092E 2 \u0905\u0915\u094D\u0937\u0930 \u0915\u093E \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F';
    } else if (displayName.trim().length > VALIDATION.nameMaxLength) {
      newErrors.displayName = '\u0928\u093E\u092E 50 \u0905\u0915\u094D\u0937\u0930 \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [displayName]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '\u0905\u0928\u0941\u092E\u0924\u093F \u091A\u093E\u0939\u093F\u090F',
          '\u092B\u093C\u094B\u091F\u094B \u091A\u0941\u0928\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0917\u0948\u0932\u0930\u0940 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0926\u0947\u0902'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('\u0924\u094D\u0930\u0941\u091F\u093F', '\u092B\u093C\u094B\u091F\u094B \u091A\u0941\u0928\u0928\u0947 \u092E\u0947\u0902 \u0938\u092E\u0938\u094D\u092F\u093E \u0939\u0941\u0908');
    }
  }, []);

  const uploadPhoto = useCallback(async (): Promise<string | null> => {
    if (!photoUri || !session?.user?.id) return null;

    setIsUploadingPhoto(true);
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();

      const arrayBuffer = await new Response(blob).arrayBuffer();
      const filePath = `avatars/${session.user.id}/profile.jpg`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        secureLog.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      secureLog.error('Photo upload failed:', err);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [photoUri, session]);

  const handleSave = useCallback(async () => {
    if (!validate() || isSaving) return;

    setIsSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPhoto();
      }

      const profileData: Record<string, any> = {
        display_name: displayName.trim(),
      };

      if (hindiName.trim()) {
        profileData.display_name_hindi = hindiName.trim();
      }
      if (village.trim()) {
        profileData.village = village.trim();
      }
      if (state) {
        profileData.state = state;
      }
      if (bio.trim()) {
        profileData.bio = bio.trim();
      }
      if (photoUrl) {
        profileData.profile_photo_url = photoUrl;
      }

      const success = await updateProfile(profileData);
      if (success) {
        navigation.replace('Main');
      } else {
        Alert.alert(
          '\u0924\u094D\u0930\u0941\u091F\u093F',
          '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0938\u0947\u0935 \u0928\u0939\u0940\u0902 \u0939\u094B \u092A\u093E\u092F\u093E, \u092B\u093F\u0930 \u0938\u0947 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902'
        );
      }
    } catch {
      Alert.alert(
        '\u0924\u094D\u0930\u0941\u091F\u093F',
        '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0938\u0947\u0935 \u0928\u0939\u0940\u0902 \u0939\u094B \u092A\u093E\u092F\u093E, \u092B\u093F\u0930 \u0938\u0947 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902'
      );
    } finally {
      setIsSaving(false);
    }
  }, [validate, isSaving, photoUri, displayName, hindiName, village, state, bio, uploadPhoto, updateProfile, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>
            {'\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0938\u0947\u091F\u0905\u092A'}
          </Text>
          <Text style={styles.subtitle}>Profile Setup</Text>

          {/* Photo Picker */}
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
                <Text style={styles.photoHint}>
                  {'\u092B\u093C\u094B\u091F\u094B \u0921\u093E\u0932\u0947\u0902'}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraOverlayIcon}>{'\u270F\uFE0F'}</Text>
            </View>
          </TouchableOpacity>

          {/* Display Name - Required */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {'\u0928\u093E\u092E'} <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.fieldLabelEn}>Display Name</Text>
            <TextInput
              style={[styles.input, errors.displayName ? styles.inputError : null]}
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: '' }));
                }
              }}
              placeholder="अपना नाम डालें"
              placeholderTextColor={Colors.gray400}
              maxLength={VALIDATION.nameMaxLength}
            />
            {errors.displayName !== '' && errors.displayName && (
              <Text style={styles.errorText}>{errors.displayName}</Text>
            )}
          </View>

          {/* Hindi Name - Optional */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {'\u0939\u093F\u0902\u0926\u0940 \u0928\u093E\u092E'}
            </Text>
            <Text style={styles.fieldLabelEn}>Hindi Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={hindiName}
              onChangeText={setHindiName}
              placeholder="हिंदी में नाम"
              placeholderTextColor={Colors.gray400}
              maxLength={VALIDATION.nameMaxLength}
            />
          </View>

          {/* Village/City - Optional */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {'\u0917\u093E\u0901\u0935/\u0936\u0939\u0930'}
            </Text>
            <Text style={styles.fieldLabelEn}>Village/City (Optional)</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="अपना गाँव या शहर"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          {/* State - Dropdown */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {'\u0930\u093E\u091C\u094D\u092F'}
            </Text>
            <Text style={styles.fieldLabelEn}>State (Optional)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(!showStatePicker)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pickerText,
                  !state && styles.pickerPlaceholder,
                ]}
              >
                {state || '\u0930\u093E\u091C\u094D\u092F \u091A\u0941\u0928\u0947\u0902'}
              </Text>
              <Text style={styles.pickerArrow}>
                {showStatePicker ? '\u25B2' : '\u25BC'}
              </Text>
            </TouchableOpacity>

            {showStatePicker && (
              <View style={styles.stateList}>
                <ScrollView
                  style={styles.stateScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {INDIAN_STATES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.stateItem,
                        state === s && styles.stateItemActive,
                      ]}
                      onPress={() => {
                        setState(s);
                        setShowStatePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.stateItemText,
                          state === s && styles.stateItemTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Bio - Optional */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {'\u092A\u0930\u093F\u091A\u092F'}
            </Text>
            <Text style={styles.fieldLabelEn}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="अपने बारे में कुछ बताएं..."
              placeholderTextColor={Colors.gray400}
              maxLength={VALIDATION.bioMaxLength}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {bio.length}/{VALIDATION.bioMaxLength}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving || isUploadingPhoto ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.saveButtonText}>
                  {isUploadingPhoto
                    ? '\u092B\u093C\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...'
                    : '\u0938\u0947\u0935 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>
                {'\u0938\u0947\u0935 \u0915\u0930\u0947\u0902'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: Spacing.huge,
    backgroundColor: Colors.cream,
  },
  title: {
    ...Typography.h2,
    fontSize: 24,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },

  // Photo picker
  photoPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: Spacing.xxxl,
    position: 'relative',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.haldiGold,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.creamDark,
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 28,
  },
  photoHint: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gray600,
    marginTop: 2,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  cameraOverlayIcon: {
    fontSize: 14,
  },

  // Fields
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.brown,
    marginBottom: 2,
  },
  fieldLabelEn: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  input: {
    height: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
  },
  inputError: {
    borderColor: Colors.error,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  errorText: {
    ...Typography.bodySmall,
    fontSize: 14,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  charCount: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // State picker
  pickerButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
  },
  pickerPlaceholder: {
    color: Colors.gray400,
  },
  pickerArrow: {
    fontSize: 12,
    color: Colors.gray500,
  },
  stateList: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    ...Shadow.md,
  },
  stateScroll: {
    maxHeight: 200,
  },
  stateItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  stateItemActive: {
    backgroundColor: Colors.haldiGoldLight + '30',
  },
  stateItemText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
  },
  stateItemTextActive: {
    color: Colors.haldiGoldDark,
    fontWeight: '600',
  },

  // Save button
  saveButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...Typography.button,
    fontSize: 18,
    color: Colors.white,
    fontWeight: '600',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
