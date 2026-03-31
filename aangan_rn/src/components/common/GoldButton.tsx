import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface GoldButtonProps {
  title: string;
  titleHindi?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.haldiGold, text: Colors.white },
  secondary: { bg: Colors.white, text: Colors.haldiGold, border: Colors.haldiGold },
  danger: { bg: Colors.error, text: Colors.white },
};

export default function GoldButton({
  title,
  titleHindi,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  fullWidth = true,
}: GoldButtonProps) {
  const v = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
        fullWidth ? styles.fullWidth : undefined,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? Colors.haldiGold : Colors.white}
        />
      ) : (
        <View style={styles.textContainer}>
          {titleHindi && (
            <Text style={[styles.titleHindi, { color: v.text }]}>
              {titleHindi}
            </Text>
          )}
          <Text style={[styles.title, { color: v.text }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleHindi: {
    ...Typography.button,
    fontSize: 18,
  },
  title: {
    ...Typography.bodySmall,
    fontSize: 13,
    marginTop: 2,
  },
});
