import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { usePostStore } from '../../stores/postStore';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useLanguageStore } from '../../stores/languageStore';
import type { AudienceType, PostType, User } from '../../types/database';
import VoiceMicButton from '../../components/voice/VoiceMicButton';

// TODO: update RootStackParamList to add editPostId param
type Props = NativeStackScreenProps<any, 'PostComposer'>;

// -- Audience Modal Tabs --
type AudienceTab = 'all' | 'level' | 'individual';

interface MediaFile {
  uri: string;
  type: string;
  name: string;
}

// -- Sub-components --

interface AudienceModalProps {
  visible: boolean;
  onClose: () => void;
  audienceType: AudienceType;
  onSelectAudience: (type: AudienceType, levelMin?: number, levelMax?: number, userIds?: string[]) => void;
  members: { id: string; member?: User; connection_level: number }[];
}

function AudienceModal({ visible, onClose, audienceType, onSelectAudience, members }: AudienceModalProps) {
  const [activeTab, setActiveTab] = useState<AudienceTab>(audienceType === 'all' ? 'all' : audienceType === 'level' ? 'level' : 'individual');
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(3);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const name = (m.member?.display_name || '').toLowerCase();
      const nameHindi = (m.member?.display_name_hindi || '').toLowerCase();
      return name.includes(q) || nameHindi.includes(q);
    });
  }, [members, searchQuery]);

  const levelMemberCount = useMemo(() => {
    return members.filter((m) => m.connection_level >= levelMin && m.connection_level <= levelMax).length;
  }, [members, levelMin, levelMax]);

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleConfirm = useCallback(() => {
    if (activeTab === 'all') {
      onSelectAudience('all');
    } else if (activeTab === 'level') {
      onSelectAudience('level', levelMin, levelMax);
    } else {
      onSelectAudience('custom', undefined, undefined, selectedUserIds);
    }
    onClose();
  }, [activeTab, levelMin, levelMax, selectedUserIds, onSelectAudience, onClose]);

  const AUDIENCE_TABS: { key: AudienceTab; label: string }[] = [
    { key: 'all', label: 'सभी परिवार' },
    { key: 'level', label: 'स्तर से' },
    { key: 'individual', label: 'व्यक्तिगत' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={audienceStyles.container}>
        {/* Header */}
        <View style={audienceStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={audienceStyles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={audienceStyles.closeText}>{'✕'}</Text>
          </TouchableOpacity>
          <Text style={audienceStyles.headerTitle}>{'ऑडियंस चुनें'}</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={audienceStyles.doneButton}
            accessibilityRole="button"
            accessibilityLabel="Confirm audience selection"
          >
            <Text style={audienceStyles.doneText}>{'ठीक है'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={audienceStyles.tabBar}>
          {AUDIENCE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                audienceStyles.tab,
                activeTab === tab.key && audienceStyles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
            >
              <Text style={[
                audienceStyles.tabText,
                activeTab === tab.key && audienceStyles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={audienceStyles.body}>
          {activeTab === 'all' && (
            <View style={audienceStyles.allSection}>
              <Text style={audienceStyles.allIcon}>{'👨‍👩‍👧‍👦'}</Text>
              <Text style={audienceStyles.allTitle}>{'सभी परिवार सदस्य'}</Text>
              <Text style={audienceStyles.allSubtitle}>{'All family members will see this post'}</Text>
              <Text style={audienceStyles.memberCountText}>
                {members.length}{' सदस्य'}
              </Text>
            </View>
          )}

          {activeTab === 'level' && (
            <View style={audienceStyles.levelSection}>
              <Text style={audienceStyles.levelLabel}>{'न्यूनतम स्तर (Min Level)'}</Text>
              <View style={audienceStyles.sliderRow}>
                <TouchableOpacity
                  style={[audienceStyles.sliderButton, levelMin <= 1 && { opacity: 0.4 }]}
                  onPress={() => setLevelMin(Math.max(1, levelMin - 1))}
                  disabled={levelMin <= 1}
                  accessibilityLabel="Decrease minimum level"
                >
                  <Text style={audienceStyles.sliderButtonText}>{'-'}</Text>
                </TouchableOpacity>
                <Text style={audienceStyles.sliderValue}>{levelMin}</Text>
                <TouchableOpacity
                  style={[audienceStyles.sliderButton, levelMin >= levelMax && { opacity: 0.4 }]}
                  onPress={() => setLevelMin(Math.min(levelMax, levelMin + 1))}
                  disabled={levelMin >= levelMax}
                  accessibilityLabel="Increase minimum level"
                >
                  <Text style={audienceStyles.sliderButtonText}>{'+'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={audienceStyles.levelLabel}>{'अधिकतम स्तर (Max Level)'}</Text>
              <View style={audienceStyles.sliderRow}>
                <TouchableOpacity
                  style={[audienceStyles.sliderButton, levelMax <= levelMin && { opacity: 0.4 }]}
                  onPress={() => setLevelMax(Math.max(levelMin, levelMax - 1))}
                  disabled={levelMax <= levelMin}
                  accessibilityLabel="Decrease maximum level"
                >
                  <Text style={audienceStyles.sliderButtonText}>{'-'}</Text>
                </TouchableOpacity>
                <Text style={audienceStyles.sliderValue}>{levelMax}</Text>
                <TouchableOpacity
                  style={[audienceStyles.sliderButton, levelMax >= 99 && { opacity: 0.4 }]}
                  onPress={() => setLevelMax(Math.min(99, levelMax + 1))}
                  disabled={levelMax >= 99}
                  accessibilityLabel="Increase maximum level"
                >
                  <Text style={audienceStyles.sliderButtonText}>{'+'}</Text>
                </TouchableOpacity>
              </View>

              <View style={audienceStyles.levelCountCard}>
                <Text style={audienceStyles.levelCountText}>
                  {levelMemberCount}{' सदस्य इस रेंज में हैं'}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'individual' && (
            <View style={audienceStyles.individualSection}>
              <View style={audienceStyles.individualSearch}>
                <Text style={audienceStyles.searchIcon}>{'🔍'}</Text>
                <TextInput
                  style={audienceStyles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="नाम खोजें..."
                  placeholderTextColor={Colors.gray400}
                  accessibilityLabel="Search members"
                />
              </View>

              <Text style={audienceStyles.selectedCount}>
                {selectedUserIds.length}{' चुने गए'}
              </Text>

              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedUserIds.includes(item.member?.id || item.id);
                  const displayName = item.member?.display_name_hindi || item.member?.display_name || 'Unknown';
                  return (
                    <TouchableOpacity
                      style={[
                        audienceStyles.memberRow,
                        isSelected && audienceStyles.memberRowSelected,
                      ]}
                      onPress={() => toggleUser(item.member?.id || item.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <View style={audienceStyles.memberAvatar}>
                        <Text style={audienceStyles.memberAvatarText}>
                          {displayName[0]}
                        </Text>
                      </View>
                      <Text style={audienceStyles.memberName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <View style={[
                        audienceStyles.checkbox,
                        isSelected && audienceStyles.checkboxSelected,
                      ]}>
                        {isSelected && <Text style={audienceStyles.checkmark}>{'✓'}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// -- Main Component --

export default function PostComposerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { createPost, error: postError } = usePostStore();
  const { members, fetchMembers } = useFamilyStore();
  const { isHindi } = useLanguageStore();

  // Edit mode: presence of editPostId param switches the screen into edit mode
  const editPostId: string | undefined = route?.params?.editPostId;
  const isEditMode = Boolean(editPostId);

  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceLevelMin, setAudienceLevelMin] = useState<number | null>(null);
  const [audienceLevelMax, setAudienceLevelMax] = useState<number | null>(null);
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Edit mode specific state
  const [isLoadingPost, setIsLoadingPost] = useState(isEditMode);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);

  useEffect(() => {
    fetchMembers();
    if (isEditMode && editPostId) {
      loadPostForEdit(editPostId);
    }
  }, []);

  const loadPostForEdit = useCallback(async (postId: string) => {
    setIsLoadingPost(true);
    try {
      const { supabase } = await import('../../config/supabase');
      const { data, error } = await supabase
        .from('posts')
        .select('content, media_urls, audience_type, audience_level')
        .eq('id', postId)
        .single();

      if (error || !data) {
        Alert.alert('त्रुटि', 'पोस्ट लोड नहीं हो सका', [
          { text: 'ठीक है', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setContent(data.content || '');
      setExistingMediaUrls(data.media_urls || []);
      setAudienceType((data.audience_type as AudienceType) || 'all');
      if (data.audience_level != null) {
        setAudienceLevelMin(data.audience_level);
      }
    } catch {
      Alert.alert('त्रुटि', 'पोस्ट लोड नहीं हो सका', [
        { text: 'ठीक है', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoadingPost(false);
    }
  }, [navigation]);

  const audienceLabel = useMemo(() => {
    if (audienceType === 'all') return 'सभी परिवार';
    if (audienceType === 'level') return `L${audienceLevelMin}-${audienceLevelMax}`;
    return `${audienceUserIds.length} व्यक्ति`;
  }, [audienceType, audienceLevelMin, audienceLevelMax, audienceUserIds]);

  const canPost = useMemo(() => {
    if (isEditMode) {
      return content.trim().length > 0 && !isSubmitting;
    }
    if (showPoll) {
      const validOptions = pollOptions.filter(o => o.trim());
      const pollValid = pollQuestion.trim().length > 0 && validOptions.length >= 2;
      return (content.trim().length > 0 || mediaFiles.length > 0 || pollValid) && pollValid && !isSubmitting;
    }
    return (content.trim().length > 0 || mediaFiles.length > 0) && !isSubmitting;
  }, [isEditMode, content, mediaFiles, isSubmitting, showPoll, pollQuestion, pollOptions]);

  const handleSelectAudience = useCallback((
    type: AudienceType,
    levelMin?: number,
    levelMax?: number,
    userIds?: string[],
  ) => {
    setAudienceType(type);
    setAudienceLevelMin(levelMin ?? null);
    setAudienceLevelMax(levelMax ?? null);
    setAudienceUserIds(userIds ?? []);
  }, []);

  // Poll helpers
  const addPollOption = useCallback(() => {
    setPollOptions(prev => prev.length < 5 ? [...prev, ''] : prev);
  }, []);

  const removePollOption = useCallback((index: number) => {
    setPollOptions(prev => prev.length > 2 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const updatePollOption = useCallback((index: number, text: string) => {
    setPollOptions(prev => prev.map((o, i) => i === index ? text : o));
  }, []);

  const handlePickImages = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('अनुमति आवश्यक', 'गैलरी एक्सेस की अनुमति दें');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 20 - mediaFiles.length,
      });

      if (!result.canceled && result.assets) {
        const newFiles: MediaFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        }));
        setMediaFiles((prev) => [...prev, ...newFiles].slice(0, 20));
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'फोटो चुनने में समस्या हुई');
    }
  }, [mediaFiles.length]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('अनुमति आवश्यक', 'कैमरा एक्सेस की अनुमति दें');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setMediaFiles((prev) => [
          ...prev,
          {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `photo_${Date.now()}.jpg`,
          },
        ].slice(0, 20));
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'फोटो लेने में समस्या हुई');
    }
  }, []);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Edit mode submit — updates via Supabase directly
  const handleSubmitEdit = useCallback(async () => {
    if (!canPost || !editPostId) return;

    setIsSubmitting(true);
    try {
      const { supabase } = await import('../../config/supabase');
      const { error } = await supabase
        .from('posts')
        .update({
          content: content.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editPostId);

      if (error) {
        Alert.alert('त्रुटि', 'पोस्ट अपडेट नहीं हो सका');
      } else {
        Alert.alert(
          'सफल',
          'पोस्ट अपडेट हो गया!',
          [{ text: 'ठीक है', onPress: () => navigation.goBack() }],
        );
      }
    } catch {
      Alert.alert('त्रुटि', 'पोस्ट अपडेट नहीं हो सका');
    }
    setIsSubmitting(false);
  }, [canPost, editPostId, content, navigation]);

  // Create mode submit — existing flow unchanged
  const handleSubmitCreate = useCallback(async () => {
    if (!canPost) return;

    setIsSubmitting(true);
    try {
      const postType: PostType = mediaFiles.length > 0 ? 'photo' : 'text';

      const success = await createPost({
        content: content.trim() || null,
        postType,
        audienceType,
        audienceLevel: audienceLevelMin,
        audienceLevelMax: audienceLevelMax,
        audienceGroupId: null,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
        audienceUserIds: audienceUserIds.length > 0 ? audienceUserIds : undefined,
      });

      if (success) {
        if (showPoll) {
          try {
            const { supabase } = await import('../../config/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: latestPost } = await supabase
                .from('posts')
                .select('id')
                .eq('author_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (latestPost) {
                const validOptions = pollOptions.filter(o => o.trim()).map((text, idx) => ({
                  id: String(idx + 1),
                  text: text.trim(),
                  vote_count: 0,
                }));
                await supabase.from('post_polls').insert({
                  post_id: latestPost.id,
                  question: pollQuestion.trim(),
                  options: validOptions,
                });
              }
            }
          } catch {
            // Poll insert failed — post was created, continue
          }
        }
        navigation.goBack();
      } else {
        Alert.alert('त्रुटि', postError || 'पोस्ट बनाने में समस्या हुई');
      }
    } catch {
      Alert.alert('त्रुटि', 'पोस्ट बनाने में समस्या हुई');
    }
    setIsSubmitting(false);
  }, [canPost, content, mediaFiles, audienceType, audienceLevelMin, audienceLevelMax, audienceUserIds, createPost, postError, navigation, showPoll, pollQuestion, pollOptions]);

  const handleSubmit = useCallback(() => {
    if (isEditMode) {
      handleSubmitEdit();
    } else {
      handleSubmitCreate();
    }
  }, [isEditMode, handleSubmitEdit, handleSubmitCreate]);

  const handleCancel = useCallback(() => {
    if (content.trim() || mediaFiles.length > 0) {
      Alert.alert(
        isEditMode ? 'बदलाव छोड़ें?' : 'पोस्ट छोड़ें?',
        isEditMode ? 'आपके बदलाव सेव नहीं होंगे' : 'आपका पोस्ट सेव नहीं होगा',
        [
          { text: 'रहने दें', style: 'cancel' },
          { text: 'छोड़ें', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [content, mediaFiles, isEditMode, navigation]);

  // Loading state for edit mode
  if (isLoadingPost) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={styles.loadingText}>{'पोस्ट लोड हो रहा है...'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>{'✕'}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isEditMode
              ? (isHindi ? 'पोस्ट संपादित करें' : 'Edit Post')
              : (isHindi ? 'नया पोस्ट' : 'New Post')}
          </Text>

          <TouchableOpacity
            style={[styles.shareButton, !canPost && styles.shareButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canPost}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Update post' : 'Share post'}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.shareButtonText}>
                {isEditMode
                  ? (isHindi ? 'अपडेट करें' : 'Update')
                  : (isHindi ? 'पोस्ट करें' : 'Post')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        {/* Author Info */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {(user?.display_name_hindi || user?.display_name || '?')[0]}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {user?.display_name_hindi || user?.display_name || ''}
            </Text>
            {!isEditMode && (
              <TouchableOpacity
                style={styles.audienceChip}
                onPress={() => setShowAudienceModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Select audience"
              >
                <Text style={styles.audienceChipText}>{audienceLabel}</Text>
                <Text style={styles.audienceChipArrow}>{'▼'}</Text>
              </TouchableOpacity>
            )}
            {isEditMode && (
              <View style={styles.editModeBadge}>
                <Text style={styles.editModeBadgeText}>{'✏️ संपादन मोड'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Text Input */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={content}
            onChangeText={setContent}
            placeholder={isHindi ? 'क्या चल रहा है?' : "What's happening?"}
            placeholderTextColor={Colors.gray400}
            multiline
            textAlignVertical="top"
            autoFocus={!isEditMode}
            accessibilityLabel="Post content"
          />
          <VoiceMicButton
            onTranscript={(text) => setContent(prev => prev + ' ' + text)}
            mode="append"
            size={28}
          />
        </View>

        {/* Poll Section */}
        {!isEditMode && showPoll && (
          <View style={styles.pollSection}>
            <Text style={styles.pollTitle}>{'📊 पोल बनाएं / Create Poll'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[styles.pollInput, { flex: 1 }]}
                value={pollQuestion}
                onChangeText={setPollQuestion}
                placeholder="सवाल लिखें / Write question"
                placeholderTextColor={Colors.gray400}
                accessibilityLabel="Poll question"
              />
              <VoiceMicButton
                onTranscript={(text) => setPollQuestion(prev => prev + ' ' + text)}
                mode="append"
                size={24}
              />
            </View>
            <Text style={styles.pollTitle}>{'विकल्प / Options:'}</Text>
            {pollOptions.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <View style={styles.optionDot} />
                <TextInput
                  style={styles.optionInput}
                  value={option}
                  onChangeText={(text) => updatePollOption(index, text)}
                  placeholder={`विकल्प ${index + 1} / Option ${index + 1}`}
                  placeholderTextColor={Colors.gray400}
                  accessibilityLabel={`Poll option ${index + 1}`}
                />
                <TouchableOpacity
                  style={styles.removeOptionBtn}
                  onPress={() => removePollOption(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove option ${index + 1}`}
                >
                  <Text style={{ fontSize: 14, color: Colors.error, fontWeight: '700' }}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
            ))}
            {pollOptions.length < 5 && (
              <TouchableOpacity
                style={styles.addOptionBtn}
                onPress={addPollOption}
                accessibilityRole="button"
                accessibilityLabel="Add poll option"
              >
                <Text style={{ fontSize: 18, color: Colors.haldiGold }}>{'+'}</Text>
                <Text style={{ ...Typography.labelSmall, color: Colors.haldiGold }}>{'विकल्प जोड़ें / Add option'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Edit mode: existing media note */}
        {isEditMode && existingMediaUrls.length > 0 && (
          <View style={styles.editMediaNote}>
            <Text style={styles.editMediaNoteIcon}>{'📷'}</Text>
            <Text style={styles.editMediaNoteText}>
              {'मीडिया बदलना संभव नहीं है (v0.3 में उपलब्ध नहीं)'}
            </Text>
          </View>
        )}

        {/* Media Preview — create mode only */}
        {!isEditMode && mediaFiles.length > 0 && (
          <View style={styles.mediaPreview}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mediaFiles.map((file, index) => (
                <View key={`${file.uri}-${index}`} style={styles.mediaThumbnailWrapper}>
                  <Image source={{ uri: file.uri }} style={styles.mediaThumbnail} />
                  <TouchableOpacity
                    style={styles.mediaRemoveButton}
                    onPress={() => handleRemoveMedia(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                  >
                    <Text style={styles.mediaRemoveText}>{'✕'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.mediaCount}>
              {mediaFiles.length}{'/20 फोटो'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Media Bar — create mode only */}
      {!isEditMode && (
        <View style={[styles.mediaBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handleTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <Text style={styles.mediaButtonIcon}>{'📷'}</Text>
            <Text style={styles.mediaButtonLabel}>{'कैमरा'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handlePickImages}
            accessibilityRole="button"
            accessibilityLabel="Pick from gallery"
          >
            <Text style={styles.mediaButtonIcon}>{'🖼️'}</Text>
            <Text style={styles.mediaButtonLabel}>{'गैलरी'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => Alert.alert('जल्द आ रहा है', 'डॉक्यूमेंट अपलोड जल्द उपलब्ध होगा')}
            accessibilityRole="button"
            accessibilityLabel="Attach document"
          >
            <Text style={styles.mediaButtonIcon}>{'📄'}</Text>
            <Text style={styles.mediaButtonLabel}>{'डॉक्यूमेंट'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaButton, showPoll && styles.mediaButtonActive]}
            onPress={() => setShowPoll(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle poll creation"
          >
            <Text style={styles.mediaButtonIcon}>{'📊'}</Text>
            <Text style={[styles.mediaButtonLabel, showPoll && styles.mediaButtonLabelActive]}>{'पोल / Poll'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Audience Modal — create mode only */}
      {!isEditMode && (
        <AudienceModal
          visible={showAudienceModal}
          onClose={() => setShowAudienceModal(false)}
          audienceType={audienceType}
          onSelectAudience={handleSelectAudience}
          members={members}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.brownLight,
    marginTop: Spacing.md,
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
  headerButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 22,
    color: Colors.brown,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  shareButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 16,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  authorAvatarText: {
    ...Typography.h3,
    color: Colors.haldiGoldDark,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: 4,
  },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.mehndiGreen + '18',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
  },
  audienceChipText: {
    ...Typography.labelSmall,
    color: Colors.mehndiGreen,
  },
  audienceChipArrow: {
    fontSize: 10,
    color: Colors.mehndiGreen,
    marginLeft: Spacing.xs,
  },
  editModeBadge: {
    backgroundColor: Colors.haldiGold + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
  },
  editModeBadgeText: {
    ...Typography.labelSmall,
    color: Colors.haldiGoldDark,
  },
  textInput: {
    ...Typography.bodyLarge,
    color: Colors.brown,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editMediaNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  editMediaNoteIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  editMediaNoteText: {
    ...Typography.bodySmall,
    color: Colors.gray500,
    flex: 1,
  },
  mediaPreview: {
    marginTop: Spacing.lg,
  },
  mediaThumbnailWrapper: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaRemoveText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  mediaCount: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },
  mediaBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadow.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  mediaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: DADI_MIN_BUTTON_HEIGHT,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    marginRight: Spacing.xxl,
  },
  mediaButtonIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  mediaButtonLabel: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  mediaButtonActive: {
    backgroundColor: Colors.haldiGold + '18',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xs,
  },
  mediaButtonLabelActive: {
    color: Colors.haldiGoldDark,
    fontWeight: '600',
  },

  // Poll
  pollSection: {
    backgroundColor: Colors.cream,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.haldiGold + '40',
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.brown,
    marginBottom: 12,
  },
  pollInput: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.brown,
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.haldiGold,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.brown,
    backgroundColor: Colors.white,
  },
  removeOptionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});

const audienceStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadow.sm,
    minHeight: 56,
  },
  closeButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: Colors.brown,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  doneButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    ...Typography.button,
    color: Colors.white,
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.haldiGold,
  },
  tabText: {
    ...Typography.labelSmall,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.haldiGold,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: Spacing.lg,
  },
  allSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  allIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  allTitle: {
    ...Typography.h3,
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  allSubtitle: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  memberCountText: {
    ...Typography.label,
    color: Colors.mehndiGreen,
  },
  levelSection: {
    paddingVertical: Spacing.lg,
  },
  levelLabel: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButton: {
    width: DADI_MIN_BUTTON_HEIGHT,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '700',
  },
  sliderValue: {
    ...Typography.h2,
    color: Colors.brown,
    width: 80,
    textAlign: 'center',
  },
  levelCountCard: {
    backgroundColor: Colors.mehndiGreen + '18',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  levelCountText: {
    ...Typography.label,
    color: Colors.mehndiGreen,
  },
  individualSection: {
    flex: 1,
  },
  individualSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    color: Colors.brown,
  },
  selectedCount: {
    ...Typography.labelSmall,
    color: Colors.haldiGoldDark,
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  memberRowSelected: {
    backgroundColor: Colors.haldiGold + '12',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  memberAvatarText: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
    fontSize: 16,
  },
  memberName: {
    ...Typography.body,
    color: Colors.brown,
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
