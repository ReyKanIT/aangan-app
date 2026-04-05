import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FullScreenPhotoViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_DOWN_THRESHOLD = 80;
const DOT_SIZE = 8;
const DOT_GAP = 6;
const MAX_DOTS = 8;

// ─── Single image item with pinch-to-zoom via ScrollView ─────────────────────

interface ImageItemProps {
  uri: string;
  onSwipeDown: () => void;
}

function ImageItem({ uri, onSwipeDown }: ImageItemProps) {
  const [loading, setLoading] = useState(true);

  // Swipe-down-to-close tracking
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  const responderHandlers = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      touchStartY.current = e.nativeEvent.pageY;
      touchStartX.current = e.nativeEvent.pageX;
    },
    onResponderRelease: (e: any) => {
      const dy = e.nativeEvent.pageY - touchStartY.current;
      const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
      // Only trigger if clearly more vertical than horizontal
      if (dy > SWIPE_DOWN_THRESHOLD && dx < dy * 0.7) {
        onSwipeDown();
      }
    },
  };

  return (
    <View style={styles.itemContainer} {...responderHandlers}>
      <ScrollView
        style={styles.zoomScrollView}
        contentContainerStyle={styles.zoomScrollContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        centerContent
        bouncesZoom
      >
        <Image
          source={{ uri }}
          style={styles.fullImage}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
      </ScrollView>
      {loading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}
    </View>
  );
}

// ─── Dot Indicators ───────────────────────────────────────────────────────────

interface DotIndicatorProps {
  count: number;
  currentIndex: number;
}

function DotIndicator({ count, currentIndex }: DotIndicatorProps) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FullScreenPhotoViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullScreenPhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Reset to initialIndex whenever modal opens
  const handleModalShow = useCallback(() => {
    setCurrentIndex(initialIndex);
    if (flatListRef.current && images.length > 1) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [initialIndex, images.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <ImageItem uri={item} onSwipeDown={onClose} />
    ),
    [onClose]
  );

  const keyExtractor = useCallback((item: string, index: number) => `${index}-${item}`, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const showDots = images.length > 1 && images.length <= MAX_DOTS;
  const counterText = `${currentIndex + 1} / ${images.length}`;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <StatusBar hidden={visible} />

      <View style={styles.container}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          {/* Counter */}
          {images.length > 1 && (
            <Text style={styles.counterText}>{counterText}</Text>
          )}
          {/* Close button — always top-right */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="बंद करें"
            accessibilityRole="button"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Image list ── */}
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          scrollEventThrottle={16}
          // Prevent FlatList's own pan from swallowing swipe-down on image
          disableIntervalMomentum
        />

        {/* ── Bottom bar (dots) ── */}
        {showDots && (
          <View style={styles.bottomBar}>
            <DotIndicator count={images.length} currentIndex={currentIndex} />
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  // ── Top bar ──
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  counterText: {
    ...Typography.bodySmall,
    color: Colors.white,
    fontSize: 16,
    lineHeight: 22,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    // Make sure it stays at the right even when counter is absent
    marginLeft: 'auto',
  },
  closeIcon: {
    fontSize: 20,
    color: Colors.white,
    lineHeight: 24,
    fontWeight: '600',
  },

  // ── Item ──
  itemContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: Colors.black,
  },
  zoomScrollView: {
    flex: 1,
  },
  zoomScrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotActive: {
    backgroundColor: Colors.white,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
