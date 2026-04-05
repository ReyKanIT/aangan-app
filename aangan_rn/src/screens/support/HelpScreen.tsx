import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';

type Props = NativeStackScreenProps<any, 'Help'>;

interface FaqItem {
  id: string;
  questionHi: string;
  questionEn: string;
  answerHi: string;
  answerEn: string;
}

interface FaqSection {
  titleHi: string;
  titleEn: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    titleHi: 'शुरुआत करें',
    titleEn: 'Getting Started',
    items: [
      {
        id: 'gs1',
        questionHi: 'अकाउंट कैसे बनाएं?',
        questionEn: 'How to create an account?',
        answerHi: 'अपना फ़ोन नंबर डालें, OTP प्राप्त करें और वेरिफ़ाई करें। फिर अपना नाम और प्रोफ़ाइल फ़ोटो जोड़ें। बस, आपका अकाउंट तैयार है!',
        answerEn: 'Enter your phone number, receive an OTP and verify it. Then add your name and profile photo. That\'s it, your account is ready!',
      },
      {
        id: 'gs2',
        questionHi: 'परिवार के सदस्य कैसे जोड़ें?',
        questionEn: 'How to add family members?',
        answerHi: 'Family Tree स्क्रीन पर जाएं, "सदस्य जोड़ें" बटन दबाएं। सदस्य का नाम और रिश्ता चुनें। उन्हें एक निमंत्रण भेजा जाएगा।',
        answerEn: 'Go to the Family Tree screen, tap "Add Member". Enter the member\'s name and select the relationship. An invitation will be sent to them.',
      },
      {
        id: 'gs3',
        questionHi: 'पोस्ट कैसे बनाएं?',
        questionEn: 'How to create posts?',
        answerHi: 'होम स्क्रीन पर "+" बटन दबाएं। टेक्स्ट लिखें, फ़ोटो जोड़ें और ऑडियंस चुनें (सभी परिवार, करीबी परिवार, या सिर्फ़ मैं)। फिर "पोस्ट करें" दबाएं।',
        answerEn: 'Tap the "+" button on the home screen. Write text, add photos and select your audience (All Family, Close Family, or Only Me). Then tap "Post".',
      },
    ],
  },
  {
    titleHi: 'इवेंट्स',
    titleEn: 'Events',
    items: [
      {
        id: 'ev1',
        questionHi: 'इवेंट कैसे बनाएं?',
        questionEn: 'How to create events?',
        answerHi: 'Events टैब पर जाएं, "नया इवेंट" दबाएं। इवेंट का नाम, तारीख, समय और जगह भरें। ऑडियंस चुनें और "बनाएं" दबाएं।',
        answerEn: 'Go to the Events tab, tap "New Event". Fill in the event name, date, time and location. Select audience and tap "Create".',
      },
      {
        id: 'ev2',
        questionHi: 'RSVP कैसे करें?',
        questionEn: 'How to RSVP?',
        answerHi: 'इवेंट खोलें और "हाँ", "शायद" या "नहीं" में से एक चुनें। आप बाद में अपना जवाब बदल सकते हैं।',
        answerEn: 'Open the event and choose "Yes", "Maybe" or "No". You can change your response later.',
      },
      {
        id: 'ev3',
        questionHi: 'इवेंट में फ़ोटो कैसे अपलोड करें?',
        questionEn: 'How to upload photos to events?',
        answerHi: 'इवेंट खोलें, "फ़ोटो" टैब पर जाएं और कैमरा या गैलरी आइकन दबाएं। फ़ोटो चुनें और अपलोड करें।',
        answerEn: 'Open the event, go to the "Photos" tab and tap the camera or gallery icon. Select photos and upload.',
      },
    ],
  },
  {
    titleHi: 'पारिवारिक वृक्ष',
    titleEn: 'Family Tree',
    items: [
      {
        id: 'ft1',
        questionHi: 'कनेक्शन लेवल कैसे काम करते हैं?',
        questionEn: 'How do connection levels work?',
        answerHi: 'Level 1: माता-पिता, पति/पत्नी, बच्चे, भाई-बहन। Level 2: चाचा, मामा, बुआ, मौसी, चचेरे भाई-बहन। Level 3: दूर के रिश्तेदार। लेवल जितना करीब, उतना ज़्यादा कंटेंट दिखता है।',
        answerEn: 'Level 1: Parents, spouse, children, siblings. Level 2: Uncles, aunts, cousins. Level 3: Distant relatives. Closer levels see more content.',
      },
      {
        id: 'ft2',
        questionHi: 'सदस्य को कैसे हटाएं?',
        questionEn: 'How to remove a member?',
        answerHi: 'Family Tree में सदस्य की प्रोफ़ाइल खोलें, "कनेक्शन हटाएं" दबाएं। दोनों तरफ़ से कनेक्शन हट जाएगा।',
        answerEn: 'Open the member\'s profile in Family Tree, tap "Remove Connection". The connection will be removed from both sides.',
      },
      {
        id: 'ft3',
        questionHi: 'रिश्ते की पुष्टि कैसे करें?',
        questionEn: 'How to verify relationships?',
        answerHi: 'जब कोई आपको जोड़ता है, तो आपको एक अनुरोध मिलता है। रिश्ता देखें और "स्वीकार करें" या "अस्वीकार करें" दबाएं।',
        answerEn: 'When someone adds you, you receive a request. Review the relationship and tap "Accept" or "Decline".',
      },
    ],
  },
  {
    titleHi: 'प्राइवेसी और सुरक्षा',
    titleEn: 'Privacy & Security',
    items: [
      {
        id: 'ps1',
        questionHi: 'मेरी पोस्ट कौन देख सकता है?',
        questionEn: 'Who can see my posts?',
        answerHi: 'आप हर पोस्ट के लिए ऑडियंस चुन सकते हैं: "सभी परिवार" (Level 1-3), "करीबी परिवार" (Level 1-2), या "सिर्फ़ मैं"।',
        answerEn: 'You can choose the audience for each post: "All Family" (Level 1-3), "Close Family" (Level 1-2), or "Only Me".',
      },
      {
        id: 'ps2',
        questionHi: 'ऑडियंस कंट्रोल कैसे काम करता है?',
        questionEn: 'How does audience control work?',
        answerHi: 'पोस्ट और इवेंट बनाते समय आप चुनते हैं कि कौन-सा लेवल देख सकता है। आप बाद में भी ऑडियंस बदल सकते हैं।',
        answerEn: 'When creating posts and events, you choose which level can see them. You can change the audience later too.',
      },
      {
        id: 'ps3',
        questionHi: 'किसी को ब्लॉक कैसे करें?',
        questionEn: 'How to block someone?',
        answerHi: 'सदस्य की प्रोफ़ाइल पर जाएं, मेन्यू (⋮) दबाएं और "ब्लॉक करें" चुनें। ब्लॉक किया हुआ सदस्य आपकी पोस्ट और इवेंट नहीं देख पाएगा।',
        answerEn: 'Go to the member\'s profile, tap the menu (three dots) and select "Block". A blocked member won\'t see your posts and events.',
      },
    ],
  },
  {
    titleHi: 'अकाउंट',
    titleEn: 'Account',
    items: [
      {
        id: 'ac1',
        questionHi: 'प्रोफ़ाइल कैसे बदलें?',
        questionEn: 'How to change profile?',
        answerHi: 'Settings > प्रोफ़ाइल एडिट करें। आप अपना नाम, फ़ोटो, गाँव और अन्य जानकारी बदल सकते हैं।',
        answerEn: 'Settings > Edit Profile. You can change your name, photo, village and other information.',
      },
      {
        id: 'ac2',
        questionHi: 'भाषा कैसे बदलें?',
        questionEn: 'How to change language?',
        answerHi: 'Settings में जाएं, "भाषा / Language" विकल्प पर टैप करें। हिंदी या English में से चुनें।',
        answerEn: 'Go to Settings, tap the "Language" option. Choose between Hindi or English.',
      },
      {
        id: 'ac3',
        questionHi: 'सहायता से संपर्क कैसे करें?',
        questionEn: 'How to contact support?',
        answerHi: 'इस स्क्रीन के नीचे "सहायता से संपर्क करें" बटन दबाएं या support@aangan.app पर ईमेल करें।',
        answerEn: 'Tap the "Contact Support" button at the bottom of this screen or email support@aangan.app.',
      },
    ],
  },
];

function AccordionItem({ item, isHindi }: { item: FaqItem; isHindi: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqQuestionContainer}>
          <Text style={styles.faqQuestion}>
            {isHindi ? item.questionHi : item.questionEn}
          </Text>
          {isHindi && (
            <Text style={styles.faqQuestionSub}>{item.questionEn}</Text>
          )}
        </View>
        <Text style={styles.faqArrow}>{expanded ? '−' : '+'}</Text>
      </View>
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>
            {isHindi ? item.answerHi : item.answerEn}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@aangan.app?subject=Aangan Support Request');
  };

  const handleFeedback = () => {
    navigation.navigate('Feedback');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {isHindi ? 'सहायता' : 'Help'}
          </Text>
          {isHindi && <Text style={styles.headerSubtitle}>Help & FAQ</Text>}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Sections */}
        {FAQ_SECTIONS.map((section, sectionIdx) => (
          <View key={sectionIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isHindi ? section.titleHi : section.titleEn}
            </Text>
            {isHindi && (
              <Text style={styles.sectionSubtitle}>{section.titleEn}</Text>
            )}
            {section.items.map((item) => (
              <AccordionItem key={item.id} item={item} isHindi={isHindi} />
            ))}
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={handleFeedback}
            activeOpacity={0.8}
          >
            <Text style={styles.feedbackButtonText}>
              {isHindi ? 'फ़ीडबैक दें' : 'Give Feedback'}
            </Text>
            {isHindi && (
              <Text style={styles.feedbackButtonSub}>Give Feedback</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>
              {isHindi ? 'सहायता से संपर्क करें' : 'Contact Support'}
            </Text>
            {isHindi && (
              <Text style={styles.contactButtonSub}>Contact Support</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: Colors.brown,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h2,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.haldiGold,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.md,
  },
  faqItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  faqQuestionContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  faqQuestion: {
    ...Typography.body,
    fontWeight: '500',
  },
  faqQuestionSub: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginTop: 2,
  },
  faqArrow: {
    fontSize: 22,
    color: Colors.haldiGold,
    fontWeight: '700',
  },
  faqAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.md,
  },
  faqAnswerText: {
    ...Typography.body,
    color: Colors.brownLight,
    lineHeight: 24,
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  feedbackButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    ...Shadow.md,
  },
  feedbackButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  feedbackButtonSub: {
    ...Typography.bodySmall,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.haldiGold,
    ...Shadow.sm,
  },
  contactButtonText: {
    ...Typography.button,
    color: Colors.haldiGold,
  },
  contactButtonSub: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginTop: 2,
  },
});
