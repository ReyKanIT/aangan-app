import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

interface VoicePermissionGateProps {
  visible: boolean;
  onGranted: () => void;
  onDenied: () => void;
}

export const VoicePermissionGate: React.FC<VoicePermissionGateProps> = ({
  visible,
  onGranted,
  onDenied,
}) => {
  const handleAllow = useCallback(async () => {
    // In a real implementation, request microphone permission via
    // expo-speech-recognition or expo-av permission APIs:
    //   const { status } = await Audio.requestPermissionsAsync();
    //   if (status === 'granted') onGranted(); else onDenied();
    // For now, delegate to the caller:
    onGranted();
  }, [onGranted]);

  const handleDeny = useCallback(() => {
    onDenied();
  }, [onDenied]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDeny}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Icon */}
          <Text style={styles.icon}>🎤</Text>

          {/* Title */}
          <Text style={styles.title}>
            माइक्रोफ़ोन की अनुमति दें
          </Text>
          <Text style={styles.subtitle}>Allow Microphone Access</Text>

          {/* Description */}
          <Text style={styles.description}>
            Aangan को आपकी आवाज़ सुनने के लिए माइक्रोफ़ोन की ज़रूरत है।
          </Text>
          <Text style={styles.descriptionEn}>
            Aangan needs microphone access to hear your voice.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleDeny}
              activeOpacity={0.7}
              accessibilityLabel="बाद में"
              accessibilityRole="button"
              style={styles.laterButton}
            >
              <Text style={styles.laterButtonText}>
                बाद में / Later
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAllow}
              activeOpacity={0.7}
              accessibilityLabel="अनुमति दें"
              accessibilityRole="button"
              style={styles.allowButton}
            >
              <Text style={styles.allowButtonText}>
                अनुमति दें / Allow
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  descriptionEn: {
    ...Typography.bodySmall,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  laterButton: {
    flex: 1,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    ...Typography.buttonSmall,
    color: Colors.gray600,
  },
  allowButton: {
    flex: 1,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonText: {
    ...Typography.buttonSmall,
    color: Colors.white,
  },
});

export default VoicePermissionGate;
