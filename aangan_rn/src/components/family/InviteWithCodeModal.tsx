import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { supabase } from '../../config/supabase';
import { secureLog } from '../../utils/security';

/**
 * Coded family invite — pre-set relationship, one-time-use, 30-day expiry.
 * On confirm: creates the invite via RPC, opens WhatsApp share with the
 * pre-filled Hindi message + magic link `https://aangan.app/join/<code>`.
 *
 * The existing generic WhatsApp invite (no code, no relationship) stays as-is
 * in FamilyTreeScreen — both flows coexist. Code-based invites give better
 * conversion + auto-add the inviter's relationship on claim.
 */

interface RelationshipOption {
  key: string;
  hindi: string;
  english: string;
  level: 1 | 2 | 3;
  reverseKey: string;
  reverseHindi: string;
}

// Curated set of common invitable relationships with the reciprocal pre-set
// so the inviter doesn't have to think about reverse relationships.
// (For "Other / custom", the user uses the existing add-by-search flow.)
const INVITABLE_RELATIONSHIPS: RelationshipOption[] = [
  // L1
  { key: 'father', hindi: 'पिता', english: 'Father', level: 1, reverseKey: 'son', reverseHindi: 'बेटा' },
  { key: 'mother', hindi: 'माँ', english: 'Mother', level: 1, reverseKey: 'son', reverseHindi: 'बेटा' },
  { key: 'son', hindi: 'बेटा', english: 'Son', level: 1, reverseKey: 'father', reverseHindi: 'पिता' },
  { key: 'daughter', hindi: 'बेटी', english: 'Daughter', level: 1, reverseKey: 'father', reverseHindi: 'पिता' },
  { key: 'brother', hindi: 'भाई', english: 'Brother', level: 1, reverseKey: 'brother', reverseHindi: 'भाई' },
  { key: 'sister', hindi: 'बहन', english: 'Sister', level: 1, reverseKey: 'brother', reverseHindi: 'भाई' },
  { key: 'husband', hindi: 'पति', english: 'Husband', level: 1, reverseKey: 'wife', reverseHindi: 'पत्नी' },
  { key: 'wife', hindi: 'पत्नी', english: 'Wife', level: 1, reverseKey: 'husband', reverseHindi: 'पति' },
  // L2
  { key: 'grandfather_paternal', hindi: 'दादा', english: 'Grandfather (paternal)', level: 2, reverseKey: 'grandson_paternal', reverseHindi: 'पोता' },
  { key: 'grandmother_paternal', hindi: 'दादी', english: 'Grandmother (paternal)', level: 2, reverseKey: 'grandson_paternal', reverseHindi: 'पोता' },
  { key: 'grandfather_maternal', hindi: 'नाना', english: 'Grandfather (maternal)', level: 2, reverseKey: 'grandson_maternal', reverseHindi: 'नाती' },
  { key: 'grandmother_maternal', hindi: 'नानी', english: 'Grandmother (maternal)', level: 2, reverseKey: 'grandson_maternal', reverseHindi: 'नाती' },
  { key: 'father_in_law', hindi: 'ससुर', english: 'Father-in-law', level: 2, reverseKey: 'son_in_law', reverseHindi: 'दामाद' },
  { key: 'mother_in_law', hindi: 'सास', english: 'Mother-in-law', level: 2, reverseKey: 'daughter_in_law', reverseHindi: 'बहू' },
  { key: 'bhabhi', hindi: 'भाभी', english: "Brother's wife", level: 2, reverseKey: 'devar', reverseHindi: 'देवर' },
  { key: 'devar', hindi: 'देवर', english: "Husband's younger brother", level: 2, reverseKey: 'bhabhi', reverseHindi: 'भाभी' },
  // L3
  { key: 'tau', hindi: 'ताऊ', english: "Father's elder brother", level: 3, reverseKey: 'bhatija', reverseHindi: 'भतीजा' },
  { key: 'uncle_paternal', hindi: 'चाचा', english: "Father's younger brother", level: 3, reverseKey: 'bhatija', reverseHindi: 'भतीजा' },
  { key: 'aunt_paternal', hindi: 'चाची', english: "Chacha's wife", level: 3, reverseKey: 'bhatija', reverseHindi: 'भतीजा' },
  { key: 'bua', hindi: 'बुआ', english: "Father's sister", level: 3, reverseKey: 'bhatija', reverseHindi: 'भतीजा' },
  { key: 'fufa', hindi: 'फूफा', english: "Bua's husband", level: 3, reverseKey: 'bhatija', reverseHindi: 'भतीजा' },
  { key: 'uncle_maternal', hindi: 'मामा', english: "Mother's brother", level: 3, reverseKey: 'bhanja', reverseHindi: 'भांजा' },
  { key: 'aunt_maternal', hindi: 'मामी', english: "Mama's wife", level: 3, reverseKey: 'bhanja', reverseHindi: 'भांजा' },
  { key: 'mausi', hindi: 'मौसी', english: "Mother's sister", level: 3, reverseKey: 'bhanja', reverseHindi: 'भांजा' },
  { key: 'cousin_brother_paternal', hindi: 'चचेरा भाई', english: 'Cousin brother (paternal)', level: 3, reverseKey: 'cousin_brother_paternal', reverseHindi: 'चचेरा भाई' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  inviterDisplayName?: string;
}

export default function InviteWithCodeModal({
  visible,
  onClose,
  inviterDisplayName,
}: Props) {
  const [selected, setSelected] = useState<RelationshipOption | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setSelected(null);
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const { data: code, error } = await supabase.rpc('create_family_invite', {
        p_relationship_type: selected.key,
        p_relationship_label_hindi: selected.hindi,
        p_connection_level: selected.level,
        p_reverse_relationship_type: selected.reverseKey,
        p_reverse_relationship_label_hindi: selected.reverseHindi,
      });
      if (error || !code || typeof code !== 'string') {
        secureLog.error('[InviteWithCode] create failed', error);
        Alert.alert(
          'आमंत्रण नहीं बना',
          'कुछ देर में फिर कोशिश करें।'
        );
        setCreating(false);
        return;
      }

      const link = `https://aangan.app/join/${code}`;
      const inviter = inviterDisplayName || 'मैंने';
      const message =
        `🏡 आँगन पर हमारे परिवार से जुड़ें!\n\n` +
        `${inviter} ने आपको ${selected.hindi} के रूप में हमारे Aangan परिवार में बुलाया है।\n\n` +
        `नीचे दिए गए लिंक पर टैप करें और हमारे परिवार से जुड़ें:\n` +
        `${link}\n\n` +
        `Aangan एक हिंदी-फर्स्ट परिवार सोशल नेटवर्क है। ` +
        `दादी भी आसानी से चला सकती हैं! 💛`;

      // Prefer WhatsApp; fall back to native share sheet so iOS users
      // without WhatsApp can pick another channel.
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl).catch(() => false);

      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl).catch(() => {
          /* swallow — Share fallback below */
        });
      } else {
        await Share.share({ message }).catch(() => {
          Alert.alert(
            'WhatsApp नहीं मिला',
            'कोड कॉपी करें: ' + code,
            [{ text: 'ठीक है' }]
          );
        });
      }

      // Reset + close after share sheet dismisses (no callback in RN Share API,
      // but UX is the user navigated away; on return the modal is fresh).
      handleClose();
    } catch (e) {
      secureLog.error('[InviteWithCode] unexpected error', e);
      Alert.alert('दिक्कत', 'कुछ देर में फिर कोशिश करें।');
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>WhatsApp पर आमंत्रित करें</Text>
          <Text style={styles.subtitle}>Invite via WhatsApp</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.prompt}>
          आप किसको बुला रहे हैं? रिश्ता चुनें:
        </Text>
        <Text style={styles.promptEn}>Who are you inviting?</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3].map((level) => (
            <View key={level} style={styles.section}>
              <Text style={styles.levelLabel}>
                {level === 1
                  ? 'सीधा परिवार · L1'
                  : level === 2
                    ? 'करीबी परिवार · L2'
                    : 'विस्तृत परिवार · L3'}
              </Text>
              <View style={styles.chipRow}>
                {INVITABLE_RELATIONSHIPS.filter((r) => r.level === level).map(
                  (r) => {
                    const isSelected = selected?.key === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setSelected(r)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {r.hindi}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {selected && (
          <View style={styles.previewBar}>
            <Text style={styles.previewText}>
              आप उन्हें <Text style={styles.previewHi}>{selected.hindi}</Text>{' '}
              के रूप में जोड़ रहे हैं — वे आपको{' '}
              <Text style={styles.previewHi}>{selected.reverseHindi}</Text> कहेंगे।
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selected || creating) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!selected || creating}
        >
          {creating ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.sendButtonText}>
              📱 WhatsApp पर भेजें
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingTop: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,168,75,0.2)',
  },
  title: {
    ...Typography.h2,
    fontSize: 22,
    color: Colors.brown,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    color: Colors.gray600,
  },
  prompt: {
    ...Typography.body,
    fontSize: 17,
    color: Colors.brown,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  promptEn: {
    ...Typography.caption,
    color: Colors.gray500,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.lg },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  levelLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.haldiGold,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(200,168,75,0.3)',
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  chipText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
  },
  chipTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  previewBar: {
    backgroundColor: 'rgba(122,154,58,0.08)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(122,154,58,0.2)',
  },
  previewText: {
    ...Typography.caption,
    color: Colors.brown,
    fontSize: 14,
    lineHeight: 20,
  },
  previewHi: {
    fontWeight: '700',
    color: Colors.mehndiGreen,
  },
  sendButton: {
    backgroundColor: Colors.mehndiGreen,
    margin: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
