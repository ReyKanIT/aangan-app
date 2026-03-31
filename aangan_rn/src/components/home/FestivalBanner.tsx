import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';

interface Festival {
  id: string;
  name: string;
  nameEn?: string;
  date: string;
  icon: string;
  color: string;
  description?: string;
  descriptionEn?: string;
}

interface FestivalBannerProps {
  festivals: Festival[];
}

const CARD_WIDTH = Dimensions.get('window').width * 0.4;

export default function FestivalBanner({ festivals }: FestivalBannerProps) {
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null);

  if (!festivals || festivals.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>आगामी त्योहार</Text>
      <Text style={styles.sectionSubtitle}>Upcoming Festivals</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {festivals.map((festival) => (
          <TouchableOpacity
            key={festival.id}
            style={[styles.card, { backgroundColor: festival.color + '18' }]}
            onPress={() => setSelectedFestival(festival)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: festival.color + '30' }]}>
              <Text style={styles.icon}>{festival.icon}</Text>
            </View>
            <Text style={styles.festivalName} numberOfLines={1}>
              {festival.name}
            </Text>
            {festival.nameEn && (
              <Text style={styles.festivalNameEn} numberOfLines={1}>
                {festival.nameEn}
              </Text>
            )}
            <Text style={styles.festivalDate}>{festival.date}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Festival Details Modal */}
      <Modal
        visible={selectedFestival !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFestival(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFestival && (
              <>
                <View
                  style={[
                    styles.modalHeader,
                    { backgroundColor: selectedFestival.color + '18' },
                  ]}
                >
                  <Text style={styles.modalIcon}>{selectedFestival.icon}</Text>
                  <Text style={styles.modalTitle}>{selectedFestival.name}</Text>
                  {selectedFestival.nameEn && (
                    <Text style={styles.modalTitleEn}>
                      {selectedFestival.nameEn}
                    </Text>
                  )}
                  <Text style={styles.modalDate}>{selectedFestival.date}</Text>
                </View>

                {selectedFestival.description && (
                  <View style={styles.modalBody}>
                    <Text style={styles.modalDescription}>
                      {selectedFestival.description}
                    </Text>
                    {selectedFestival.descriptionEn && (
                      <Text style={styles.modalDescriptionEn}>
                        {selectedFestival.descriptionEn}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedFestival(null)}
                >
                  <Text style={styles.modalCloseBtnText}>बंद करें</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: 2,
    paddingHorizontal: Spacing.lg,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginRight: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  festivalName: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 14,
    textAlign: 'center',
  },
  festivalNameEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 1,
  },
  festivalDate: {
    ...Typography.caption,
    color: Colors.gray600,
    marginTop: Spacing.xs,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.brown,
    textAlign: 'center',
  },
  modalTitleEn: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  modalDate: {
    ...Typography.label,
    color: Colors.haldiGold,
    marginTop: Spacing.sm,
  },
  modalBody: {
    padding: Spacing.xxl,
  },
  modalDescription: {
    ...Typography.body,
    color: Colors.brown,
    lineHeight: 26,
  },
  modalDescriptionEn: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  modalCloseBtn: {
    height: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxxl,
    borderRadius: BorderRadius.md,
  },
  modalCloseBtnText: {
    ...Typography.button,
    color: Colors.white,
  },
});
