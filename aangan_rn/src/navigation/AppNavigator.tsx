import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { Text, View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { DADI_MIN_TAP_TARGET } from '../theme/typography';
import VoiceCommandOverlay from '../components/voice/VoiceCommandOverlay';
import { useAuthStore } from '../stores/authStore';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Screens
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import DashboardScreen from '../screens/home/DashboardScreen';
import FamilyTreeScreen from '../screens/family/FamilyTreeScreen';
import PostComposerScreen from '../screens/home/PostComposerScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Feed / Profile Screens
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import MemberProfileScreen from '../screens/family/MemberProfileScreen';

// Message Screens
import MessageListScreen from '../screens/messages/MessageListScreen';
import ChatScreen from '../screens/messages/ChatScreen';

// Event Screens
import EventCreatorScreen from '../screens/events/EventCreatorScreen';
import EventInvitationScreen from '../screens/events/EventInvitationScreen';
import RsvpTrackerScreen from '../screens/events/RsvpTrackerScreen';
import EventPhotosScreen from '../screens/events/EventPhotosScreen';

// Storage Screens
import StorageScreen from '../screens/storage/StorageScreen';
import ReferralScreen from '../screens/storage/ReferralScreen';

// Settings Screens
import KuldeviScreen from '../screens/settings/KuldeviScreen';

// Family sub-screens
import AddLifeEventScreen from '../screens/family/AddLifeEventScreen';
import ImportantDatesScreen from '../screens/family/ImportantDatesScreen';

// Support Screens
import SupportChatScreen from '../screens/support/SupportChatScreen';
import MyTicketsScreen from '../screens/support/MyTicketsScreen';
import TicketDetailScreen from '../screens/support/TicketDetailScreen';
import HelpScreen from '../screens/support/HelpScreen';
import FeedbackScreen from '../screens/support/FeedbackScreen';
import ReportContentScreen from '../screens/support/ReportContentScreen';

// Legal Screens
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';

// Types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: { phone?: string; email?: string };
  ProfileSetup: { editMode?: boolean };
  Onboarding: undefined;
  Main: undefined;
  PostComposer: { editPostId?: string };
  PostDetail: { postId: string; postAuthorId: string };
  MemberProfile: { memberId: string; relationshipLabel?: string; connectionLevel?: number };
  MessageList: undefined;
  Chat: { otherUserId: string; otherUserName: string; otherUserNameHindi?: string; otherUserPhoto?: string };
  EventCreator: undefined;
  EventInvitation: { eventId: string };
  RsvpTracker: { eventId: string };
  EventPhotos: { eventId: string };
  Storage: undefined;
  Referral: undefined;
  Kuldevi: undefined;
  AddLifeEvent: { eventId?: string } | undefined;
  ImportantDates: undefined;
  SupportChat: undefined;
  MyTickets: undefined;
  TicketDetail: { ticketId: string };
  Help: undefined;
  Feedback: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  ReportContent: undefined;
  Dashboard: undefined;
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
        component={HomeFeedScreen as React.ComponentType<any>}
        options={{ tabBarLabel: 'घर' }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyTreeScreen as React.ComponentType<any>}
        options={{ tabBarLabel: 'परिवार' }}
      />
      <Tab.Screen
        name="Compose"
        component={ComposeTabRedirect}
        options={{ tabBarLabel: 'लिखें' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('PostComposer');
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
  const navigationRef = useNavigationContainerRef();
  const session = useAuthStore((s) => s.session);

  return (
    <NavigationContainer ref={navigationRef}>
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

        {/* Feed & Profile */}
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />

        {/* Messages */}
        <Stack.Screen name="MessageList" component={MessageListScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />

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

        {/* Settings sub-screens */}
        <Stack.Screen name="Kuldevi" component={KuldeviScreen} />

        {/* Life Events */}
        <Stack.Screen
          name="AddLifeEvent"
          component={AddLifeEventScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="ImportantDates" component={ImportantDatesScreen} />

        {/* Support */}
        <Stack.Screen name="SupportChat" component={SupportChatScreen} />
        <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
        <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />

        {/* Help & Feedback */}
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="ReportContent" component={ReportContentScreen} />

        {/* Dashboard */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />

        {/* Legal */}
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
      {session?.user && <VoiceCommandOverlay navigationRef={navigationRef} />}
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
