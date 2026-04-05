import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useNotificationStore } from '../../stores/notificationStore';
import { useLanguageStore } from '../../stores/languageStore';
import type { Notification, NotificationType } from '../../types/database';

type Props = NativeStackScreenProps<any, 'Notifications'>;
type TabKey = 'all' | 'invitations' | 'comments' | 'reactions';

// -- Helpers --

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  new_post: '📝',
  new_comment: '💬',
  comment_reply: '↩️',
  new_message: '✉️',
  event_invite: '🎉',
  rsvp_update: '📋',
  new_family_member: '👨‍👩‍👧‍👦',
  photo_approved: '📸',
  storage_upgrade: '📦',
  referral_verified: '🎁',
};

const TAB_TYPES: Record<TabKey, NotificationType[]> = {
  all: [],
  invitations: ['event_invite', 'new_family_member'],
  comments: ['new_comment', 'comment_reply'],
  reactions: ['new_post', 'rsvp_update', 'photo_approved'],
};

const TAB_LABELS: { key: TabKey; hi: string; en: string }[] = [
  { key: 'all', hi: 'सभी', en: 'All' },
  { key: 'invitations', hi: 'आमंत्रण', en: 'Invitations' },
  { key: 'comments', hi: 'टिप्पणियाँ', en: 'Comments' },
  { key: 'reactions', hi: 'प्रतिक्रियाएँ', en: 'Reactions' },
];

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'अभी';
  if (diffMin < 60) return `${diffMin} मिनट पहले`;
  if (diffHr < 24) return `${diffHr} घंटे पहले`;
  if (diffDay < 7) return `${diffDay} दिन पहले`;
  return date.toLocaleDateString('hi-IN');
}

function getNotificationRoute(notification: Notification): { screen: string; params?: Record<string, any> } | null {
  const { type, data } = notification;

  switch (type) {
    case 'new_post':
    case 'new_comment':
      return data?.post_id ? { screen: 'PostDetail', params: { postId: data.post_id } } : null;
    case 'event_invite':
    case 'rsvp_update':
      return data?.event_id ? { screen: 'EventDetail', params: { eventId: data.event_id } } : null;
    case 'new_family_member':
      return { screen: 'FamilyTree' };
    case 'photo_approved':
      return data?.event_id ? { screen: 'EventPhotos', params: { eventId: data.event_id } } : null;
    case 'storage_upgrade':
    case 'referral_verified':
      return { screen: 'Settings' };
    default:
      return null;
  }
}

// -- Sub-components --

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const icon = NOTIFICATION_ICONS[notification.type] || '🔔';
  const timeAgo = useMemo(() => getTimeAgo(notification.created_at), [notification.created_at]);

  return (
    <TouchableOpacity
      style={[
        itemStyles.container,
        !notification.is_read && itemStyles.containerUnread,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title_hindi || notification.title}. ${notification.is_read ? 'Read' : 'Unread'}`}
    >
      <View style={itemStyles.iconContainer}>
        <Text style={itemStyles.icon}>{icon}</Text>
      </View>

      <View style={itemStyles.content}>
        <Text style={[
          itemStyles.title,
          !notification.is_read && itemStyles.titleUnread,
        ]} numberOfLines={2}>
          {notification.title_hindi || notification.title}
        </Text>

        <Text style={itemStyles.body} numberOfLines={2}>
          {notification.body_hindi || notification.body}
        </Text>

        <Text style={itemStyles.time}>{timeAgo}</Text>
      </View>

      {!notification.is_read && (
        <View style={itemStyles.unreadDot} />
      )}
    </TouchableOpacity>
  );
}

function EmptyNotifications() {
  const { isHindi } = useLanguageStore();
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{'🔔'}</Text>
      <Text style={emptyStyles.title}>{isHindi ? 'कोई सूचना नहीं' : 'No notifications'}</Text>
      <Text style={emptyStyles.subtitle}>{isHindi ? 'No notifications yet' : 'You\'re all caught up!'}</Text>
    </View>
  );
}

// -- Main Component --

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllRead,
    subscribeToRealtime,
    unsubscribeFromRealtime,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    subscribeToRealtime();

    return () => {
      unsubscribeFromRealtime();
    };
  }, []);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    const allowed = TAB_TYPES[activeTab];
    return notifications.filter((n) => allowed.includes(n.type));
  }, [notifications, activeTab]);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant screen
    const route = getNotificationRoute(notification);
    if (route) {
      navigation.navigate(route.screen, route.params);
    }
  }, [markAsRead, navigation]);

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <NotificationItem notification={item} onPress={handleNotificationPress} />
  ), [handleNotificationPress]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>{'←'}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{isHindi ? 'सूचनाएँ' : 'Notifications'}</Text>

          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={styles.markAllText}>{isHindi ? 'सभी पढ़ी हुई' : 'Mark all read'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}
        >
          {TAB_LABELS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {isHindi ? tab.hi : tab.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Loading */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.haldiGold} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyNotifications />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={[Colors.haldiGold]}
              tintColor={Colors.haldiGold}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: Colors.brown,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  markAllButton: {
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllText: {
    ...Typography.labelSmall,
    color: Colors.haldiGold,
    fontWeight: '600',
  },
  tabsScroll: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.haldiGold,
  },
  tabText: {
    ...Typography.label,
    fontSize: 14,
    color: Colors.brown,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
});

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  containerUnread: {
    backgroundColor: Colors.unreadBg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    color: Colors.brown,
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: '600',
  },
  body: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginBottom: Spacing.xs,
  },
  time: {
    ...Typography.caption,
    color: Colors.gray500,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.haldiGold,
    marginLeft: Spacing.sm,
    marginTop: 6,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
  },
});
