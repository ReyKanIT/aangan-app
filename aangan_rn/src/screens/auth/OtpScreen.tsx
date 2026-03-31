import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { REFERRAL_LIMITS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';

type Props = NativeStackScreenProps<any, 'OTP'>;

const OTP_LENGTH = 6;

export default function OtpScreen({ navigation, route }: Props) {
  const phone = route.params?.phone ?? '';
  const email = route.params?.email ?? '';
  const isEmailMode = !!email;
  const maskedPhone = phone ? phone.slice(0, 2) + '****' + phone.slice(-2) : '';
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState<number>(REFERRAL_LIMITS.otpTimerSeconds);
  const [resendCount, setResendCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockTimer, setLockTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { verifyOtp, sendOtp, verifyEmailOtp, sendEmailOtp, isNewUser } = useAuthStore();

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer]);

  // Lock countdown
  useEffect(() => {
    if (!lockUntil) return;

    const updateLock = () => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        setLockTimer(0);
        setWrongAttempts(0);
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      } else {
        setLockTimer(remaining);
      }
    };

    updateLock();
    lockTimerRef.current = setInterval(updateLock, 1000);

    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [lockUntil]);

  const shakeBoxes = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const clearOtp = useCallback(() => {
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }, []);

  const handleVerify = useCallback(async (code: string) => {
    if (isVerifying || lockUntil) return;

    setIsVerifying(true);
    try {
      const success = isEmailMode
        ? await verifyEmailOtp(email, code)
        : await verifyOtp(phone, code);
      if (success) {
        if (isNewUser) {
          navigation.replace('ProfileSetup');
        } else {
          navigation.replace('Main');
        }
      } else {
        const newAttempts = wrongAttempts + 1;
        setWrongAttempts(newAttempts);
        shakeBoxes();
        clearOtp();

        if (newAttempts >= REFERRAL_LIMITS.maxWrongOtp) {
          const lockTime = Date.now() + REFERRAL_LIMITS.otpLockMinutes * 60 * 1000;
          setLockUntil(lockTime);
        }
      }
    } catch {
      shakeBoxes();
      clearOtp();
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, lockUntil, phone, email, isEmailMode, wrongAttempts, verifyOtp, verifyEmailOtp, isNewUser, navigation, shakeBoxes, clearOtp]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (lockUntil) return;

    // Only accept single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (digit && index === OTP_LENGTH - 1) {
      const code = newOtp.join('');
      if (code.length === OTP_LENGTH) {
        handleVerify(code);
      }
    }
  }, [otp, lockUntil, handleVerify]);

  const handleKeyPress = useCallback((index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  }, [otp]);

  const handleResend = useCallback(async () => {
    if (timer > 0 || resendCount >= REFERRAL_LIMITS.maxResendOtp) return;

    const success = isEmailMode
      ? await sendEmailOtp(email)
      : await sendOtp(phone);
    if (success) {
      setResendCount((prev) => prev + 1);
      setTimer(REFERRAL_LIMITS.otpTimerSeconds);
      clearOtp();
      Alert.alert('OTP', 'OTP \u092B\u093F\u0930 \u0938\u0947 \u092D\u0947\u091C\u093E \u0917\u092F\u093E');
    } else {
      Alert.alert('\u0924\u094D\u0930\u0941\u091F\u093F', 'OTP \u0928\u0939\u0940\u0902 \u092D\u0947\u091C \u092A\u093E\u092F\u093E');
    }
  }, [timer, resendCount, phone, email, isEmailMode, sendOtp, sendEmailOtp, clearOtp]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLocked = lockUntil !== null && lockUntil > Date.now();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>OTP {'\u0921\u093E\u0932\u0947\u0902'}</Text>
        <Text style={styles.subtitle}>
          {isEmailMode
            ? `6 अंकों का OTP ${maskedEmail} पर भेजा गया`
            : `6 अंकों का OTP +91-${maskedPhone} पर भेजा गया`}
        </Text>

        {/* Lock Message */}
        {isLocked && (
          <View style={styles.lockBanner}>
            <Text style={styles.lockText}>
              {'\u092C\u0939\u0941\u0924 \u0905\u0927\u093F\u0915 \u0917\u0932\u0924 \u092A\u094D\u0930\u092F\u093E\u0938\u0964'} {formatTime(lockTimer)} {'\u092E\u0947\u0902 \u092B\u093F\u0930 \u0938\u0947 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902'}
            </Text>
          </View>
        )}

        {/* OTP Boxes */}
        <Animated.View
          style={[
            styles.otpRow,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                isLocked ? styles.otpBoxDisabled : null,
              ]}
              value={digit}
              onChangeText={(v) => handleOtpChange(index, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!isLocked && !isVerifying}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {/* Wrong OTP message */}
        {wrongAttempts > 0 && !isLocked && (
          <Text style={styles.errorText}>
            {'\u0917\u0932\u0924'} OTP, {'\u092B\u093F\u0930 \u0938\u0947 \u0921\u093E\u0932\u0947\u0902'}
          </Text>
        )}

        {/* Verifying indicator */}
        {isVerifying && (
          <ActivityIndicator
            size="small"
            color={Colors.haldiGold}
            style={styles.verifyingSpinner}
          />
        )}

        {/* Resend Section */}
        <View style={styles.resendSection}>
          {resendCount >= REFERRAL_LIMITS.maxResendOtp ? (
            <Text style={styles.resendDisabledText}>
              {'\u092C\u093E\u0926 \u092E\u0947\u0902 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902'}
            </Text>
          ) : timer > 0 ? (
            <Text style={styles.timerText}>
              {'\u092B\u093F\u0930 \u0938\u0947 \u092D\u0947\u091C\u0947\u0902'} {formatTime(timer)} {'\u092E\u0947\u0902'}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={isLocked}>
              <Text style={[styles.resendText, isLocked && styles.resendTextDisabled]}>
                OTP {'\u092B\u093F\u0930 \u0938\u0947 \u092D\u0947\u091C\u0947\u0902'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    backgroundColor: Colors.cream,
  },
  backButton: {
    marginBottom: Spacing.xxl,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: Colors.brown,
  },
  title: {
    ...Typography.h2,
    fontSize: 24,
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
    marginBottom: Spacing.xxxl,
    lineHeight: 24,
  },
  lockBanner: {
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  lockText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  otpBox: {
    width: 52,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brown,
  },
  otpBoxFilled: {
    borderColor: Colors.haldiGold,
    backgroundColor: Colors.cream,
  },
  otpBoxDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.gray100,
  },
  errorText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  verifyingSpinner: {
    marginVertical: Spacing.lg,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  timerText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
  },
  resendText: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.haldiGold,
    fontWeight: '600',
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  resendDisabledText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray500,
  },
});
