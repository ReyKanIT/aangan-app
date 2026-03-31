import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

interface LoadingScreenProps {
  message?: string;
  messageHindi?: string;
}

export default function LoadingScreen({ message, messageHindi }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.haldiGold} />
      {messageHindi && (
        <Text style={styles.messageHindi}>{messageHindi}</Text>
      )}
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  messageHindi: {
    ...Typography.h3,
    color: Colors.brown,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  message: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
