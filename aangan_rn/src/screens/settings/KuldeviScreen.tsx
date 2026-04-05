import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useLanguageStore } from '../../stores/languageStore';
import { supabase } from '../../config/supabase';

type Props = NativeStackScreenProps<any, 'Kuldevi'>;

// -- Field component --

interface FieldProps {
  label: string;
  labelEn: string;
  placeholder: string;
  placeholderEn: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  isHindi: boolean;
}

function Field({
  label, labelEn, placeholder, placeholderEn,
  value, onChangeText, multiline = false, isHindi,
}: FieldProps) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>
        {label}
        {'  '}
        <Text style={fieldStyles.labelEn}>({labelEn})</Text>
      </Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={isHindi ? placeholder : placeholderEn}
        placeholderTextColor={Colors.gray400}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={isHindi ? label : labelEn}
      />
    </View>
  );
}

// -- Divider --
function SectionDivider({ title, isHindi, titleEn }: { title: string; titleEn: string; isHindi: boolean }) {
  return (
    <View style={dividerStyles.container}>
      <View style={dividerStyles.line} />
      <Text style={dividerStyles.text}>{isHindi ? title : titleEn}</Text>
      <View style={dividerStyles.line} />
    </View>
  );
}

// -- Main Screen --

export default function KuldeviScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, fetchProfile } = useAuthStore();
  const { isHindi } = useLanguageStore();

  const [kuldeviName, setKuldeviName] = useState(user?.kuldevi_name ?? '');
  const [kuldeviTemple, setKuldeviTemple] = useState(user?.kuldevi_temple_location ?? '');
  const [kuldevtaName, setKuldevtaName] = useState(user?.kuldevta_name ?? '');
  const [kuldevtaTemple, setKuldevtaTemple] = useState(user?.kuldevta_temple_location ?? '');
  const [pujaPaddhati, setPujaPaddhati] = useState(user?.puja_paddhati ?? '');
  const [pujaNiyam, setPujaNiyam] = useState(user?.puja_niyam ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          kuldevi_name: kuldeviName.trim() || null,
          kuldevi_temple_location: kuldeviTemple.trim() || null,
          kuldevta_name: kuldevtaName.trim() || null,
          kuldevta_temple_location: kuldevtaTemple.trim() || null,
          puja_paddhati: pujaPaddhati.trim() || null,
          puja_niyam: pujaNiyam.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await fetchProfile();
      Alert.alert(
        isHindi ? 'सहेजा गया ✓' : 'Saved ✓',
        isHindi ? 'कुलदेवी / कुलदेवता जानकारी अपडेट हो गई' : 'Kuldevi / Kuldevta information updated',
        [{ text: isHindi ? 'ठीक है' : 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        err?.message || (isHindi ? 'कुछ गलत हो गया' : 'Something went wrong'),
      );
    } finally {
      setIsSaving(false);
    }
  }, [user, kuldeviName, kuldeviTemple, kuldevtaName, kuldevtaTemple, pujaPaddhati, pujaNiyam, isHindi, navigation, fetchProfile]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'कुलदेवी / कुलदेवता' : 'Kuldevi / Kuldevta'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isHindi ? 'पारिवारिक देवी-देवता जानकारी' : 'Family deity information'}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🙏</Text>
          <Text style={styles.infoText}>
            {isHindi
              ? 'यह जानकारी केवल आपके परिवार के सदस्यों को दिखती है। सभी क्षेत्र वैकल्पिक हैं।'
              : 'This information is visible only to your family members. All fields are optional.'}
          </Text>
        </View>

        {/* Kuldevi Section */}
        <SectionDivider title="कुलदेवी" titleEn="Kuldevi (Family Goddess)" isHindi={isHindi} />

        <View style={styles.card}>
          <Field
            label="कुलदेवी का नाम"
            labelEn="Name"
            placeholder="जैसे: शीतला माता, विंध्यवासिनी..."
            placeholderEn="e.g. Sheetala Mata, Vindhyavasini..."
            value={kuldeviName}
            onChangeText={setKuldeviName}
            isHindi={isHindi}
          />
          <View style={styles.fieldDivider} />
          <Field
            label="मंदिर का स्थान"
            labelEn="Temple Location"
            placeholder="जैसे: वाराणसी, उत्तर प्रदेश"
            placeholderEn="e.g. Varanasi, Uttar Pradesh"
            value={kuldeviTemple}
            onChangeText={setKuldeviTemple}
            isHindi={isHindi}
          />
        </View>

        {/* Kuldevta Section */}
        <SectionDivider title="कुलदेवता" titleEn="Kuldevta (Family God)" isHindi={isHindi} />

        <View style={styles.card}>
          <Field
            label="कुलदेवता का नाम"
            labelEn="Name"
            placeholder="जैसे: भैरव जी, खाटूश्यामजी..."
            placeholderEn="e.g. Bhairav Ji, Khatushyam Ji..."
            value={kuldevtaName}
            onChangeText={setKuldevtaName}
            isHindi={isHindi}
          />
          <View style={styles.fieldDivider} />
          <Field
            label="मंदिर का स्थान"
            labelEn="Temple Location"
            placeholder="जैसे: खाटू, राजस्थान"
            placeholderEn="e.g. Khatu, Rajasthan"
            value={kuldevtaTemple}
            onChangeText={setKuldevtaTemple}
            isHindi={isHindi}
          />
        </View>

        {/* Puja Section */}
        <SectionDivider title="पूजा विधि व नियम" titleEn="Puja Method & Rules" isHindi={isHindi} />

        <View style={styles.card}>
          <Field
            label="पूजा पद्धति"
            labelEn="Puja Paddhati (Method)"
            placeholder="पूजा करने की विधि लिखें... जैसे: कौन सा भोग लगाए, किस दिन पूजा करें, कौन सा मंत्र पढ़ें..."
            placeholderEn="Describe the puja procedure... e.g. which prasad to offer, which day to worship, which mantra to chant..."
            value={pujaPaddhati}
            onChangeText={setPujaPaddhati}
            multiline
            isHindi={isHindi}
          />
          <View style={styles.fieldDivider} />
          <Field
            label="नियम व विशेष बातें"
            labelEn="Rules & Special Notes"
            placeholder="पूजा से संबंधित नियम व सावधानियाँ लिखें... जैसे: कौन सा भोजन वर्जित है, कौन सा वस्त्र पहनें, कोई विशेष परंपरा..."
            placeholderEn="Write rules and precautions... e.g. forbidden foods, dress code, special traditions..."
            value={pujaNiyam}
            onChangeText={setPujaNiyam}
            multiline
            isHindi={isHindi}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isHindi ? 'Save kuldevi information' : 'Save kuldevi information'}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {isHindi ? '✓  सहेजें (Save)' : '✓  Save'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Shadow.sm,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: Colors.brown,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.haldiGoldLight + '30',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.brown,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.lg,
    height: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadow.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.label,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});

const fieldStyles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.xs,
  },
  labelEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.brown,
    backgroundColor: Colors.gray50,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  inputMultiline: {
    minHeight: 110,
    paddingTop: Spacing.md,
  },
});

const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.haldiGold + '50',
  },
  text: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
    fontWeight: '600',
    fontSize: 13,
  },
});
