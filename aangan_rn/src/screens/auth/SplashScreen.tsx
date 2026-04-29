import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import {
  getPendingJoinCode,
  setPendingJoinCode,
} from '../family/JoinFamilyScreen';

type Props = NativeStackScreenProps<any, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { initialize, session, isNewUser, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    timerRef.current = setTimeout(async () => {
      if (session) {
        if (isNewUser) {
          navigation.replace('ProfileSetup');
        } else {
          // After session-positive routing to Main, check for a pending
          // family-invite code stored before the auth flow. If found, push
          // JoinFamily on top so the user lands on their invite, not a
          // generic feed.
          navigation.replace('Main');
          const pending = await getPendingJoinCode();
          if (pending) {
            await setPendingJoinCode(null);
            navigation.navigate('JoinFamily', { code: pending });
          }
        }
      } else {
        navigation.replace('Login');
      }
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, session, isNewUser, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appTitle}>AANGAN</Text>
        <Text style={styles.appSubtitle}>{'\u0906\u0901\u0917\u0928'}</Text>
        <Text style={styles.tagline}>Your Family</Text>
      </View>
      <ActivityIndicator
        size="large"
        color={Colors.haldiGold}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  appTitle: {
    ...Typography.appTitle,
    fontSize: 48,
    fontWeight: '700',
    color: Colors.haldiGold,
  },
  appSubtitle: {
    ...Typography.appSubtitle,
    fontSize: 24,
    color: Colors.brown,
    marginTop: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
    marginTop: Spacing.md,
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});
