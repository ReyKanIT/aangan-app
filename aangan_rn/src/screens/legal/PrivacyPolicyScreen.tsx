import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';

type Props = NativeStackScreenProps<any, 'PrivacyPolicy'>;

const LAST_UPDATED = 'March 31, 2026';
const LAST_UPDATED_HI = '31 मार्च, 2026';

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Paragraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletItem({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>{'\u2022'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function PrivacyHindi() {
  return (
    <>
      <Text style={styles.lastUpdated}>
        अंतिम अपडेट: {LAST_UPDATED_HI}
      </Text>

      <SectionTitle>1. हम कौन सी जानकारी एकत्र करते हैं</SectionTitle>
      <Paragraph>
        Aangan ऐप का उपयोग करते समय, हम निम्नलिखित जानकारी एकत्र करते हैं:
      </Paragraph>
      <BulletItem>फ़ोन नंबर (अकाउंट बनाने और लॉगिन के लिए)</BulletItem>
      <BulletItem>नाम और प्रोफ़ाइल फ़ोटो</BulletItem>
      <BulletItem>गाँव / शहर की जानकारी</BulletItem>
      <BulletItem>पारिवारिक कनेक्शन और रिश्ते</BulletItem>
      <BulletItem>पोस्ट, फ़ोटो और इवेंट जो आप बनाते हैं</BulletItem>
      <BulletItem>इवेंट चेक-इन के लिए लोकेशन (आपकी अनुमति से)</BulletItem>
      <BulletItem>डिवाइस की जानकारी (ऐप सुधार के लिए)</BulletItem>

      <SectionTitle>2. हम आपका डेटा कैसे उपयोग करते हैं</SectionTitle>
      <Paragraph>
        आपकी जानकारी का उपयोग निम्नलिखित उद्देश्यों के लिए किया जाता है:
      </Paragraph>
      <BulletItem>Aangan सेवा प्रदान करना और उसे बेहतर बनाना</BulletItem>
      <BulletItem>नई पोस्ट, इवेंट और RSVP की सूचनाएं भेजना</BulletItem>
      <BulletItem>ऐप के उपयोग का विश्लेषण करना (अनाम एनालिटिक्स)</BulletItem>
      <BulletItem>तकनीकी समस्याओं को ठीक करना</BulletItem>
      <BulletItem>आपकी सुरक्षा और अकाउंट की सुरक्षा सुनिश्चित करना</BulletItem>

      <SectionTitle>3. डेटा साझाकरण</SectionTitle>
      <Paragraph>
        हम आपका डेटा नहीं बेचते। आपकी जानकारी केवल आपके परिवार के सदस्यों के साथ साझा की जाती है, वह भी आपकी ऑडियंस सेटिंग्स के अनुसार। तीसरे पक्ष को डेटा तभी दिया जाता है जब कानूनी रूप से आवश्यक हो।
      </Paragraph>

      <SectionTitle>4. डेटा स्टोरेज</SectionTitle>
      <Paragraph>
        आपका डेटा Supabase के सुरक्षित सर्वर पर स्टोर किया जाता है। सभी डेटा ट्रांसफ़र एन्क्रिप्टेड (HTTPS/TLS) है। हम उद्योग-मानक सुरक्षा उपायों का पालन करते हैं।
      </Paragraph>

      <SectionTitle>5. आपके अधिकार</SectionTitle>
      <Paragraph>
        आपके पास निम्नलिखित अधिकार हैं:
      </Paragraph>
      <BulletItem>अपने डेटा तक पहुंच: आप अपनी सभी जानकारी देख सकते हैं</BulletItem>
      <BulletItem>डेटा सुधार: आप अपनी जानकारी में सुधार कर सकते हैं</BulletItem>
      <BulletItem>डेटा हटाना: आप अपना अकाउंट और डेटा डिलीट कर सकते हैं</BulletItem>
      <BulletItem>डेटा एक्सपोर्ट: आप अपने डेटा की कॉपी डाउनलोड कर सकते हैं</BulletItem>

      <SectionTitle>6. बच्चों की गोपनीयता</SectionTitle>
      <Paragraph>
        Aangan 13 वर्ष या उससे अधिक उम्र के उपयोगकर्ताओं के लिए है। हम जानबूझकर 13 वर्ष से कम उम्र के बच्चों से डेटा एकत्र नहीं करते। यदि हमें पता चलता है कि किसी नाबालिग ने अकाउंट बनाया है, तो हम उसे हटा देंगे।
      </Paragraph>

      <SectionTitle>7. संपर्क</SectionTitle>
      <Paragraph>
        गोपनीयता संबंधी प्रश्नों के लिए, कृपया हमसे संपर्क करें: privacy@aangan.app
      </Paragraph>
    </>
  );
}

function PrivacyEnglish() {
  return (
    <>
      <Text style={styles.lastUpdated}>
        Last Updated: {LAST_UPDATED}
      </Text>

      <SectionTitle>1. Information We Collect</SectionTitle>
      <Paragraph>
        When using the Aangan app, we collect the following information:
      </Paragraph>
      <BulletItem>Phone number (for account creation and login)</BulletItem>
      <BulletItem>Name and profile photo</BulletItem>
      <BulletItem>Village / city information</BulletItem>
      <BulletItem>Family connections and relationships</BulletItem>
      <BulletItem>Posts, photos, and events you create</BulletItem>
      <BulletItem>Location for event check-ins (with your permission)</BulletItem>
      <BulletItem>Device information (for app improvement)</BulletItem>

      <SectionTitle>2. How We Use Your Data</SectionTitle>
      <Paragraph>
        Your information is used for the following purposes:
      </Paragraph>
      <BulletItem>Providing and improving the Aangan service</BulletItem>
      <BulletItem>Sending notifications for new posts, events, and RSVPs</BulletItem>
      <BulletItem>Analyzing app usage (anonymous analytics)</BulletItem>
      <BulletItem>Fixing technical issues</BulletItem>
      <BulletItem>Ensuring your security and account safety</BulletItem>

      <SectionTitle>3. Data Sharing</SectionTitle>
      <Paragraph>
        We do not sell your data. Your information is only shared with your family members according to your audience settings. Data is provided to third parties only when legally required.
      </Paragraph>

      <SectionTitle>4. Data Storage</SectionTitle>
      <Paragraph>
        Your data is stored on secure Supabase servers. All data transfers are encrypted (HTTPS/TLS). We follow industry-standard security measures.
      </Paragraph>

      <SectionTitle>5. Your Rights</SectionTitle>
      <Paragraph>
        You have the following rights:
      </Paragraph>
      <BulletItem>Access your data: You can view all your information</BulletItem>
      <BulletItem>Data correction: You can correct your information</BulletItem>
      <BulletItem>Data deletion: You can delete your account and data</BulletItem>
      <BulletItem>Data export: You can download a copy of your data</BulletItem>

      <SectionTitle>6. Children's Privacy</SectionTitle>
      <Paragraph>
        Aangan is intended for users aged 13 and above. We do not knowingly collect data from children under 13. If we learn that a minor has created an account, we will remove it.
      </Paragraph>

      <SectionTitle>7. Contact</SectionTitle>
      <Paragraph>
        For privacy-related questions, please contact us at: privacy@aangan.app
      </Paragraph>
    </>
  );
}

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();

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
            {isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}
          </Text>
          {isHindi && (
            <Text style={styles.headerSubtitle}>Privacy Policy</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.appTitle}>Aangan</Text>
        <Text style={styles.appSubtitle}>
          {isHindi ? 'गोपनीयता नीति' : 'Privacy Policy'}
        </Text>

        {isHindi ? <PrivacyHindi /> : <PrivacyEnglish />}

        <View style={{ height: Spacing.huge }} />
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  appTitle: {
    ...Typography.h1,
    color: Colors.haldiGold,
    textAlign: 'center',
  },
  appSubtitle: {
    ...Typography.body,
    color: Colors.brownLight,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  lastUpdated: {
    ...Typography.bodySmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.brown,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    ...Typography.body,
    color: Colors.brownLight,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  bullet: {
    ...Typography.body,
    color: Colors.haldiGold,
    marginRight: Spacing.sm,
    lineHeight: 26,
  },
  bulletText: {
    ...Typography.body,
    color: Colors.brownLight,
    flex: 1,
    lineHeight: 26,
  },
});
