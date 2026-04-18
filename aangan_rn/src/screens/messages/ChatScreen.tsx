import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useMessageStore, DirectMessage } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import VoiceMicButton from '../../components/voice/VoiceMicButton';

// ─── Navigation types ─────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<any, 'Chat'>;

interface RouteParams {
  otherUserId: string;
  otherUserName: string;
  otherUserNameHindi?: string;
  otherUserPhoto?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('hi-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Returns a Hindi/English date separator label for a given ISO date string. */
function dateSeparatorLabel(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'आज';
  if (sameDay(date, yesterday)) return 'कल';

  return date.toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'long',
  });
}

/** Returns true if two ISO strings are from different calendar days. */
function isDifferentDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() !== db.getFullYear() ||
    da.getMonth() !== db.getMonth() ||
    da.getDate() !== db.getDate()
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={separatorStyles.row}>
      <View style={separatorStyles.line} />
      <Text style={separatorStyles.label}>{label}</Text>
      <View style={separatorStyles.line} />
    </View>
  );
}

const separatorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.xxl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  label: {
    ...Typography.caption,
    color: Colors.gray500,
    marginHorizontal: Spacing.sm,
    fontSize: 12,
  },
});

interface BubbleItem {
  type: 'message';
  data: DirectMessage;
  showSeparator: boolean;
  separatorLabel: string;
}

function MessageBubble({
  item,
  isMine,
}: {
  item: BubbleItem;
  isMine: boolean;
}) {
  const { data: msg, showSeparator, separatorLabel } = item;

  return (
    <>
      {showSeparator ? <DateSeparator label={separatorLabel} /> : null}
      <View
        style={[
          bubbleStyles.row,
          isMine ? bubbleStyles.rowMine : bubbleStyles.rowTheirs,
        ]}
      >
        <View
          style={[
            bubbleStyles.bubble,
            isMine ? bubbleStyles.bubbleMine : bubbleStyles.bubbleTheirs,
          ]}
          accessibilityLabel={`${isMine ? 'आपका' : ''} संदेश: ${msg.content}`}
        >
          <Text
            style={[
              bubbleStyles.bubbleText,
              isMine ? bubbleStyles.bubbleTextMine : bubbleStyles.bubbleTextTheirs,
            ]}
          >
            {msg.content}
          </Text>
        </View>
        <Text
          style={[
            bubbleStyles.time,
            isMine ? bubbleStyles.timeMine : bubbleStyles.timeTheirs,
          ]}
        >
          {formatMessageTime(msg.created_at)}
        </Text>
      </View>
    </>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  rowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.lg,
    borderBottomRightRadius: 2,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 2,
    ...Shadow.sm,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: Colors.white,
    fontWeight: '500',
  },
  bubbleTextTheirs: {
    color: Colors.brown,
  },
  time: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray400,
    marginTop: 2,
  },
  timeMine: {
    alignSelf: 'flex-end',
  },
  timeTheirs: {
    alignSelf: 'flex-start',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }: Props) {
  const params = route.params as RouteParams;
  const { otherUserId, otherUserName, otherUserNameHindi, otherUserPhoto } = params;

  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const { messages, fetchMessages, sendMessage, markRead, subscribeToMessages, unsubscribeFromMessages } =
    useMessageStore();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const conversationMessages = messages[otherUserId] ?? [];

  // ─── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      await fetchMessages(otherUserId);
      await markRead(otherUserId);
      setInitialLoading(false);
    };
    load();

    subscribeToMessages((msg) => {
      // Scroll to bottom on incoming message in this conversation
      if (msg.sender_id === otherUserId) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    });

    return () => {
      markRead(otherUserId);
      unsubscribeFromMessages();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  // Scroll to bottom when messages load for the first time
  useEffect(() => {
    if (conversationMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 50);
    }
  }, [initialLoading]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setInputText('');
    setSending(true);
    const ok = await sendMessage(otherUserId, trimmed);
    setSending(false);

    if (ok) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [inputText, sending, sendMessage, otherUserId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Build list items with date separators ────────────────────────────────
  // FlatList is inverted, so visually newest messages appear at the bottom.
  // The data array is newest-first (index 0 = most recent).
  const listItems: BubbleItem[] = React.useMemo(() => {
    // conversationMessages from store are oldest-first (ascending created_at).
    // We reverse a copy so that index 0 = newest for the inverted FlatList.
    const reversed = [...conversationMessages].reverse();

    return reversed.map((msg, idx) => {
      const nextMsg = reversed[idx + 1]; // "older" neighbour in reversed array
      const showSeparator = !nextMsg || isDifferentDay(msg.created_at, nextMsg.created_at);
      const separatorLabel = showSeparator ? dateSeparatorLabel(msg.created_at) : '';

      return {
        type: 'message' as const,
        data: msg,
        showSeparator,
        separatorLabel,
      };
    });
  }, [conversationMessages]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const displayNameHindi = otherUserNameHindi || otherUserName;
  const nameInitial = displayNameHindi[0] || '?';
  const canSend = inputText.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="वापस जाएं"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>

        <View style={styles.headerUserInfo}>
          {otherUserPhoto ? (
            <Image
              source={{ uri: otherUserPhoto }}
              style={styles.headerAvatar}
              resizeMode="cover"
              accessibilityLabel={`${displayNameHindi} की फोटो`}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>{nameInitial}</Text>
            </View>
          )}
          <View style={styles.headerNameBlock}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayNameHindi}
            </Text>
            {otherUserNameHindi && otherUserName !== otherUserNameHindi ? (
              <Text style={styles.headerNameEn} numberOfLines={1}>
                {otherUserName}
              </Text>
            ) : null}
          </View>
          {/* Online indicator (always shown for MVP) */}
          <View style={styles.onlineDot} accessibilityLabel="ऑनलाइन" />
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Messages list (inverted so newest at bottom) */}
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.haldiGold} />
          <Text style={styles.loadingText}>संदेश लोड हो रहे हैं…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={(item) => item.data.id}
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              isMine={item.data.sender_id === currentUser?.id}
            />
          )}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>
                {'बातचीत शुरू करें!\nStart the conversation!'}
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: insets.bottom + Spacing.sm },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="संदेश लिखें… / Type a message"
          placeholderTextColor={Colors.gray400}
          value={inputText}
          onChangeText={(t) => setInputText(t.slice(0, 1000))}
          multiline
          maxLength={1000}
          returnKeyType="default"
          accessibilityLabel="संदेश लिखें"
          accessibilityHint="यहाँ संदेश टाइप करें"
        />
        <VoiceMicButton
          onTranscript={(text) => setInputText(prev => prev + ' ' + text)}
          mode="append"
          size={22}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : undefined,
          ]}
          onPress={handleSend}
          disabled={!canSend || sending}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="संदेश भेजें"
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendButtonIcon}>{'➤'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    ...Shadow.sm,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: Colors.brown,
    fontWeight: '600',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray200,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  headerNameBlock: {
    flex: 1,
  },
  headerName: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 16,
  },
  headerNameEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 12,
    lineHeight: 16,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.online,
    marginLeft: Spacing.xs,
  },
  headerRight: {
    width: DADI_MIN_TAP_TARGET,
  },

  // Messages list
  listContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: DADI_MIN_TAP_TARGET,
    maxHeight: 120,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.brown,
  },
  sendButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    borderRadius: DADI_MIN_TAP_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.haldiGold,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendButtonIcon: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
});
