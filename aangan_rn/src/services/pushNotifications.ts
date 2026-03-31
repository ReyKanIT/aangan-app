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
 * Send a push notification to a specific user via Supabase Edge Function.
 * In production, this should be triggered server-side, not client-side.
 */
export async function sendPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  // Fetch target user's push token
  const { data: user } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', targetUserId)
    .single();

  if (!user?.push_token) return;

  // Send via Expo Push API
  // In production, do this via a Supabase Edge Function for security
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.push_token,
        title,
        body,
        data: data || {},
        sound: 'default',
        badge: 1,
      }),
    });
  } catch (error) {
    // Silently fail — push is best-effort
  }
}
