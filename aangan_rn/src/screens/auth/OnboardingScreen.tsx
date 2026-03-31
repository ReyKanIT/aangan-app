import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_complete';

interface OnboardingPage {
  id: string;
  emoji: string;
  titleHindi: string;
  descriptionHindi: string;
  descriptionEnglish: string;
  ctaHindi?: string;
  ctaAction?: 'family' | 'start';
}

const PAGES: OnboardingPage[] = [
  {
    id: 'family',
    emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
    titleHindi: '\u092A\u0930\u093F\u0935\u093E\u0930 \u091C\u094B\u0921\u093C\u0947\u0902',
    descriptionHindi:
      '\u0905\u092A\u0928\u0947 \u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u0947 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0947\u0902 \u0914\u0930 \u0930\u093F\u0936\u094D\u0924\u093E \u091A\u0941\u0928\u0947\u0902',
    descriptionEnglish: 'Add family members and choose their relationship',
    ctaHindi: '\u092A\u0930\u093F\u0935\u093E\u0930 \u091C\u094B\u0921\u093C\u0947\u0902',
    ctaAction: 'family',
  },
  {
    id: 'post',
    emoji: '\u{1F4DD}',
    titleHindi: '\u092A\u094B\u0938\u094D\u091F \u0915\u0930\u0947\u0902',
    descriptionHindi:
      '\u0905\u092A\u0928\u0947 \u092A\u0930\u093F\u0935\u093E\u0930 \u0938\u0947 updates, photos, \u0914\u0930 messages share \u0915\u0930\u0947\u0902',
    descriptionEnglish: 'Share updates, photos, and messages with family',
  },
  {
    id: 'event',
    emoji: '\u{1F389}',
    titleHindi:
      '\u0906\u092F\u094B\u091C\u0928 \u092C\u0928\u093E\u090F\u0902',
    descriptionHindi:
      '\u0936\u093E\u0926\u0940, \u092A\u0942\u091C\u093E, \u092F\u093E \u0915\u093F\u0938\u0940 \u092D\u0940 \u0906\u092F\u094B\u091C\u0928 \u0915\u093E invite \u092D\u0947\u091C\u0947\u0902, RSVP \u091F\u094D\u0930\u0948\u0915 \u0915\u0930\u0947\u0902',
    descriptionEnglish:
      'Send invites for weddings, pujas, or any event and track RSVPs',
    ctaHindi: '\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    ctaAction: 'start',
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const markComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Silently continue even if storage fails
    }
  }, []);

  const navigateToMain = useCallback(async () => {
    await markComplete();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      }),
    );
  }, [markComplete, navigation]);

  const navigateToFamily = useCallback(async () => {
    await markComplete();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main', state: { routes: [{ name: 'Family' }] } }],
      }),
    );
  }, [markComplete, navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    navigateToMain();
  }, [navigateToMain]);

  const handleCTA = useCallback(
    (action?: 'family' | 'start') => {
      if (action === 'family') {
        navigateToFamily();
      } else {
        navigateToMain();
      }
    },
    [navigateToFamily, navigateToMain],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [],
  );

  const isLastPage = currentIndex === PAGES.length - 1;

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingPage>) => (
      <View style={styles.page}>
        <View style={styles.illustrationArea}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        <Text style={styles.titleHindi}>{item.titleHindi}</Text>
        <Text style={styles.descriptionHindi}>{item.descriptionHindi}</Text>
        <Text style={styles.descriptionEnglish}>{item.descriptionEnglish}</Text>

        {item.ctaHindi && item.ctaAction && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => handleCTA(item.ctaAction)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>{item.ctaHindi}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [handleCTA],
  );

  const keyExtractor = useCallback((item: OnboardingPage) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {PAGES.map((page, index) => (
            <View
              key={page.id}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>
              {'\u091B\u094B\u0921\u093C\u0947\u0902'}
            </Text>
            <Text style={styles.skipSubtext}>Skip</Text>
          </TouchableOpacity>

          {!isLastPage ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {'\u0905\u0917\u0932\u093E'}
              </Text>
              <Text style={styles.nextSubtext}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={navigateToMain}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {'\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902'}
              </Text>
              <Text style={styles.nextSubtext}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/** Check if onboarding has been completed */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/** Reset onboarding state (for testing) */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Silently continue
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  illustrationArea: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
  },
  emoji: {
    fontSize: 64,
  },
  titleHindi: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.brown,
  },
  descriptionHindi: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.brown,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  descriptionEnglish: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.brownLight,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  ctaButton: {
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  ctaText: {
    ...Typography.button,
    color: Colors.white,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.huge,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.cream,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: Spacing.xs,
  },
  dotActive: {
    backgroundColor: Colors.haldiGold,
    width: 24,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: Colors.gray300,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  skipText: {
    ...Typography.label,
    color: Colors.brownLight,
    fontSize: 16,
  },
  skipSubtext: {
    ...Typography.caption,
    color: Colors.brownMuted,
    marginTop: 2,
  },
  nextButton: {
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.mehndiGreen,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    ...Typography.button,
    color: Colors.white,
  },
  nextSubtext: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
});
