import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Aangan आँगन',
  description: 'Aangan Privacy Policy — गोपनीयता नीति',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FDFAF0]">
      {/* Header */}
      <header className="bg-[#C8A84B] text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2">गोपनीयता नीति</h1>
        <p className="text-lg opacity-90">Privacy Policy</p>
        <p className="mt-2 text-sm opacity-75">Aangan आँगन (app.aangan.family)</p>
        <p className="text-sm opacity-75">प्रभावी तिथि / Effective Date: April 4, 2026</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">परिचय</h2>
          <p className="text-gray-800 mb-4 leading-relaxed">
            आँगन (&quot;Aangan&quot;) में आपका स्वागत है। आपकी गोपनीयता हमारे लिए
            बहुत महत्वपूर्ण है। यह नीति बताती है कि हम आपकी जानकारी कैसे एकत्र
            करते हैं, उपयोग करते हैं और सुरक्षित रखते हैं।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Welcome to Aangan. Your privacy is very important to us. This policy
            explains how we collect, use, and protect your information.
          </p>
        </section>

        {/* Data We Collect */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            हम कौन सा डेटा एकत्र करते हैं
          </h2>
          <p className="text-sm text-gray-500 mb-3">Data We Collect</p>
          <div className="bg-white rounded-xl p-6 border border-[#C8A84B]/20 space-y-3">
            <DataItem
              hi="नाम, ईमेल और फ़ोन नंबर"
              en="Name, email, and phone number"
            />
            <DataItem hi="प्रोफ़ाइल फ़ोटो" en="Profile photo" />
            <DataItem
              hi="पारिवारिक रिश्ते और वंश वृक्ष की जानकारी"
              en="Family relationships and family tree data"
            />
            <DataItem
              hi="पोस्ट, टिप्पणियाँ और इवेंट की जानकारी"
              en="Posts, comments, and event information"
            />
            <DataItem
              hi="इवेंट के लिए स्थान की जानकारी"
              en="Location data (for events)"
            />
            <DataItem
              hi="वॉइस मैसेज के लिए ऑडियो रिकॉर्डिंग"
              en="Voice recordings (for voice messages)"
            />
            <DataItem
              hi="डिवाइस की जानकारी और ऐप उपयोग डेटा"
              en="Device information and app usage data"
            />
          </div>
        </section>

        {/* How We Use Data */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            हम डेटा का उपयोग कैसे करते हैं
          </h2>
          <p className="text-sm text-gray-500 mb-3">How We Use Your Data</p>
          <ul className="list-disc list-inside space-y-2 text-gray-800">
            <li>आपके परिवार को जोड़ने और पारिवारिक फ़ीड दिखाने के लिए</li>
            <li>इवेंट, RSVP और सूचनाएँ प्रबंधित करने के लिए</li>
            <li>ऐप अनुभव को बेहतर बनाने के लिए</li>
          </ul>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mt-3">
            <li>To connect your family and display family feeds</li>
            <li>To manage events, RSVPs, and notifications</li>
            <li>To improve the app experience</li>
          </ul>
        </section>

        {/* Data Storage & Security */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            डेटा संग्रहण और सुरक्षा
          </h2>
          <p className="text-sm text-gray-500 mb-3">Data Storage &amp; Security</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            आपका डेटा Supabase पर सुरक्षित रूप से संग्रहीत किया जाता है, जिसमें
            Row Level Security (RLS) सक्षम है। इसका मतलब है कि आपका डेटा केवल
            आपके और आपके अधिकृत परिवार के सदस्यों द्वारा ही एक्सेस किया जा सकता
            है।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Your data is stored securely on Supabase with Row Level Security
            (RLS) enabled. This means your data can only be accessed by you and
            your authorized family members.
          </p>
        </section>

        {/* No Data Selling */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            हम आपका डेटा नहीं बेचते
          </h2>
          <p className="text-sm text-gray-500 mb-3">We Do Not Sell Your Data</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            हम आपकी व्यक्तिगत जानकारी किसी तीसरे पक्ष को नहीं बेचते, किराए पर
            नहीं देते या व्यापार नहीं करते। आपका डेटा केवल आपके परिवार के भीतर
            Aangan ऐप की सेवाएँ प्रदान करने के लिए उपयोग किया जाता है।
          </p>
          <p className="text-gray-600 leading-relaxed">
            We do not sell, rent, or trade your personal information to any third
            parties. Your data is used solely to provide Aangan app services
            within your family.
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            डेटा प्रतिधारण
          </h2>
          <p className="text-sm text-gray-500 mb-3">Data Retention</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            जब तक आपका खाता सक्रिय है, हम आपका डेटा बनाए रखते हैं। यदि आप अपना
            खाता हटाना चाहते हैं, तो कृपया हमसे संपर्क करें और हम 30 दिनों के
            भीतर आपका सारा डेटा हटा देंगे।
          </p>
          <p className="text-gray-600 leading-relaxed">
            We retain your data as long as your account is active. If you wish to
            delete your account, please contact us and we will remove all your
            data within 30 days.
          </p>
        </section>

        {/* Children's Privacy */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            बच्चों की गोपनीयता
          </h2>
          <p className="text-sm text-gray-500 mb-3">Children&apos;s Privacy</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            Aangan 13 वर्ष से कम उम्र के बच्चों के लिए डिज़ाइन नहीं किया गया है।
            हम जानबूझकर 13 वर्ष से कम उम्र के बच्चों से व्यक्तिगत जानकारी एकत्र
            नहीं करते।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Aangan is not designed for children under 13 years of age. We do not
            knowingly collect personal information from children under 13.
          </p>
        </section>

        {/* Account Deletion */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            खाता हटाना
          </h2>
          <p className="text-sm text-gray-500 mb-3">Account Deletion</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            आप किसी भी समय अपना खाता हटाने का अनुरोध कर सकते हैं। कृपया
            support@aangan.app पर ईमेल करें। खाता हटाने पर, आपकी सभी व्यक्तिगत
            जानकारी, पोस्ट और पारिवारिक डेटा 30 दिनों के भीतर स्थायी रूप से हटा
            दिया जाएगा।
          </p>
          <p className="text-gray-600 leading-relaxed">
            You can request to delete your account at any time by emailing
            support@aangan.app. Upon account deletion, all your personal
            information, posts, and family data will be permanently removed
            within 30 days.
          </p>
        </section>

        {/* Changes to Policy */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            नीति में बदलाव
          </h2>
          <p className="text-sm text-gray-500 mb-3">Changes to This Policy</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            हम समय-समय पर इस गोपनीयता नीति को अपडेट कर सकते हैं। किसी भी बदलाव
            के बारे में हम ऐप के माध्यम से आपको सूचित करेंगे।
          </p>
          <p className="text-gray-600 leading-relaxed">
            We may update this privacy policy from time to time. We will notify
            you of any changes through the app.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl p-6 border border-[#C8A84B]/20">
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">संपर्क करें</h2>
          <p className="text-sm text-gray-500 mb-3">Contact Us</p>
          <p className="text-gray-800 mb-2">
            यदि आपके कोई प्रश्न हैं, तो कृपया हमसे संपर्क करें:
          </p>
          <p className="text-gray-600 mb-4">
            If you have any questions, please contact us:
          </p>
          <div className="space-y-1 text-gray-800">
            <p>
              <span className="font-semibold">ईमेल / Email:</span>{' '}
              <a
                href="mailto:support@aangan.app"
                className="text-[#C8A84B] underline"
              >
                support@aangan.app
              </a>
            </p>
            <p>
              <span className="font-semibold">कंपनी / Company:</span> Aangan
              Family, India
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 pt-6 border-t border-[#C8A84B]/10">
          <p>&copy; 2026 Aangan Family. All rights reserved.</p>
          <p className="mt-1">सर्वाधिकार सुरक्षित।</p>
        </footer>
      </div>
    </main>
  );
}

function DataItem({ hi, en }: { hi: string; en: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#C8A84B] mt-1">&#x2022;</span>
      <div>
        <p className="text-gray-800">{hi}</p>
        <p className="text-gray-500 text-sm">{en}</p>
      </div>
    </div>
  );
}
