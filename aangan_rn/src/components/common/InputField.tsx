import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

interface InputFieldProps {
  label: string;
  labelHindi?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  prefix?: string;
  required?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
}

export default function InputField({
  label,
  labelHindi,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  maxLength,
  multiline = false,
  prefix,
  required = false,
  editable = true,
  secureTextEntry,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        {labelHindi && (
          <Text style={styles.labelHindi}>
            {labelHindi}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <Text style={styles.labelEn}>
          {label}
          {!labelHindi && required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      {/* Input Row */}
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          error ? styles.inputRowError : undefined,
          multiline && styles.inputRowMultiline,
        ]}
      >
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            prefix ? styles.inputWithPrefix : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray400}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>

      {/* Error */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    marginBottom: Spacing.sm,
  },
  labelHindi: {
    ...Typography.label,
    color: Colors.brown,
  },
  labelEn: {
    ...Typography.labelSmall,
    color: Colors.brownLight,
    marginTop: 2,
  },
  required: {
    color: Colors.error,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    overflow: 'hidden',
  },
  inputRowFocused: {
    borderColor: Colors.haldiGold,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  inputRowMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  prefixBox: {
    paddingHorizontal: Spacing.lg,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: Colors.creamDark,
    borderRightWidth: 1,
    borderRightColor: Colors.gray300,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  prefixText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brown,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    color: Colors.brown,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  inputWithPrefix: {
    paddingLeft: Spacing.md,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
