import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { secureLog } from '../../utils/security';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinFamily'>;

const PENDING_JOIN_KEY = '@aangan/pending_join_code';

interface InviteLookup {
  found: boolean;
  state?: 'active' | 'expired' | 'claimed' | 'revoked';
  error?: string;
  inviter_display_name?: string;
  inviter_display_name_hindi?: string;
  inviter_avatar_url?: string;
  relationship_label_hindi?: string;
  reverse_relationship_label_hindi?: string;
  expires_at?: string;
}

/**
 * Persist a pending invite code so it survives the auth flow. SplashScreen
 * + this screen consume it.
 */
export async function setPendingJoinCode(code: string | null): Promise<void> {
  try {
    if (code) await AsyncStorage.setItem(PENDING_JOIN_KEY, code);
    else await AsyncStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    /* best-effort */
  }
}

export async function getPendingJoinCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_JOIN_KEY);
  } catch {
    return null;
  }
}

export default function JoinFamilyScreen({ navigation, route }: Props) {
  const code = (route.params?.code || '').toUpperCase();
  const session = useAuthStore((s) => s.session);

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch invite on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        setInvite({ found: false, error: 'invalid_code' });
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('lookup_invite', {
          p_code: code,
          p_user_agent: 'aangan-rn',
          p_referer: null,
        });
        if (cancelled) return;
        if (error) {
          setInvite({ found: false, error: 'lookup_error' });
        } else {
          setInvite((data ?? { found: false, error: 'empty' }) as InviteLookup);
        }
      } catch (e) {
        if (cancelled) return;
        secureLog.error('[JoinFamily] lookup failed', e);
        setInvite({ found: false, error: 'network_error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const onClaim = async () => {
    if (!session) {
      // Not signed in — persist the code and route to Login.
      // Splash will pick it up after auth completes.
      await setPendingJoinCode(code);
      navigation.replace('Login');
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_family_invite', {
        p_code: code,
      });
      if (error) {
        Alert.alert(
          'जुड़ने में दिक्कत',
          error.message || 'कृपया बाद में फिर कोशिश करें।'
        );
        return;
      }
      const result = data as
        | { success: boolean; error?: string; idempotent?: boolean }
        | null;
      if (!result?.success) {
        const reason = result?.error || 'unknown';
        const msg =
          reason === 'expired'
            ? 'यह आमंत्रण समाप्त हो गया है।'
            : reason === 'already_claimed'
              ? 'यह आमंत्रण पहले उपयोग किया जा चुका है।'
              : reason === 'revoked'
                ? 'यह आमंत्रण रद्द कर दिया गया है।'
                : reason === 'self_claim'
                  ? 'आप अपने ही आमंत्रण को स्वीकार नहीं कर सकते।'
                  : 'जुड़ने में दिक्कत हुई।';
        Alert.alert('आमंत्रण उपलब्ध नहीं', msg);
        return;
      }
      await setPendingJoinCode(null);
      setDone(true);
    } catch (e) {
      secureLog.error('[JoinFamily] claim failed', e);
      Alert.alert('दिक्कत', 'नेटवर्क की समस्या है। कुछ देर में फिर कोशिश करें।');
    } finally {
      setClaiming(false);
    }
  };

  const onSkip = async () => {
    await setPendingJoinCode(null);
    if (session) {
      navigation.replace('Main');
    } else {
      navigation.replace('Login');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={styles.loadingText}>आमंत्रण देख रहे हैं…</Text>
      </View>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>परिवार में स्वागत है!</Text>
          <Text style={styles.successBody}>
            आप अब{' '}
            {invite?.inviter_display_name_hindi ||
              invite?.inviter_display_name ||
              'अपने'}{' '}
            के परिवार से जुड़ गए हैं।
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.replace('Main')}
          >
            <Text style={styles.primaryButtonText}>परिवार देखें</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Error / unavailable ────────────────────────────────────────────────
  if (!invite || !invite.found || invite.state !== 'active') {
    const reason = invite?.error || invite?.state || 'unknown';
    const msg =
      reason === 'invalid_code'
        ? 'यह कोड सही नहीं है।'
        : reason === 'not_found'
          ? 'यह आमंत्रण कोड मौजूद नहीं है।'
          : reason === 'expired'
            ? 'यह आमंत्रण समाप्त हो गया है।'
            : reason === 'claimed'
              ? 'यह आमंत्रण पहले उपयोग किया जा चुका है।'
              : reason === 'revoked'
                ? 'यह आमंत्रण रद्द कर दिया गया है।'
                : 'कुछ गड़बड़ है। कृपया लिंक दोबारा मांगें।';
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.errorEmoji}>🤔</Text>
          <Text style={styles.errorTitle}>आमंत्रण उपलब्ध नहीं</Text>
          <Text style={styles.errorBody}>{msg}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={onSkip}>
            <Text style={styles.primaryButtonText}>आगे बढ़ें</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Active invite ─────────────────────────────────────────────────────
  const inviterName =
    invite.inviter_display_name_hindi ||
    invite.inviter_display_name ||
    'किसी';
  const relLabel = invite.relationship_label_hindi || 'परिवार';
  const reverseLabel = invite.reverse_relationship_label_hindi;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {invite.inviter_avatar_url ? (
            <Image
              source={{ uri: invite.inviter_avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>
                {inviterName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.inviteLabel}>परिवार आमंत्रण</Text>
        <Text style={styles.inviterName}>{inviterName}</Text>
        <Text style={styles.relText}>
          ने आपको <Text style={styles.relHighlight}>{relLabel}</Text> के रूप में
          बुलाया है
        </Text>
        {reverseLabel && (
          <Text style={styles.reverseText}>
            आप उन्हें <Text style={styles.reverseHighlight}>{reverseLabel}</Text>{' '}
            कहेंगे
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.question}>क्या आप जुड़ना चाहते हैं?</Text>

        <TouchableOpacity
          style={[styles.primaryButton, claiming && styles.buttonDisabled]}
          onPress={onClaim}
          disabled={claiming}
        >
          {claiming ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {session ? 'हाँ, जुड़ें' : 'लॉगिन करें और जुड़ें'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
          <Text style={styles.secondaryButtonText}>अभी नहीं</Text>
        </TouchableOpacity>

        <Text style={styles.codeLine}>कोड: {code}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
    textAlign: 'center',
    color: Colors.gray600,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.2)',
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: Colors.haldiGold,
  },
  avatarFallback: {
    backgroundColor: Colors.mehndiGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  inviteLabel: {
    ...Typography.caption,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  inviterName: {
    ...Typography.h2,
    fontSize: 24,
    color: Colors.brown,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  relText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray700,
    textAlign: 'center',
  },
  relHighlight: {
    fontWeight: '700',
    color: Colors.haldiGold,
  },
  reverseText: {
    ...Typography.caption,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  reverseHighlight: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(200,168,75,0.2)',
    alignSelf: 'stretch',
    marginVertical: Spacing.lg,
  },
  question: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brown,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.mehndiGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignSelf: 'stretch',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignSelf: 'stretch',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.gray600,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.h2,
    fontSize: 24,
    color: Colors.brown,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray700,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.h2,
    fontSize: 22,
    color: Colors.brown,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorBody: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  codeLine: {
    ...Typography.caption,
    color: Colors.gray400,
    marginTop: Spacing.lg,
    fontFamily: 'monospace',
  },
});
