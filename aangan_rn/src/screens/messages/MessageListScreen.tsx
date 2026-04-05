import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useMessageStore, ConversationSummary, DirectMessage } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';

// ─── Navigation types ─────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<any, 'MessageList'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatConversationTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'अभी';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'कल';
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: ConversationSummary;
  onPress: () => void;
}) {
  const {
    displayName,
    displayNameHindi,
    profilePhotoUrl,
    lastMessage,
    lastMessageAt,
    unreadCount,
  } = conversation;

  const hasUnread = unreadCount > 0;
  const nameHindi = displayNameHindi || displayName;
  const initial = nameHindi[0] || '?';
  const timeLabel = formatConversationTime(lastMessageAt);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${nameHindi} से बातचीत${hasUnread ? `, ${unreadCount} नए संदेश` : ''}`}
    >
      {/* Avatar with unread dot */}
      <View style={styles.avatarContainer}>
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityLabel={`${nameHindi} की फोटो`}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        {hasUnread ? <View style={styles.unreadDot} accessibilityLabel="अपठित संदेश" /> : null}
      </View>

      {/* Content: names + last message */}
      <View style={styles.rowContent}>
        <View style={styles.nameTimeRow}>
          <Text
            style={[styles.nameHindi, hasUnread && styles.nameHindiBold]}
            numberOfLines={1}
          >
            {nameHindi}
          </Text>
          <Text style={styles.timeText}>{timeLabel}</Text>
        </View>

        {displayNameHindi && displayName !== displayNameHindi ? (
          <Text style={styles.nameEn} numberOfLines={1}>
            {displayName}
          </Text>
        ) : null}

        <View style={styles.previewRow}>
          <Text
            style={[styles.previewText, hasUnread && styles.previewTextUnread]}
            numberOfLines={1}
          >
            {lastMessage}
          </Text>
          {hasUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessageListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    conversations,
    totalUnread,
    loadingConversations,
    fetchConversations,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useMessageStore();

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();

    subscribeToMessages((_msg: DirectMessage) => {
      // On incoming message while on this screen, refresh conversation list
      fetchConversations();
    });

    return () => {
      unsubscribeFromMessages();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: tab badge for unread messages must be set from the tab navigator level
  // (e.g. in AppNavigator via a shared store subscription), not from a stack screen.

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleConversationPress = useCallback(
    (conversation: ConversationSummary) => {
      navigation.navigate('Chat', {
        otherUserId: conversation.userId,
        otherUserName: conversation.displayName,
        otherUserNameHindi: conversation.displayNameHindi ?? undefined,
        otherUserPhoto: conversation.profilePhotoUrl ?? undefined,
      });
    },
    [navigation]
  );

  const handleRefresh = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{'संदेश / Messages'}</Text>
          {totalUnread > 0 ? (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Compose button */}
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => {
            // TODO: navigate to a family-member picker when that screen is built
            Alert.alert(
              'नया संदेश / New Message',
              'किसी परिवार के सदस्य की प्रोफ़ाइल से संदेश भेजें।\n\nOpen a family member\'s profile to start a new conversation.',
              [{ text: 'ठीक है', style: 'default' }]
            );
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="नया संदेश लिखें"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.composeButtonText}>{'✏️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation list */}
      {loadingConversations && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.haldiGold} />
          <Text style={styles.loadingText}>संदेश लोड हो रहे हैं…</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() => handleConversationPress(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{'💬'}</Text>
              <Text style={styles.emptyText}>
                {'अभी तक कोई संदेश नहीं\nNo messages yet'}
              </Text>
              <Text style={styles.emptySubText}>
                {'किसी परिवार के सदस्य को संदेश भेजें'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loadingConversations}
              onRefresh={handleRefresh}
              tintColor={Colors.haldiGold}
              colors={[Colors.haldiGold]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.brown,
    fontSize: 22,
  },
  headerUnreadBadge: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.round,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  headerUnreadText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  composeButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.round,
  },
  composeButtonText: {
    fontSize: 22,
  },

  // List
  listContent: {
    flexGrow: 1,
  },

  // Conversation row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    minHeight: DADI_MIN_TAP_TARGET + 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gray200,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.haldiGoldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.haldiGoldDark,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // Row content
  rowContent: {
    flex: 1,
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameHindi: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 16,
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameHindiBold: {
    fontWeight: '700',
  },
  timeText: {
    ...Typography.caption,
    color: Colors.gray400,
    fontSize: 12,
  },
  nameEn: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    fontSize: 14,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  previewText: {
    ...Typography.bodySmall,
    color: Colors.gray500,
    fontSize: 14,
    flex: 1,
  },
  previewTextUnread: {
    fontWeight: '600',
    color: Colors.brownLight,
  },
  unreadBadge: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.round,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: 52 + Spacing.lg + Spacing.md, // indent past avatar
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubText: {
    ...Typography.bodySmall,
    color: Colors.gray400,
    textAlign: 'center',
  },

  // Loading
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
});
