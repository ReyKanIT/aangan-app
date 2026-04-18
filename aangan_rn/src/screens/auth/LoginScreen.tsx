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
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { VALIDATION } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { useLanguageStore } from '../../stores/languageStore';
import { supabase } from '../../config/supabase';

// Required for expo-web-browser OAuth flow
WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  // --- State ---
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const { sendOtp, sendEmailOtp, signInWithEmail, signUpWithEmail, session, isNewUser, isLoading } = useAuthStore();
  const { isHindi, toggleLanguage } = useLanguageStore();

  // --- Navigation on auth ---
  React.useEffect(() => {
    if (session && !isLoading) {
      if (isNewUser) {
        navigation.replace('ProfileSetup');
      } else {
        navigation.replace('Main');
      }
    }
  }, [session, isNewUser, isLoading, navigation]);

  // --- Validation ---
  const isValidPhone = VALIDATION.phoneRegex.test(phone);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  // ========== HANDLERS ==========

  const handlePhoneChange = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, VALIDATION.phoneLength);
    setPhone(cleaned);
    if (cleaned.length === VALIDATION.phoneLength && !VALIDATION.phoneRegex.test(cleaned)) {
      setPhoneError('सही फ़ोन नंबर डालें');
    } else {
      setPhoneError('');
    }
  }, []);

  // Phone OTP — works for both login & signup (auto-detect)
  const handlePhoneOtp = useCallback(async () => {
    if (!isValidPhone || isSending) return;
    setIsSending(true);
    try {
      const success = await sendOtp(phone);
      if (success) {
        navigation.navigate('OTP', { phone });
      } else {
        // Surface the real error so reviewers / QA can see the actual cause
        // instead of the generic "OTP नहीं भेज पाया". Common causes in prod:
        //   - DLT template pending → MSG91 400 → Supabase 502
        //   - SMS provider disabled in Supabase Dashboard
        //   - Rate limited (too many OTP requests for this number)
        const realError = useAuthStore.getState().error;
        Alert.alert(
          'OTP नहीं भेज पाया',
          realError
            ? `${realError}\n\nकृपया जाँचें:\n• फ़ोन नंबर सही है\n• इंटरनेट कनेक्शन चालू है\n• 60 सेकंड रुककर दोबारा कोशिश करें`
            : 'कृपया जाँचें:\n\n• फ़ोन नंबर सही है\n• इंटरनेट कनेक्शन चालू है\n• कुछ देर बाद फिर से कोशिश करें',
          [{ text: 'ठीक है' }]
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      Alert.alert('कनेक्शन समस्या', `इंटरनेट कनेक्शन जाँचें।\n\n(${msg})`, [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [phone, isValidPhone, isSending, sendOtp, navigation]);

  // Email OTP — passwordless, works for both login & signup (auto-detect)
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

  // Password login — for existing users
  const handlePasswordLogin = useCallback(async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    setIsSending(true);
    try {
      const success = await signInWithEmail(email, password);
      if (success) return; // useEffect navigates

      const storeError = useAuthStore.getState().error;
      const isEmailNotConfirmed = storeError?.includes('वेरिफ़ाई');

      if (isEmailNotConfirmed) {
        Alert.alert(
          'ईमेल वेरिफ़ाई करें',
          'आपका ईमेल वेरिफ़ाई नहीं है।\n\nOTP से वेरिफ़ाई करें?',
          [
            { text: 'OTP भेजें', onPress: () => handleEmailOtp() },
            { text: 'रद्द करें', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(
          'लॉगिन नहीं हो पाया',
          'ईमेल या पासवर्ड गलत है।\n\nनए हैं? "नया खाता" बटन दबाएँ।',
          [
            { text: 'नया खाता बनाएँ', onPress: () => setIsSignUp(true) },
            { text: 'ठीक है' },
          ]
        );
      }
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [email, password, isValidEmail, isValidPassword, isSending, signInWithEmail, handleEmailOtp]);

  // Password signup — for new email+password users
  const handlePasswordSignUp = useCallback(async () => {
    if (!isValidEmail || !isValidPassword || isSending) return;
    if (!passwordsMatch) {
      Alert.alert('पासवर्ड मेल नहीं खाते', 'दोनों पासवर्ड एक जैसे होने चाहिए।', [{ text: 'ठीक है' }]);
      return;
    }
    setIsSending(true);
    try {
      useAuthStore.getState().setError(null);
      const success = await signUpWithEmail(email, password);
      if (success) {
        // If no session yet (email confirmation needed), go to OTP screen
        const { session: currentSession } = useAuthStore.getState();
        if (!currentSession) {
          navigation.navigate('OTP', { email });
          return;
        }
        return; // useEffect navigates
      }
      Alert.alert(
        'खाता नहीं बन सका',
        'शायद यह ईमेल पहले से रजिस्टर है।',
        [
          { text: 'लॉगिन करें', onPress: () => setIsSignUp(false) },
          { text: 'ठीक है' },
        ]
      );
    } catch {
      Alert.alert('कनेक्शन समस्या', 'इंटरनेट कनेक्शन जाँचें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsSending(false);
    }
  }, [email, password, confirmPassword, isValidEmail, isValidPassword, passwordsMatch, isSending, signUpWithEmail, navigation]);

  // Google Sign-In — proper Expo OAuth flow via WebBrowser
  const handleGoogleSignIn = useCallback(async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      // Generate the redirect URI that expo-auth-session can intercept
      const redirectTo = makeRedirectUri();

      // Get the OAuth URL from Supabase WITHOUT opening the browser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Critical: returns URL instead of opening browser
        },
      });

      if (error || !data?.url) {
        Alert.alert('Google साइन इन नहीं हुआ', 'दोबारा कोशिश करें।', [{ text: 'ठीक है' }]);
        return;
      }

      // Open in-app browser — waits for redirect back to app
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // Extract tokens from the redirect URL fragment (#access_token=...&refresh_token=...)
        const url = result.url;
        const hashPart = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Complete the session — this triggers onAuthStateChange → auto-navigation
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              Alert.alert('Google साइन इन नहीं हुआ', 'सत्र स्थापित नहीं हो सका। दोबारा कोशिश करें।', [{ text: 'ठीक है' }]);
            }
            // Success — useEffect will navigate
          } else {
            Alert.alert('Google साइन इन नहीं हुआ', 'प्रमाणीकरण टोकन नहीं मिला।', [{ text: 'ठीक है' }]);
          }
        }
      }
      // If result.type === 'cancel' or 'dismiss', user closed the browser — do nothing
    } catch (e) {
      Alert.alert('Google साइन इन नहीं हुआ', 'दोबारा कोशिश करें।', [{ text: 'ठीक है' }]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isGoogleLoading]);

  // ========== RENDER ==========

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
          {/* Language Toggle */}
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

          {/* Logo */}
          <View style={styles.header}>
            <Text style={styles.logoText}>AANGAN</Text>
            <Text style={styles.logoHindi}>{'\u0906\u0901\u0917\u0928'}</Text>
          </View>

          <Text style={styles.title}>
            {'\u092A\u0930\u093F\u0935\u093E\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902'}
          </Text>
          <Text style={styles.subtitle}>Connect with Family</Text>

          {/* ===== 1. GOOGLE — Primary, one-tap (like ShareChat/Instagram) ===== */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Google से जारी रखें"
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={Colors.brown} />
            ) : (
              <>
                <Text style={styles.googleIcon}>🅖</Text>
                <Text style={styles.googleButtonText}>Google से जारी रखें</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>या / or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ===== 2. PHONE OTP — India's default (like WhatsApp/PhonePe) ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>फ़ोन नंबर</Text>
            <Text style={styles.sectionHint}>Phone Number</Text>
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
              />
            </View>
            {phoneError !== '' && (
              <Text style={styles.errorText}>{phoneError}</Text>
            )}
            <TouchableOpacity
              style={[styles.goldButton, (!isValidPhone || isSending) && styles.buttonDisabled]}
              onPress={handlePhoneOtp}
              disabled={!isValidPhone || isSending}
              activeOpacity={0.8}
            >
              {isSending && !showEmailSection ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.goldButtonText}>OTP भेजें — Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>या / or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ===== 3. EMAIL — Expandable (like Notion/Slack) ===== */}
          {!showEmailSection ? (
            <TouchableOpacity
              style={styles.emailExpandButton}
              onPress={() => setShowEmailSection(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.emailExpandIcon}>📧</Text>
              <Text style={styles.emailExpandText}>ईमेल से जारी रखें</Text>
              <Text style={styles.emailExpandHint}>Continue with Email</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ईमेल</Text>
              <Text style={styles.sectionHint}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={Colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              {/* Default: OTP (passwordless) — like Slack/Notion */}
              {!showPasswordField ? (
                <>
                  <TouchableOpacity
                    style={[styles.goldButton, (!isValidEmail || isSending) && styles.buttonDisabled]}
                    onPress={handleEmailOtp}
                    disabled={!isValidEmail || isSending}
                    activeOpacity={0.8}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.goldButtonText}>OTP भेजें — Send OTP</Text>
                    )}
                  </TouchableOpacity>

                  {/* Password option — small link (for existing password users) */}
                  <TouchableOpacity
                    style={styles.secondaryLink}
                    onPress={() => setShowPasswordField(true)}
                  >
                    <Text style={styles.secondaryLinkText}>
                      🔑 पासवर्ड से लॉगिन — Use Password
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Password fields */}
                  <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>पासवर्ड</Text>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="6+ अक्षर"
                    placeholderTextColor={Colors.gray400}
                    secureTextEntry
                    autoFocus
                  />

                  {isSignUp && (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>पासवर्ड दोबारा डालें</Text>
                      <TextInput
                        style={[
                          styles.textInput,
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

                  {/* Login or SignUp button */}
                  {isSignUp ? (
                    <TouchableOpacity
                      style={[
                        styles.goldButton,
                        styles.signUpButton,
                        (!isValidEmail || !isValidPassword || (confirmPassword.length > 0 && !passwordsMatch) || isSending) && styles.buttonDisabled,
                      ]}
                      onPress={handlePasswordSignUp}
                      disabled={!isValidEmail || !isValidPassword || (confirmPassword.length > 0 && !passwordsMatch) || isSending}
                      activeOpacity={0.8}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.goldButtonText}>खाता बनाएँ — Sign Up</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.goldButton,
                        (!isValidEmail || !isValidPassword || isSending) && styles.buttonDisabled,
                      ]}
                      onPress={handlePasswordLogin}
                      disabled={!isValidEmail || !isValidPassword || isSending}
                      activeOpacity={0.8}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.goldButtonText}>लॉगिन करें — Login</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Toggle login / signup */}
                  <TouchableOpacity
                    style={styles.secondaryLink}
                    onPress={() => {
                      setIsSignUp(!isSignUp);
                      setConfirmPassword('');
                    }}
                  >
                    <Text style={styles.secondaryLinkText}>
                      {isSignUp
                        ? 'पहले से खाता है? लॉगिन करें →'
                        : 'नए हैं? नया खाता बनाएँ →'}
                    </Text>
                  </TouchableOpacity>

                  {/* Back to OTP option */}
                  <TouchableOpacity
                    style={styles.secondaryLink}
                    onPress={() => {
                      setShowPasswordField(false);
                      setPassword('');
                      setConfirmPassword('');
                      setIsSignUp(false);
                    }}
                  >
                    <Text style={styles.secondaryLinkText}>
                      ← बिना पासवर्ड — OTP से जारी रखें
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Collapse email section */}
              <TouchableOpacity
                style={styles.collapseLink}
                onPress={() => {
                  setShowEmailSection(false);
                  setShowPasswordField(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setIsSignUp(false);
                }}
              >
                <Text style={styles.collapseLinkText}>▲ बंद करें</Text>
              </TouchableOpacity>
            </View>
          )}

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

// ========== STYLES ==========

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // --- Language Toggle ---
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

  // --- Container ---
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: Spacing.xxxl,
    backgroundColor: Colors.cream,
  },

  // --- Header ---
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    textAlign: 'center',
    color: Colors.gray600,
    marginBottom: Spacing.xl,
  },

  // --- Google Button (Primary — top) ---
  googleButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 22,
  },
  googleButtonText: {
    ...Typography.button,
    fontSize: 18,
    color: Colors.brown,
    fontWeight: '600',
  },

  // --- Divider ---
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
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

  // --- Section ---
  section: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.brown,
    marginBottom: 2,
  },
  sectionHint: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },

  // --- Phone Input ---
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    height: DADI_MIN_BUTTON_HEIGHT,
    overflow: 'hidden',
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

  // --- Text Input (email, password) ---
  textInput: {
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

  // --- Buttons ---
  goldButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  goldButtonText: {
    ...Typography.button,
    fontSize: 18,
    color: Colors.white,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: Colors.mehndiGreen,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // --- Email Expand Button (collapsed state) ---
  emailExpandButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.creamDark,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emailExpandIcon: {
    fontSize: 20,
  },
  emailExpandText: {
    ...Typography.button,
    fontSize: 16,
    color: Colors.brown,
    fontWeight: '600',
  },
  emailExpandHint: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gray500,
  },

  // --- Secondary links ---
  secondaryLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryLinkText: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.haldiGold,
    fontWeight: '600',
  },

  // --- Collapse link ---
  collapseLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  collapseLinkText: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.gray500,
  },

  // --- Error & Input states ---
  inputError: {
    borderColor: Colors.error,
  },
  inputErrorBorder: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.sm,
  },

  // --- Footer ---
  termsText: {
    ...Typography.caption,
    fontSize: 13,
    textAlign: 'center',
    color: Colors.gray600,
    lineHeight: 20,
    marginTop: Spacing.xxl,
  },
  termsLink: {
    color: Colors.haldiGold,
    textDecorationLine: 'underline',
  },
});
