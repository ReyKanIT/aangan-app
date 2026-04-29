import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { secureLog } from '../utils/security';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  } as any),
});

/**
 * Register for push notifications and save the token to the user's profile.
 * Call this after login.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    secureLog.warn('Push notifications require a physical device');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses app.json > extra.eas.projectId
    });
    const token = tokenData.data;

    // Save token to user's profile in Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', session.user.id);
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Aangan Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C8A84B',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    secureLog.warn('Failed to get push token:', error);
    return null;
  }
}

/**
 * Listen for incoming notifications.
 * Returns cleanup function.
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

/**
 * Send a push notification to another user.
 *
 * 2026-04-29: routed through the new `send-push` edge function. The edge
 * function authenticates the caller, validates a legitimate relationship
 * (family or shared event) before pushing, looks up the recipient's
 * push_token under service role (so the caller never sees the raw token),
 * and writes an audit log entry. The previous client-side path could be
 * abused by any signed-in user to spam any other user's device.
 */
export async function sendPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        target_user_id: targetUserId,
        title,
        body,
        data: data ?? {},
      },
    });
    if (error) secureLog.warn('[pushNotifications] send-push error:', error.message);
  } catch (err) {
    secureLog.warn('[pushNotifications] send-push failed:', err);
  }
}
