import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackHandler, Alert, Platform, Linking } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreenExpo from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { registerForPushNotifications, setupNotificationListeners } from './src/services/pushNotifications';
import { useAuthStore } from './src/stores/authStore';
import { supabase } from './src/config/supabase';

// Prevent auto-hiding splash screen
SplashScreenExpo.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const backPressCount = useRef(0);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Poppins-Regular': require('./src/assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Medium': require('./src/assets/fonts/Poppins-Medium.ttf'),
          'Poppins-SemiBold': require('./src/assets/fonts/Poppins-SemiBold.ttf'),
          'Poppins-Bold': require('./src/assets/fonts/Poppins-Bold.ttf'),
          'TiroDevanagariHindi-Regular': require('./src/assets/fonts/TiroDevanagariHindi-Regular.ttf'),
        });
      } catch (e) {
        if (__DEV__) console.warn('Font loading failed, using system fonts:', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Handle OAuth deep link callback (fallback for external browser redirects)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      // Handle OAuth callback: aangan://auth-callback#access_token=...&refresh_token=...
      if (url.includes('auth-callback') || url.includes('access_token')) {
        const hashPart = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    };

    // Listen for incoming deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also check if app was opened via deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // Register push notifications after auth
  useEffect(() => {
    // Register push after auth state changes
    const unsubAuth = useAuthStore.subscribe(async (state) => {
      if (state.session?.user) {
        await registerForPushNotifications();
      }
    });

    // Setup notification listeners
    const cleanupNotifications = setupNotificationListeners(
      (notification) => {
        // Notification received while app is open — handled by in-app realtime
      },
      (response) => {
        // User tapped notification — navigate to relevant screen
        const data = response.notification.request.content.data;
        // Navigation handled in AppNavigator via deep links
      }
    );

    return () => {
      unsubAuth();
      cleanupNotifications();
    };
  }, []);

  // Android back button: double-tap to exit (prevents accidental closure)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Let React Navigation handle back if there's a screen to go back to
      // This handler only catches the "exit app" scenario
      backPressCount.current += 1;

      if (backPressCount.current < 2) {
        // First press: show toast-like message
        Alert.alert(
          '',
          'वापस जाने के लिए फिर से दबाएं',
          [{ text: 'ठीक है', style: 'cancel' }],
          { cancelable: true }
        );
        setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
        return true; // Prevent default (exit)
      }

      return false; // Allow exit on double-press
    });

    return () => handler.remove();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FDFAF0" />
        <ErrorBoundary>
          <AppNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
