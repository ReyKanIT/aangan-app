import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Aangan Terms of Service — सेवा की शर्तें',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#FDFAF0]">
      {/* Header */}
      <header className="bg-[#C8A84B] text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2">सेवा की शर्तें</h1>
        <p className="text-lg opacity-90">Terms of Service</p>
        <p className="mt-2 text-sm opacity-75">Aangan आँगन (app.aangan.family)</p>
        <p className="text-sm opacity-75">प्रभावी तिथि / Effective Date: April 4, 2026</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Service Description */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            सेवा का विवरण
          </h2>
          <p className="text-sm text-gray-500 mb-3">Service Description</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            आँगन एक पारिवारिक सोशल नेटवर्क है जो भारतीय परिवारों को जोड़ने के
            लिए बनाया गया है। इसमें वंश वृक्ष, पारिवारिक पोस्ट, इवेंट
            प्रबंधन, फ़ोटो शेयरिंग और वॉइस मैसेज की सुविधाएँ शामिल हैं।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Aangan is a family social network designed to connect Indian
            families. It includes features for family trees, family posts, event
            management, photo sharing, and voice messages.
          </p>
        </section>

        {/* Acceptance of Terms */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            शर्तों की स्वीकृति
          </h2>
          <p className="text-sm text-gray-500 mb-3">Acceptance of Terms</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            Aangan का उपयोग करके, आप इन सेवा की शर्तों से सहमत होते हैं। यदि
            आप इन शर्तों से सहमत नहीं हैं, तो कृपया ऐप का उपयोग न करें।
          </p>
          <p className="text-gray-600 leading-relaxed">
            By using Aangan, you agree to these Terms of Service. If you do not
            agree to these terms, please do not use the app.
          </p>
        </section>

        {/* User Responsibilities */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            उपयोगकर्ता की ज़िम्मेदारियाँ
          </h2>
          <p className="text-sm text-gray-500 mb-3">User Responsibilities</p>
          <p className="text-gray-800 mb-3">
            Aangan का उपयोग करते समय, आप सहमत हैं कि:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-800 mb-4">
            <li>आप कोई भी हानिकारक, अपमानजनक या अवैध सामग्री पोस्ट नहीं करेंगे</li>
            <li>आप अन्य परिवार के सदस्यों का सम्मान करेंगे</li>
            <li>आप सही और सटीक जानकारी प्रदान करेंगे</li>
            <li>आप किसी अन्य व्यक्ति का रूप धारण नहीं करेंगे</li>
            <li>आप ऐप का दुरुपयोग नहीं करेंगे या सिस्टम को नुकसान पहुँचाने का प्रयास नहीं करेंगे</li>
          </ul>
          <p className="text-gray-600 mb-3">When using Aangan, you agree that:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>You will not post any harmful, abusive, or illegal content</li>
            <li>You will respect other family members</li>
            <li>You will provide accurate and truthful information</li>
            <li>You will not impersonate any other person</li>
            <li>You will not misuse the app or attempt to harm the system</li>
          </ul>
        </section>

        {/* Content Ownership */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            सामग्री स्वामित्व
          </h2>
          <p className="text-sm text-gray-500 mb-3">Content Ownership</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            आप अपनी पोस्ट की गई सभी सामग्री (फ़ोटो, टेक्स्ट, वॉइस मैसेज) के
            मालिक हैं। Aangan पर सामग्री पोस्ट करके, आप हमें अपनी सामग्री को ऐप
            के भीतर प्रदर्शित करने, संग्रहीत करने और वितरित करने का लाइसेंस देते
            हैं। यह लाइसेंस केवल Aangan सेवा के संचालन के लिए है।
          </p>
          <p className="text-gray-600 leading-relaxed">
            You own all content you post (photos, text, voice messages). By
            posting content on Aangan, you grant us a license to display, store,
            and distribute your content within the app. This license is solely
            for the operation of the Aangan service.
          </p>
        </section>

        {/* Account Termination */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            खाता समाप्ति
          </h2>
          <p className="text-sm text-gray-500 mb-3">Account Termination</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            Aangan किसी भी समय, बिना पूर्व सूचना के, इन शर्तों का उल्लंघन करने
            पर आपके खाते को निलंबित या समाप्त कर सकता है। इसमें हानिकारक सामग्री
            पोस्ट करना, अन्य उपयोगकर्ताओं को परेशान करना, या ऐप का दुरुपयोग
            करना शामिल है।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Aangan may suspend or terminate your account at any time, without
            prior notice, for violations of these terms. This includes posting
            harmful content, harassing other users, or misusing the app.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            दायित्व की सीमा
          </h2>
          <p className="text-sm text-gray-500 mb-3">Limitation of Liability</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            Aangan &quot;जैसा है&quot; के आधार पर प्रदान किया जाता है। हम ऐप की
            उपलब्धता, सटीकता या विश्वसनीयता की गारंटी नहीं देते। Aangan या इसके
            संस्थापक किसी भी प्रत्यक्ष, अप्रत्यक्ष, आकस्मिक, या परिणामी
            क्षति के लिए उत्तरदायी नहीं होंगे जो सेवा के उपयोग से उत्पन्न
            हो।
          </p>
          <p className="text-gray-600 leading-relaxed">
            Aangan is provided on an &quot;as is&quot; basis. We do not guarantee the
            availability, accuracy, or reliability of the app. Aangan and its
            founder shall not be liable for any direct, indirect, incidental, or
            consequential damages arising from use of the service.
          </p>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            शासी कानून
          </h2>
          <p className="text-sm text-gray-500 mb-3">Governing Law</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            ये शर्तें भारत के कानूनों द्वारा शासित होंगी। इन शर्तों से उत्पन्न
            होने वाले किसी भी विवाद को भारत के न्यायालयों में हल किया जाएगा।
          </p>
          <p className="text-gray-600 leading-relaxed">
            These terms shall be governed by the laws of India. Any disputes
            arising from these terms shall be resolved in the courts of India.
          </p>
        </section>

        {/* Changes to Terms */}
        <section>
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-3">
            शर्तों में बदलाव
          </h2>
          <p className="text-sm text-gray-500 mb-3">Changes to Terms</p>
          <p className="text-gray-800 mb-4 leading-relaxed">
            हम समय-समय पर इन शर्तों को अपडेट कर सकते हैं। बदलाव होने पर हम आपको
            ऐप के माध्यम से सूचित करेंगे। अपडेट के बाद ऐप का उपयोग जारी रखने
            का अर्थ है कि आप नई शर्तों से सहमत हैं।
          </p>
          <p className="text-gray-600 leading-relaxed">
            We may update these terms from time to time. We will notify you of
            changes through the app. Continued use of the app after updates
            means you agree to the new terms.
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
              <span className="font-semibold">कंपनी / Company:</span> ReyKan IT, India
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 pt-6 border-t border-[#C8A84B]/10">
          <p>&copy; 2026 ReyKan IT. All rights reserved.</p>
          <p className="mt-1">सर्वाधिकार सुरक्षित।</p>
        </footer>
      </div>
    </main>
  );
}
