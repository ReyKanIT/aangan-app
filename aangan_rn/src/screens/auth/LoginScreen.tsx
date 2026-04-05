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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { VALIDATION } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { useLanguageStore } from '../../stores/languageStore';
import { supabase } from '../../config/supabase';

type Props = NativeStackScreenProps<any, 'Login'>;
type AuthMode = 'phone' | 'email';
type EmailAction = 'login' | 'signup';

export default function LoginScreen({ navigation }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [emailAction, setEmailAction] = useState<EmailAction>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { sendOtp, sendEmailOtp, signInWithEmail, signUpWithEmail, session, isNewUser, isLoading } = useAuthStore();
  const { isHindi, toggleLanguage } = useLanguageStore();

  // Navigate when session is established (after successful sign-in/sign-up)
  React.useEffect(() => {
    if (session && !isLoading) {
      if (isNewUser) {
        navigation.replace('ProfileSetup');
      } else {
        navigation.replace('Main');
      }
    }
  }, [session, isNewUser, isLoading, navigation]);

  const isValidPhone = VALIDATION.phoneRegex.test(phone);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const isValidConfirmPassword = emailAction === 'signup' ? (confirmPassword.length >= 6 && confirmPassword === password) : true;
  const passwordsMatch = password === confirmPassword;

  const handlePhoneChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, VALIDATION.phoneLength);
    setPhone(cleaned);
    if (cleaned.length === VALIDATION.phoneLength && !VALIDATION.phoneRegex.test(cleaned)) {
      setPhoneError('सही फ़ोन नंबर डालें');
    } else {
      setPhoneError('');
    }
  }, []);

  const handleSendPhoneOtp = useCallback(async () => {
    if (!isValidPhone || isSending) return;
    setIsSending(true);
    try {
      const success = await sendOtp(phone);
      if (success) {
        navigation.navigate('OTP', { phone });
      } else {
        Alert.alert(
          'OTP नहीं भेज पाया',
          'कृपया जाँचें:\n\n• फ़ोन नंबर सही है\n• इंटरनेट कनेक्शन चालू है\n• कुछ देर बाद फिर से कोशिश करें',
          [{ text: 'ठीक है' }]
        );
      }
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [phone, isValidPhone, isSending, sendOtp, navigation]);

  const handleEmailLogin = useCallback(async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    setIsSending(true);
    try {
      const success = await signInWithEmail(email, password);
      if (success) return; // useEffect will navigate
      Alert.alert(
        'लॉगिन नहीं हो पाया',
        'ईमेल या पासवर्ड गलत है। कृपया जाँचें और फिर से कोशिश करें।\n\nनया खाता बनाने के लिए "नया खाता" टैब दबाएँ।',
        [{ text: 'ठीक है' }]
      );
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [email, password, isValidEmail, isValidPassword, isSending, signInWithEmail]);

  const handleEmailSignUp = useCallback(async () => {
    if (!isValidEmail || !isValidPassword || !isValidConfirmPassword || isSending) return;
    if (!passwordsMatch) {
      Alert.alert('पासवर्ड मेल नहीं खाते', 'दोनों पासवर्ड एक जैसे होने चाहिए।', [{ text: 'ठीक है' }]);
      return;
    }
    setIsSending(true);
    try {
      useAuthStore.getState().setError(null);
      const success = await signUpWithEmail(email, password);
      if (success) return; // useEffect will navigate
      Alert.alert(
        'खाता नहीं बन सका',
        'शायद यह ईमेल पहले से रजिस्टर है। लॉगिन करके देखें।',
        [
          { text: 'लॉगिन करें', onPress: () => setEmailAction('login') },
          { text: 'ठीक है' },
        ]
      );
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [email, password, confirmPassword, isValidEmail, isValidPassword, isValidConfirmPassword, passwordsMatch, isSending, signUpWithEmail]);

  const handleGoogleSignIn = useCallback(async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'aangan://auth-callback' },
      });
      if (error) {
        Alert.alert(
          'Google साइन इन नहीं हुआ',
          'Google साइन इन नहीं हुआ। दोबारा कोशिश करें।',
          [{ text: 'ठीक है' }]
        );
      }
    } catch {
      Alert.alert(
        'Google साइन इन नहीं हुआ',
        'Google साइन इन नहीं हुआ। दोबारा कोशिश करें।',
        [{ text: 'ठीक है' }]
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isGoogleLoading]);

  const handleEmailOtp = useCallback(async () => {
    if (!isValidEmail || isSending) return;
    setIsSending(true);
    try {
      const success = await sendEmailOtp(email);
      if (success) {
        navigation.navigate('OTP', { email });
      } else {
        Alert.alert(
          'OTP नहीं भेज पाया',
          'ईमेल जाँचें और फिर से कोशिश करें।',
          [{ text: 'ठीक है' }]
        );
      }
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [email, isValidEmail, isSending, sendEmailOtp, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.container}>
          {/* Language Toggle — top right */}
          <TouchableOpacity
            style={styles.langToggle}
            onPress={toggleLanguage}
            accessibilityLabel={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
          >
            <Text style={styles.langToggleText}>
              {isHindi ? 'English' : 'हिंदी'}
            </Text>
            <Text style={styles.langToggleIcon}>🌐</Text>
          </TouchableOpacity>

          {/* Header Logo */}
          <View style={styles.header}>
            <Text style={styles.logoText}>AANGAN</Text>
            <Text style={styles.logoHindi}>{'\u0906\u0901\u0917\u0928'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {'\u092A\u0930\u093F\u0935\u093E\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902'}
          </Text>
          <Text style={styles.subtitle}>Connect with Family</Text>

          {/* Auth Mode Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'email' && styles.toggleActive]}
              onPress={() => setAuthMode('email')}
            >
              <Text style={[styles.toggleText, authMode === 'email' && styles.toggleTextActive]}>
                ईमेल
              </Text>
              <Text style={[styles.toggleSubtext, authMode === 'email' && styles.toggleSubtextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'phone' && styles.toggleActive]}
              onPress={() => setAuthMode('phone')}
            >
              <Text style={[styles.toggleText, authMode === 'phone' && styles.toggleTextActive]}>
                फ़ोन
              </Text>
              <Text style={[styles.toggleSubtext, authMode === 'phone' && styles.toggleSubtextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === 'phone' ? (
            /* Phone Input */
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>फ़ोन नंबर</Text>
              <View style={[styles.phoneRow, phoneError ? styles.inputError : null]}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="number-pad"
                  maxLength={VALIDATION.phoneLength}
                  autoFocus
                />
              </View>
              {phoneError !== '' && (
                <Text style={styles.errorText}>{phoneError}</Text>
              )}

              <TouchableOpacity
                style={[styles.sendButton, (!isValidPhone || isSending) && styles.sendButtonDisabled]}
                onPress={handleSendPhoneOtp}
                disabled={!isValidPhone || isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.sendButtonText}>OTP भेजें</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Email Input */
            <View style={styles.inputSection}>
              {/* Login / Sign Up sub-toggle */}
              <View style={styles.emailActionRow}>
                <TouchableOpacity
                  style={[styles.emailActionButton, emailAction === 'login' && styles.emailActionActive]}
                  onPress={() => setEmailAction('login')}
                >
                  <Text style={[styles.emailActionText, emailAction === 'login' && styles.emailActionTextActive]}>
                    लॉगिन
                  </Text>
                  <Text style={[styles.emailActionSubtext, emailAction === 'login' && styles.emailActionSubtextActive]}>
                    Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emailActionButton, emailAction === 'signup' && styles.emailActionActive]}
                  onPress={() => setEmailAction('signup')}
                >
                  <Text style={[styles.emailActionText, emailAction === 'signup' && styles.emailActionTextActive]}>
                    नया खाता
                  </Text>
                  <Text style={[styles.emailActionSubtext, emailAction === 'signup' && styles.emailActionSubtextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>ईमेल</Text>
              <TextInput
                style={[styles.emailInput]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={Colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.lg }]}>पासवर्ड</Text>
              <TextInput
                style={[styles.emailInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="6+ अक्षर"
                placeholderTextColor={Colors.gray400}
                secureTextEntry
              />

              {emailAction === 'signup' && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: Spacing.lg }]}>पासवर्ड दोबारा डालें</Text>
                  <TextInput
                    style={[
                      styles.emailInput,
                      confirmPassword.length > 0 && !passwordsMatch && styles.inputErrorBorder,
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="वही पासवर्ड दोबारा"
                    placeholderTextColor={Colors.gray400}
                    secureTextEntry
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <Text style={styles.errorText}>पासवर्ड मेल नहीं खाते</Text>
                  )}
                </>
              )}

              {emailAction === 'login' ? (
                <TouchableOpacity
                  style={[styles.sendButton, (!isValidEmail || !isValidPassword || isSending) && styles.sendButtonDisabled]}
                  onPress={handleEmailLogin}
                  disabled={!isValidEmail || !isValidPassword || isSending}
                  activeOpacity={0.8}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.sendButtonText}>लॉगिन करें</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.sendButton, styles.signUpButton, (!isValidEmail || !isValidPassword || !isValidConfirmPassword || isSending) && styles.sendButtonDisabled]}
                  onPress={handleEmailSignUp}
                  disabled={!isValidEmail || !isValidPassword || !isValidConfirmPassword || isSending}
                  activeOpacity={0.8}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.sendButtonText}>नया खाता बनाएँ — Sign Up</Text>
                  )}
                </TouchableOpacity>
              )}

              {emailAction === 'login' && (
                <TouchableOpacity
                  style={styles.otpLink}
                  onPress={handleEmailOtp}
                  disabled={!isValidEmail || isSending}
                >
                  <Text style={[styles.otpLinkText, (!isValidEmail || isSending) && { opacity: 0.4 }]}>
                    बिना पासवर्ड — Email OTP भेजें
                  </Text>
                </TouchableOpacity>
              )}

              {/* Switch prompt */}
              <TouchableOpacity
                style={styles.switchPrompt}
                onPress={() => setEmailAction(emailAction === 'login' ? 'signup' : 'login')}
              >
                <Text style={styles.switchPromptText}>
                  {emailAction === 'login'
                    ? 'नए हैं? नया खाता बनाएँ →'
                    : 'पहले से खाता है? लॉगिन करें →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>या / or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Google से साइन इन करें"
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={Colors.brown} />
            ) : (
              <>
                <Text style={styles.googleIcon}>🅖</Text>
                <Text style={styles.googleButtonText}>Google से साइन इन करें</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.termsText}>
            आगे बढ़कर आप हमारी{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>{' '}
            से सहमत होते हैं
          </Text>

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
  langToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.haldiGold,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  langToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.haldiGold,
    marginRight: 6,
  },
  langToggleIcon: {
    fontSize: 16,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: Spacing.xxxl,
    backgroundColor: Colors.cream,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoText: {
    ...Typography.appTitle,
    fontSize: 32,
    color: Colors.haldiGold,
    fontWeight: '700',
  },
  logoHindi: {
    ...Typography.appSubtitle,
    fontSize: 18,
    color: Colors.brown,
    marginTop: Spacing.xs,
  },
  title: {
    ...Typography.h2,
    fontSize: 24,
    textAlign: 'center',
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    textAlign: 'center',
    color: Colors.gray600,
    marginBottom: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md - 2,
  },
  toggleActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.gray500,
  },
  toggleTextActive: {
    color: Colors.haldiGold,
  },
  toggleSubtext: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 1,
  },
  toggleSubtextActive: {
    color: Colors.brownLight,
  },
  emailActionRow: {
    flexDirection: 'row',
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  emailActionButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.md - 2,
  },
  emailActionActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emailActionText: {
    ...Typography.label,
    fontSize: 15,
    color: Colors.gray500,
  },
  emailActionTextActive: {
    color: Colors.haldiGold,
    fontWeight: '700',
  },
  emailActionSubtext: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.gray400,
    marginTop: 1,
  },
  emailActionSubtextActive: {
    color: Colors.brownLight,
  },
  signUpButton: {
    backgroundColor: Colors.mehndiGreen,
  },
  inputErrorBorder: {
    borderColor: Colors.error,
  },
  switchPrompt: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchPromptText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.haldiGold,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    height: DADI_MIN_BUTTON_HEIGHT,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  inputError: {
    borderColor: Colors.error,
  },
  prefixBox: {
    paddingHorizontal: Spacing.lg,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: Colors.creamDark,
    borderRightWidth: 1,
    borderRightColor: Colors.gray300,
  },
  prefixText: {
    ...Typography.bodyLarge,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brown,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.bodyLarge,
    fontSize: 18,
    color: Colors.brown,
    height: '100%',
  },
  emailInput: {
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    height: DADI_MIN_BUTTON_HEIGHT,
    paddingHorizontal: Spacing.lg,
    ...Typography.bodyLarge,
    fontSize: 18,
    color: Colors.brown,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  sendButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.haldiGoldLight,
    opacity: 0.7,
  },
  sendButtonText: {
    ...Typography.button,
    fontSize: 18,
    color: Colors.white,
    fontWeight: '600',
  },
  otpLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  otpLinkText: {
    ...Typography.bodySmall,
    color: Colors.haldiGold,
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray300,
  },
  dividerText: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.gray500,
    marginHorizontal: Spacing.md,
  },
  googleButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: Colors.brown,
    fontWeight: '600',
  },
  termsText: {
    ...Typography.caption,
    fontSize: 13,
    textAlign: 'center',
    color: Colors.gray600,
    lineHeight: 20,
    marginTop: 'auto',
  },
  termsLink: {
    color: Colors.haldiGold,
    textDecorationLine: 'underline',
  },
});
