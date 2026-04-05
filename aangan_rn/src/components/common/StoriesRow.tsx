import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, Image, Dimensions, StatusBar, Animated, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { useStoryStore } from '../../stores/storyStore';
import { useAuthStore } from '../../stores/authStore';
import type { Story } from '../../types/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_SIZE = 72;
const STORY_BORDER = 3;

interface StoriesRowProps {
  isHindi?: boolean;
}

// ─── Story Viewer Modal ───────────────────────────────────────────────────────
interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onViewed: (storyId: string) => void;
}

function StoryViewer({ stories, initialIndex, onClose, onViewed }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const STORY_DURATION = 5000;

  const current = stories[currentIndex];

  const startProgress = useCallback(() => {
    progress.setValue(0);
    animRef.current?.stop();
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
  }, [currentIndex]);

  useEffect(() => {
    if (current) {
      onViewed(current.id);
      startProgress();
    }
    return () => animRef.current?.stop();
  }, [currentIndex]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex((i) => i + 1);
    else onClose();
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  if (!current) return null;

  const authorName = current.author?.display_name_hindi || current.author?.display_name || '';
  const timeAgo = (() => {
    const diff = Date.now() - new Date(current.created_at).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h >= 1) return `${h}h`;
    if (m >= 1) return `${m}m`;
    return 'अभी';
  })();

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <StatusBar hidden />
      <View style={viewerStyles.container}>
        {/* Progress bars */}
        <View style={viewerStyles.progressContainer}>
          {stories.map((_, idx) => (
            <View key={idx} style={viewerStyles.progressTrack}>
              <Animated.View
                style={[
                  viewerStyles.progressFill,
                  {
                    width: idx < currentIndex ? '100%'
                      : idx === currentIndex
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={viewerStyles.header}>
          <View style={viewerStyles.authorRow}>
            <View style={viewerStyles.authorAvatar}>
              {current.author?.profile_photo_url ? (
                <Image source={{ uri: current.author.profile_photo_url }} style={viewerStyles.authorAvatarImg} />
              ) : (
                <Text style={viewerStyles.authorAvatarText}>{authorName[0] || '?'}</Text>
              )}
            </View>
            <View>
              <Text style={viewerStyles.authorName}>{authorName}</Text>
              <Text style={viewerStyles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={viewerStyles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={viewerStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Media */}
        <Image
          source={{ uri: current.media_url }}
          style={viewerStyles.media}
          resizeMode="cover"
        />

        {/* Caption */}
        {current.caption ? (
          <View style={viewerStyles.captionContainer}>
            <Text style={viewerStyles.caption}>{current.caption}</Text>
          </View>
        ) : null}

        {/* Tap zones */}
        <TouchableOpacity style={viewerStyles.tapLeft} onPress={goPrev} activeOpacity={1} />
        <TouchableOpacity style={viewerStyles.tapRight} onPress={goNext} activeOpacity={1} />
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressContainer: { flexDirection: 'row', position: 'absolute', top: 48, left: 8, right: 8, zIndex: 10, gap: 4 },
  progressTrack: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  header: { position: 'absolute', top: 60, left: 12, right: 12, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.haldiGold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  authorAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  authorAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  authorName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timeAgo: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 20 },
  media: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  captionContainer: { position: 'absolute', bottom: 40, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 12 },
  caption: { color: '#fff', fontSize: 15, lineHeight: 22 },
  tapLeft: { position: 'absolute', left: 0, top: 0, width: SCREEN_WIDTH * 0.35, height: SCREEN_HEIGHT },
  tapRight: { position: 'absolute', right: 0, top: 0, width: SCREEN_WIDTH * 0.65, height: SCREEN_HEIGHT },
});

// ─── StoriesRow ────────────────────────────────────────────────────────────────

export default function StoriesRow({ isHindi = true }: StoriesRowProps) {
  const { stories, isLoading, fetchStories, addStory, markViewed } = useStoryStore();
  const { session } = useAuthStore();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => { fetchStories(); }, []);

  const handleAddStory = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setIsAdding(true);
    await addStory(result.assets[0].uri, 'image');
    setIsAdding(false);
  }, [addStory]);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  }, []);

  // Group stories by author, current user first
  const myId = session?.user?.id;
  const myStories = stories.filter((s) => s.author_id === myId);
  const othersStories = stories.filter((s) => s.author_id !== myId);

  // One avatar per author for others
  const authorMap = new Map<string, Story>();
  othersStories.forEach((s) => { if (!authorMap.has(s.author_id)) authorMap.set(s.author_id, s); });
  const authorStories = Array.from(authorMap.values());

  const allDisplayStories = [...myStories.slice(0, 1), ...authorStories];

  const renderItem = ({ item, index }: { item: Story; index: number }) => {
    const name = item.author?.display_name_hindi || item.author?.display_name || '';
    const isMe = item.author_id === myId;
    const isViewed = item.is_viewed;
    const allByThisAuthor = stories.filter((s) => s.author_id === item.author_id);
    const startIndex = stories.indexOf(allByThisAuthor[0]);

    return (
      <TouchableOpacity
        onPress={() => openViewer(startIndex >= 0 ? startIndex : index)}
        style={storyStyles.item}
        activeOpacity={0.8}
      >
        <View style={[storyStyles.ring, isViewed && storyStyles.ringViewed]}>
          <View style={storyStyles.avatar}>
            {item.author?.profile_photo_url ? (
              <Image source={{ uri: item.author.profile_photo_url }} style={storyStyles.avatarImg} />
            ) : (
              <Text style={storyStyles.avatarText}>{name[0] || '?'}</Text>
            )}
          </View>
        </View>
        <Text style={storyStyles.name} numberOfLines={1}>
          {isMe ? (isHindi ? 'मेरी' : 'Mine') : name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={storyStyles.container}>
      {/* Add Story button */}
      <TouchableOpacity onPress={handleAddStory} style={storyStyles.item} activeOpacity={0.8} disabled={isAdding}>
        <View style={[storyStyles.ring, storyStyles.addRing]}>
          <View style={storyStyles.avatar}>
            {isAdding ? (
              <ActivityIndicator size="small" color={Colors.haldiGold} />
            ) : (
              <Text style={storyStyles.addIcon}>+</Text>
            )}
          </View>
        </View>
        <Text style={storyStyles.name}>{isHindi ? 'जोड़ें' : 'Add'}</Text>
      </TouchableOpacity>

      {/* Story avatars */}
      <FlatList
        data={allDisplayStories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 12 }}
      />

      {/* Viewer */}
      {viewerVisible && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
          onViewed={markViewed}
        />
      )}
    </View>
  );
}

const storyStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  item: { alignItems: 'center', width: STORY_SIZE + STORY_BORDER * 2 },
  ring: { width: STORY_SIZE + STORY_BORDER * 2, height: STORY_SIZE + STORY_BORDER * 2, borderRadius: (STORY_SIZE + STORY_BORDER * 2) / 2, borderWidth: STORY_BORDER, borderColor: Colors.haldiGold, padding: 2 },
  ringViewed: { borderColor: Colors.gray300 },
  addRing: { borderColor: Colors.mehndiGreen, borderStyle: 'dashed' },
  avatar: { width: STORY_SIZE, height: STORY_SIZE, borderRadius: STORY_SIZE / 2, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: STORY_SIZE, height: STORY_SIZE, borderRadius: STORY_SIZE / 2 },
  avatarText: { fontSize: 28, color: Colors.brown },
  addIcon: { fontSize: 32, color: Colors.mehndiGreen, fontWeight: '300' },
  name: { fontSize: 12, color: Colors.brown, marginTop: 4, textAlign: 'center', maxWidth: STORY_SIZE + STORY_BORDER * 2 },
});
