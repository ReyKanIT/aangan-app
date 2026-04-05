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

type Props = NativeStackScreenProps<any, 'Terms'>;

const LAST_UPDATED = 'March 31, 2026';
const LAST_UPDATED_HI = '31 मार्च, 2026';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>{'\u2022'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function TermsHindi() {
  return (
    <>
      <Text style={styles.lastUpdated}>
        अंतिम अपडेट: {LAST_UPDATED_HI}
      </Text>

      <SectionTitle>1. शर्तों की स्वीकृति</SectionTitle>
      <Paragraph>
        Aangan ("{'\u0906\u0901\u0917\u0928'}") ऐप का उपयोग करके, आप इन सेवा की शर्तों से सहमत होते हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो कृपया ऐप का उपयोग न करें।
      </Paragraph>

      <SectionTitle>2. अकाउंट पंजीकरण</SectionTitle>
      <Paragraph>
        Aangan पर अकाउंट बनाने के लिए आपको एक वैध फ़ोन नंबर चाहिए। OTP (वन-टाइम पासवर्ड) से वेरिफ़िकेशन ज़रूरी है। एक फ़ोन नंबर पर केवल एक अकाउंट बनाया जा सकता है। आप अपनी अकाउंट जानकारी की सुरक्षा के लिए ज़िम्मेदार हैं।
      </Paragraph>

      <SectionTitle>3. उपयोगकर्ता सामग्री और आचरण</SectionTitle>
      <Paragraph>
        Aangan एक पारिवारिक सोशल नेटवर्क है। आप सहमत हैं कि:
      </Paragraph>
      <BulletItem>आप किसी का उत्पीड़न, धमकी या अपमान नहीं करेंगे</BulletItem>
      <BulletItem>आप फ़र्ज़ी अकाउंट नहीं बनाएंगे या किसी की नकल नहीं करेंगे</BulletItem>
      <BulletItem>आप स्पैम, विज्ञापन या अवांछित सामग्री पोस्ट नहीं करेंगे</BulletItem>
      <BulletItem>आप अश्लील, हिंसक या आपत्तिजनक सामग्री साझा नहीं करेंगे</BulletItem>
      <BulletItem>आप अन्य उपयोगकर्ताओं की सहमति के बिना उनकी व्यक्तिगत जानकारी साझा नहीं करेंगे</BulletItem>

      <SectionTitle>4. गोपनीयता</SectionTitle>
      <Paragraph>
        हम आपकी गोपनीयता का सम्मान करते हैं। हम एकत्र करते हैं: फ़ोन नंबर, नाम, प्रोफ़ाइल फ़ोटो, पारिवारिक कनेक्शन, और इवेंट के लिए लोकेशन। विस्तृत जानकारी के लिए कृपया हमारी गोपनीयता नीति देखें।
      </Paragraph>

      <SectionTitle>5. पारिवारिक कनेक्शन</SectionTitle>
      <Paragraph>
        पारिवारिक कनेक्शन द्विपक्षीय हैं - दोनों पक्षों की सहमति आवश्यक है। कोई भी पक्ष किसी भी समय कनेक्शन हटा सकता है। कनेक्शन हटाने से दोनों तरफ़ से कनेक्शन समाप्त हो जाता है।
      </Paragraph>

      <SectionTitle>6. सामग्री मॉडरेशन</SectionTitle>
      <Paragraph>
        हम ऐसी किसी भी सामग्री को हटाने का अधिकार रखते हैं जो हमारे दिशानिर्देशों का उल्लंघन करती है। बार-बार उल्लंघन करने पर अकाउंट निलंबन या समाप्ति हो सकती है। उपयोगकर्ता ऐप के भीतर आपत्तिजनक सामग्री की रिपोर्ट कर सकते हैं।
      </Paragraph>

      <SectionTitle>7. स्टोरेज और सब्सक्रिप्शन</SectionTitle>
      <Paragraph>
        मुफ़्त खातों को सीमित स्टोरेज मिलता है। अतिरिक्त स्टोरेज सशुल्क सब्सक्रिप्शन के माध्यम से उपलब्ध है। सब्सक्रिप्शन ऑटो-रिन्यू होती है जब तक रद्द नहीं की जाती।
      </Paragraph>

      <SectionTitle>8. अकाउंट समाप्ति</SectionTitle>
      <Paragraph>
        आप किसी भी समय अपना अकाउंट डिलीट कर सकते हैं। शर्तों के उल्लंघन पर हम आपका अकाउंट निलंबित या समाप्त कर सकते हैं। अकाउंट डिलीट करने पर आपका डेटा 30 दिनों के भीतर हटा दिया जाएगा।
      </Paragraph>

      <SectionTitle>9. दायित्व की सीमा</SectionTitle>
      <Paragraph>
        Aangan "जैसा है" और "जैसा उपलब्ध है" के आधार पर प्रदान किया जाता है। हम सेवा में किसी भी रुकावट या डेटा हानि के लिए ज़िम्मेदार नहीं हैं। उपयोगकर्ताओं के बीच विवादों में हम मध्यस्थता नहीं करते।
      </Paragraph>

      <SectionTitle>10. संपर्क</SectionTitle>
      <Paragraph>
        इन शर्तों के बारे में प्रश्नों के लिए, कृपया हमसे संपर्क करें: legal@aangan.app
      </Paragraph>
    </>
  );
}

function TermsEnglish() {
  return (
    <>
      <Text style={styles.lastUpdated}>
        Last Updated: {LAST_UPDATED}
      </Text>

      <SectionTitle>1. Acceptance of Terms</SectionTitle>
      <Paragraph>
        By using the Aangan app, you agree to these Terms of Service. If you do not agree with these terms, please do not use the app.
      </Paragraph>

      <SectionTitle>2. Account Registration</SectionTitle>
      <Paragraph>
        To create an account on Aangan, you need a valid phone number. Verification via OTP (One-Time Password) is required. Only one account can be created per phone number. You are responsible for maintaining the security of your account information.
      </Paragraph>

      <SectionTitle>3. User Content and Conduct</SectionTitle>
      <Paragraph>
        Aangan is a family social network. You agree that:
      </Paragraph>
      <BulletItem>You will not harass, threaten, or insult anyone</BulletItem>
      <BulletItem>You will not create fake accounts or impersonate others</BulletItem>
      <BulletItem>You will not post spam, advertisements, or unsolicited content</BulletItem>
      <BulletItem>You will not share obscene, violent, or objectionable content</BulletItem>
      <BulletItem>You will not share personal information of others without their consent</BulletItem>

      <SectionTitle>4. Privacy</SectionTitle>
      <Paragraph>
        We respect your privacy. We collect: phone number, name, profile photo, family connections, and location for events. For detailed information, please see our Privacy Policy.
      </Paragraph>

      <SectionTitle>5. Family Connections</SectionTitle>
      <Paragraph>
        Family connections are bidirectional and require consent from both parties. Either party can remove a connection at any time. Removing a connection terminates it from both sides.
      </Paragraph>

      <SectionTitle>6. Content Moderation</SectionTitle>
      <Paragraph>
        We reserve the right to remove any content that violates our guidelines. Repeated violations may result in account suspension or termination. Users can report objectionable content within the app.
      </Paragraph>

      <SectionTitle>7. Storage and Subscriptions</SectionTitle>
      <Paragraph>
        Free accounts receive limited storage. Additional storage is available through paid subscriptions. Subscriptions auto-renew unless cancelled.
      </Paragraph>

      <SectionTitle>8. Termination</SectionTitle>
      <Paragraph>
        You may delete your account at any time. We may suspend or terminate your account for violation of terms. Upon account deletion, your data will be removed within 30 days.
      </Paragraph>

      <SectionTitle>9. Limitation of Liability</SectionTitle>
      <Paragraph>
        Aangan is provided on an "as is" and "as available" basis. We are not responsible for any service interruptions or data loss. We do not mediate disputes between users.
      </Paragraph>

      <SectionTitle>10. Contact</SectionTitle>
      <Paragraph>
        For questions about these terms, please contact us at: legal@aangan.app
      </Paragraph>
    </>
  );
}

export default function TermsScreen({ navigation }: Props) {
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
            {isHindi ? 'सेवा की शर्तें' : 'Terms of Service'}
          </Text>
          {isHindi && (
            <Text style={styles.headerSubtitle}>Terms of Service</Text>
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
          {isHindi ? 'सेवा की शर्तें' : 'Terms of Service'}
        </Text>

        {isHindi ? <TermsHindi /> : <TermsEnglish />}

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
