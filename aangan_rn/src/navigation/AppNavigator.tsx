import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { DADI_MIN_TAP_TARGET } from '../theme/typography';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Screens
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import FamilyTreeScreen from '../screens/family/FamilyTreeScreen';
import PostComposerScreen from '../screens/home/PostComposerScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Event Screens
import EventCreatorScreen from '../screens/events/EventCreatorScreen';
import EventInvitationScreen from '../screens/events/EventInvitationScreen';
import RsvpTrackerScreen from '../screens/events/RsvpTrackerScreen';
import EventPhotosScreen from '../screens/events/EventPhotosScreen';

// Storage Screens
import StorageScreen from '../screens/storage/StorageScreen';
import ReferralScreen from '../screens/storage/ReferralScreen';

// Types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: { phone?: string; email?: string };
  ProfileSetup: { editMode?: boolean };
  Onboarding: undefined;
  Main: undefined;
  PostComposer: undefined;
  EventCreator: undefined;
  EventInvitation: { eventId: string };
  RsvpTracker: { eventId: string };
  EventPhotos: { eventId: string };
  Storage: undefined;
  Referral: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Family: undefined;
  Compose: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icon component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Family: '👨‍👩‍👧‍👦',
    Compose: '✏️',
    Notifications: '🔔',
    Settings: '⚙️',
  };
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icons[name] || '●'}
      </Text>
    </View>
  );
}

// Compose tab redirects to the PostComposer modal
function ComposeTabRedirect({ navigation }: { navigation: any }) {
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      e.preventDefault();
      navigation.navigate('PostComposer');
    });
    return unsubscribe;
  }, [navigation]);

  return null;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: Colors.haldiGold,
        tabBarInactiveTintColor: Colors.gray500,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeFeedScreen}
        options={{ tabBarLabel: 'घर' }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyTreeScreen}
        options={{ tabBarLabel: 'परिवार' }}
      />
      <Tab.Screen
        name="Compose"
        component={ComposeTabRedirect}
        options={{ tabBarLabel: 'लिखें' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PostComposer');
          },
        })}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'सूचना' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'सेटिंग्स' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.cream },
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OtpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {/* Main App */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Post Composer — modal only, triggered from FAB or Compose tab */}
        <Stack.Screen
          name="PostComposer"
          component={PostComposerScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        {/* Events */}
        <Stack.Screen
          name="EventCreator"
          component={EventCreatorScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="EventInvitation" component={EventInvitationScreen} />
        <Stack.Screen name="RsvpTracker" component={RsvpTrackerScreen} />
        <Stack.Screen name="EventPhotos" component={EventPhotosScreen} />

        {/* Storage */}
        <Stack.Screen name="Storage" component={StorageScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.gray200,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabItem: {
    minHeight: DADI_MIN_TAP_TARGET,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
});
