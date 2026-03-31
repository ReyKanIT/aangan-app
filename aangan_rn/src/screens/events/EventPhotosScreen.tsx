import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { VALIDATION } from '../../config/constants';
import { usePhotoStore } from '../../stores/photoStore';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import type { EventPhoto, PhotoStatus, PrivacyType } from '../../types/database';

type Props = NativeStackScreenProps<any, 'EventPhotos'>;

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = Spacing.xs;
const NUM_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const FILTER_TABS: { key: FilterTab; hindi: string; en: string }[] = [
  { key: 'all', hindi: 'सभी', en: 'All' },
  { key: 'pending', hindi: 'लंबित', en: 'Pending' },
  { key: 'approved', hindi: 'स्वीकृत', en: 'Approved' },
  { key: 'rejected', hindi: 'अस्वीकृत', en: 'Rejected' },
];

const STATUS_COLORS: Record<PhotoStatus, string> = {
  pending: Colors.rsvpPending,
  approved: Colors.rsvpAccepted,
  rejected: Colors.rsvpDeclined,
};

const STATUS_LABELS: Record<PhotoStatus, { hindi: string; en: string }> = {
  pending: { hindi: 'लंबित', en: 'Pending' },
  approved: { hindi: 'स्वीकृत', en: 'Approved' },
  rejected: { hindi: 'अस्वीकृत', en: 'Rejected' },
};

const PRIVACY_OPTIONS: { type: PrivacyType; hindi: string; en: string; icon: string }[] = [
  { type: 'all', hindi: 'सभी को दिखाएं', en: 'Visible to all', icon: '🌍' },
  { type: 'level', hindi: 'रिश्ते के स्तर तक', en: 'By connection level', icon: '👨‍👩‍👧‍👦' },
  { type: 'individual', hindi: 'चुनिंदा लोग', en: 'Specific people', icon: '👤' },
];

// --- Photo Grid Item with loading placeholder ---
function PhotoGridItem({
  item,
  isHost,
  bulkSelect,
  isSelected,
  onPress,
  onLongPress,
}: {
  item: EventPhoto;
  isHost: boolean;
  bulkSelect: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [loading, setLoading] = useState(true);

  return (
    <TouchableOpacity
      style={styles.photoWrapper}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Loading placeholder */}
      {loading && (
        <View style={styles.photoPlaceholder}>
          <ActivityIndicator size="small" color={Colors.haldiGold} />
        </View>
      )}

      <Image
        source={{ uri: item.thumbnail_url || item.photo_url }}
        style={styles.photoImage}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />

      {/* Status badge overlay (host view) */}
      {isHost && (
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusBadgeText}>
            {STATUS_LABELS[item.status].hindi}
          </Text>
        </View>
      )}

      {/* Bulk select indicator */}
      {bulkSelect && (
        <View style={[styles.selectIndicator, isSelected && styles.selectIndicatorActive]}>
          {isSelected && <Text style={styles.selectCheck}>{'\u2713'}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- Audience Selector Modal ---
function AudienceSelectorModal({
  visible,
  currentType,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentType: PrivacyType;
  onSelect: (type: PrivacyType) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.audienceOverlay}>
        <View style={styles.audienceSheet}>
          <Text style={styles.audienceTitle}>गोपनीयता चुनें</Text>
          <Text style={styles.audienceSubtitle}>Select Privacy</Text>

          {PRIVACY_OPTIONS.map((option) => {
            const isActive = currentType === option.type;
            return (
              <TouchableOpacity
                key={option.type}
                style={[styles.audienceOption, isActive && styles.audienceOptionActive]}
                onPress={() => onSelect(option.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.audienceOptionIcon}>{option.icon}</Text>
                <View style={styles.audienceOptionText}>
                  <Text style={[styles.audienceLabel, isActive && { color: Colors.haldiGoldDark }]}>
                    {option.hindi}
                  </Text>
                  <Text style={styles.audienceLabelEn}>{option.en}</Text>
                </View>
                <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                  {isActive && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.audienceCloseBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={Typography.button}>बंद करें</Text>
            <Text style={[Typography.caption, { color: Colors.white, marginTop: 1 }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// --- Main Screen ---
export default function EventPhotosScreen({ route, navigation }: Props) {
  const { eventId } = route.params as { eventId: string };
  const {
    photos,
    pendingPhotos,
    isLoading,
    error,
    fetchPhotos,
    fetchPendingPhotos,
    uploadPhotos,
    moderatePhoto,
    setPhotoPrivacy,
    setError,
  } = usePhotoStore();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const { currentEvent, fetchEventById } = useEventStore();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [bulkSelect, setBulkSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audiencePhoto, setAudiencePhoto] = useState<EventPhoto | null>(null);

  const isHost = useMemo(() => {
    if (!session?.user || !currentEvent) return false;
    return currentEvent.creator_id === session.user.id;
  }, [session, currentEvent]);

  // Load event + photos
  const loadData = useCallback(async () => {
    await fetchEventById(eventId);
    await fetchPhotos(eventId);
  }, [eventId, fetchEventById, fetchPhotos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch pending photos when we know user is host
  useEffect(() => {
    if (isHost) {
      fetchPendingPhotos(eventId);
    }
  }, [isHost, eventId, fetchPendingPhotos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPhotos(eventId);
    if (isHost) {
      await fetchPendingPhotos(eventId);
    }
    setRefreshing(false);
  }, [eventId, isHost, fetchPhotos, fetchPendingPhotos]);

  // Combine and deduplicate photos for host
  const allPhotos = useMemo(() => {
    if (!isHost) return photos;
    const combined = [...pendingPhotos, ...photos];
    const seen = new Set<string>();
    return combined.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [photos, pendingPhotos, isHost]);

  const filteredPhotos = useMemo(() => {
    if (!isHost || filter === 'all') return allPhotos;
    return allPhotos.filter((p) => p.status === filter);
  }, [allPhotos, filter, isHost]);

  const pendingCount = useMemo(
    () => allPhotos.filter((p) => p.status === 'pending').length,
    [allPhotos],
  );

  // --- Upload ---
  const handlePickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'अनुमति चाहिए',
        'फ़ोटो अपलोड करने के लिए गैलरी अनुमति दें।\nPlease grant gallery permission to upload photos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: VALIDATION.maxPhotosPerUpload,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);

    const files = result.assets.map((asset) => ({
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `photo-${Date.now()}.jpg`,
    }));

    const success = await uploadPhotos(eventId, files);
    setUploading(false);

    if (success) {
      Alert.alert(
        'अपलोड सफल!',
        `${files.length} फ़ोटो अपलोड हो गईं। स्वीकृति के बाद दिखेंगी।\n${files.length} photo(s) uploaded. Will appear after host approval.`,
      );
      onRefresh();
    } else {
      Alert.alert(
        'त्रुटि / Error',
        error || 'फ़ोटो अपलोड नहीं हो पाईं। / Failed to upload photos.',
      );
    }
  };

  // --- Moderation ---
  const handleModerate = async (photoId: string, status: 'approved' | 'rejected') => {
    const success = await moderatePhoto(photoId, status);
    if (success) {
      setShowPhotoModal(false);
      setSelectedPhoto(null);
      onRefresh();
    } else {
      Alert.alert('त्रुटि / Error', 'कार्रवाई विफल / Action failed');
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = selectedIds.length > 0
      ? selectedIds
      : allPhotos.filter((p) => p.status === 'pending').map((p) => p.id);

    if (pendingIds.length === 0) {
      Alert.alert('कोई लंबित फ़ोटो नहीं', 'No pending photos to approve.');
      return;
    }

    Alert.alert(
      'सभी स्वीकृत करें?',
      `${pendingIds.length} फ़ोटो स्वीकृत करें?\nApprove ${pendingIds.length} photo(s)?`,
      [
        { text: 'रद्द करें / Cancel', style: 'cancel' },
        {
          text: 'स्वीकृत करें / Approve',
          onPress: async () => {
            for (const id of pendingIds) {
              await moderatePhoto(id, 'approved');
            }
            setSelectedIds([]);
            setBulkSelect(false);
            onRefresh();
            Alert.alert('सफल!', 'सभी फ़ोटो स्वीकृत। / All photos approved.');
          },
        },
      ],
    );
  };

  // --- Privacy ---
  const handleOpenAudience = (photo: EventPhoto) => {
    setAudiencePhoto(photo);
    setShowAudienceModal(true);
  };

  const handlePrivacySelect = async (privacyType: PrivacyType) => {
    if (!audiencePhoto) return;
    const success = await setPhotoPrivacy(audiencePhoto.id, privacyType);
    if (success) {
      setShowAudienceModal(false);
      setAudiencePhoto(null);
      onRefresh();
    } else {
      Alert.alert('त्रुटि', 'गोपनीयता अपडेट विफल। / Privacy update failed.');
    }
  };

  // --- Selection ---
  const togglePhotoSelection = (photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  };

  const openPhotoModal = (photo: EventPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  // --- Render ---
  const renderPhotoItem = useCallback(
    ({ item }: { item: EventPhoto }) => {
      const isSelected = selectedIds.includes(item.id);

      return (
        <PhotoGridItem
          item={item}
          isHost={isHost}
          bulkSelect={bulkSelect}
          isSelected={isSelected}
          onPress={() => {
            if (bulkSelect) {
              togglePhotoSelection(item.id);
            } else {
              openPhotoModal(item);
            }
          }}
          onLongPress={() => {
            if (isHost && !bulkSelect) {
              setBulkSelect(true);
              togglePhotoSelection(item.id);
            }
          }}
        />
      );
    },
    [isHost, bulkSelect, selectedIds],
  );

  const renderHeader = () => (
    <View>
      {/* Upload button */}
      <TouchableOpacity
        style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
        onPress={handlePickPhotos}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={Colors.white} />
            <Text style={[Typography.button, { marginLeft: Spacing.sm }]}>
              अपलोड हो रहा है... / Uploading...
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[Typography.button, { textAlign: 'center' }]}>
              {'📷 फ़ोटो अपलोड करें'}
            </Text>
            <Text style={[Typography.caption, { color: Colors.white, textAlign: 'center', marginTop: 1 }]}>
              Upload Photos
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* QR Code placeholder button */}
      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => setShowQR(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.qrButtonText}>{'🔗 QR कोड साझा करें'}</Text>
        <Text style={[Typography.caption, { color: Colors.haldiGold }]}>Share QR Code</Text>
      </TouchableOpacity>

      {/* Host moderation controls */}
      {isHost && (
        <View style={styles.moderationHeader}>
          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {FILTER_TABS.map((tab) => {
              const isActive = filter === tab.key;
              const count =
                tab.key === 'all'
                  ? allPhotos.length
                  : allPhotos.filter((p) => p.status === tab.key).length;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTabText, isActive && { color: Colors.white }]}>
                    {tab.hindi}
                  </Text>
                  <Text style={[styles.filterTabCount, isActive && { color: 'rgba(255,255,255,0.8)' }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bulk actions */}
          <View style={styles.bulkRow}>
            <TouchableOpacity
              style={[styles.bulkToggle, bulkSelect && styles.bulkToggleActive]}
              onPress={() => {
                setBulkSelect(!bulkSelect);
                setSelectedIds([]);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.bulkToggleText, bulkSelect && { color: Colors.white }]}>
                {bulkSelect ? 'रद्द करें / Cancel' : 'चुनें / Select'}
              </Text>
            </TouchableOpacity>

            {/* Approve All button (always visible when pending exist) */}
            {pendingCount > 0 && (
              <TouchableOpacity
                style={styles.approveAllButton}
                onPress={handleBulkApprove}
                activeOpacity={0.7}
              >
                <Text style={Typography.button}>
                  {'✅ सभी स्वीकृत करें'}
                </Text>
                <Text style={[Typography.caption, { color: Colors.white, marginTop: 1 }]}>
                  Approve All ({pendingCount})
                </Text>
              </TouchableOpacity>
            )}

            {bulkSelect && selectedIds.length > 0 && (
              <TouchableOpacity
                style={styles.bulkApproveButton}
                onPress={handleBulkApprove}
                activeOpacity={0.7}
              >
                <Text style={Typography.button}>
                  {'✅ चुनिंदा स्वीकृत ('}{selectedIds.length}{')'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );

  // --- Loading state ---
  if (isLoading && photos.length === 0 && pendingPhotos.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={[Typography.body, { marginTop: Spacing.lg, textAlign: 'center' }]}>
          फ़ोटो लोड हो रही हैं...
        </Text>
        <Text style={[Typography.bodySmall, { color: Colors.brownLight, marginTop: Spacing.xs }]}>
          Loading photos...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>इवेंट फ़ोटो</Text>
          <Text style={styles.headerSubtitle}>Event Photos</Text>
        </View>
        {isHost && pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filteredPhotos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhotoItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.haldiGold} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'📷'}</Text>
            <Text style={[Typography.body, { textAlign: 'center', color: Colors.brown }]}>
              अभी कोई फ़ोटो नहीं हैं
            </Text>
            <Text style={[Typography.bodySmall, { textAlign: 'center', color: Colors.brownLight, marginTop: Spacing.sm }]}>
              {filter !== 'all'
                ? `No ${filter} photos found.`
                : 'No photos yet. Be the first to upload!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Error banner */}
      {error && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => setError(null)}
          activeOpacity={0.8}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorDismiss}>{'✕'}</Text>
        </TouchableOpacity>
      )}

      {/* Photo Detail / Moderation Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPhotoModal(false);
          setSelectedPhoto(null);
        }}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => {
              setShowPhotoModal(false);
              setSelectedPhoto(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.photoModalCloseText}>{'\u2715'}</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <View style={styles.photoModalContent}>
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />

              {/* Uploader info */}
              <View style={styles.photoInfo}>
                <Text style={[Typography.bodySmall, { color: Colors.white }]}>
                  {selectedPhoto.uploader?.display_name_hindi ||
                    selectedPhoto.uploader?.display_name ||
                    'अज्ञात / Unknown'}
                </Text>
                {selectedPhoto.caption && (
                  <Text style={[Typography.body, { color: Colors.white, marginTop: Spacing.xs }]}>
                    {selectedPhoto.caption}
                  </Text>
                )}
                <View style={[styles.photoStatusBadge, { backgroundColor: STATUS_COLORS[selectedPhoto.status] }]}>
                  <Text style={styles.photoStatusText}>
                    {STATUS_LABELS[selectedPhoto.status].hindi} / {STATUS_LABELS[selectedPhoto.status].en}
                  </Text>
                </View>
              </View>

              {/* Host moderation buttons */}
              {isHost && (
                <View style={styles.moderationButtons}>
                  {selectedPhoto.status !== 'approved' && (
                    <TouchableOpacity
                      style={[styles.modButton, { backgroundColor: Colors.rsvpAccepted }]}
                      onPress={() => handleModerate(selectedPhoto.id, 'approved')}
                      activeOpacity={0.7}
                    >
                      <Text style={Typography.button}>{'✅ स्वीकृत'}</Text>
                      <Text style={styles.modButtonSub}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {selectedPhoto.status !== 'rejected' && (
                    <TouchableOpacity
                      style={[styles.modButton, { backgroundColor: Colors.rsvpDeclined }]}
                      onPress={() => handleModerate(selectedPhoto.id, 'rejected')}
                      activeOpacity={0.7}
                    >
                      <Text style={Typography.button}>{'❌ अस्वीकृत'}</Text>
                      <Text style={styles.modButtonSub}>Reject</Text>
                    </TouchableOpacity>
                  )}
                  {/* Per-photo privacy */}
                  <TouchableOpacity
                    style={[styles.modButton, { backgroundColor: Colors.haldiGold }]}
                    onPress={() => {
                      setShowPhotoModal(false);
                      handleOpenAudience(selectedPhoto);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={Typography.button}>{'🔒 गोपनीयता'}</Text>
                    <Text style={styles.modButtonSub}>Privacy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Audience Selector Modal */}
      <AudienceSelectorModal
        visible={showAudienceModal}
        currentType={audiencePhoto?.privacy_type || 'all'}
        onSelect={handlePrivacySelect}
        onClose={() => {
          setShowAudienceModal(false);
          setAudiencePhoto(null);
        }}
      />

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={[Typography.h2, { textAlign: 'center', marginBottom: Spacing.sm }]}>
              फ़ोटो गैलरी QR कोड
            </Text>
            <Text style={[Typography.bodySmall, { textAlign: 'center', color: Colors.brownLight, marginBottom: Spacing.xl }]}>
              Scan to view and upload photos
            </Text>
            {/* QR Code placeholder */}
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>QR</Text>
              <Text style={[Typography.caption, { textAlign: 'center', marginTop: Spacing.sm }]}>
                aangan://events/{eventId}/photos
              </Text>
            </View>
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQR(false)}
              activeOpacity={0.7}
            >
              <Text style={Typography.button}>बंद करें</Text>
              <Text style={[Typography.caption, { color: Colors.white, marginTop: 1 }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backBtn: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.brown,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.round,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  pendingBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
  },

  // Upload
  uploadButton: {
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // QR
  qrButton: {
    borderWidth: 2,
    borderColor: Colors.haldiGold,
    borderRadius: BorderRadius.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  qrButtonText: {
    ...Typography.label,
    color: Colors.haldiGold,
  },

  // Moderation header
  moderationHeader: {
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.white,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  filterTabActive: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  filterTabText: {
    ...Typography.labelSmall,
    color: Colors.brown,
    fontSize: 13,
  },
  filterTabCount: {
    ...Typography.caption,
    color: Colors.gray500,
    fontSize: 11,
    marginTop: 1,
  },

  // Bulk
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  bulkToggle: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.creamDark,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  bulkToggleActive: {
    backgroundColor: Colors.brown,
  },
  bulkToggleText: {
    ...Typography.labelSmall,
    color: Colors.brown,
  },
  approveAllButton: {
    flex: 1,
    backgroundColor: Colors.mehndiGreen,
    minHeight: DADI_MIN_TAP_TARGET,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  bulkApproveButton: {
    flex: 1,
    backgroundColor: Colors.mehndiGreen,
    minHeight: DADI_MIN_TAP_TARGET,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photo grid
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    zIndex: 1,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    fontSize: 10,
  },
  selectIndicator: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectIndicatorActive: {
    backgroundColor: Colors.mehndiGreen,
    borderColor: Colors.mehndiGreen,
  },
  selectCheck: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty
  emptyState: {
    paddingVertical: Spacing.huge * 2,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },

  // Error banner
  errorBanner: {
    position: 'absolute',
    bottom: Spacing.xxl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.white,
    flex: 1,
  },
  errorDismiss: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: Spacing.md,
  },

  // Photo modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: Spacing.huge,
    right: Spacing.xl,
    zIndex: 10,
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    borderRadius: DADI_MIN_TAP_TARGET / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  photoModalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  photoModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoInfo: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  photoStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  photoStatusText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  moderationButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  modButton: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modButtonSub: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 1,
  },

  // Audience selector modal
  audienceOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  audienceSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.huge,
  },
  audienceTitle: {
    ...Typography.h3,
    color: Colors.brown,
    marginBottom: 2,
  },
  audienceSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginBottom: Spacing.xl,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  audienceOptionActive: {
    borderColor: Colors.haldiGold,
    backgroundColor: Colors.haldiGold + '10',
  },
  audienceOptionIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  audienceOptionText: {
    flex: 1,
  },
  audienceLabel: {
    ...Typography.label,
    color: Colors.brown,
  },
  audienceLabelEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 1,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.haldiGold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.haldiGold,
  },
  audienceCloseBtn: {
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },

  // QR modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.xxl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  qrPlaceholderText: {
    ...Typography.h1,
    color: Colors.gray400,
    fontSize: 48,
  },
  qrCloseButton: {
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
  },
});
