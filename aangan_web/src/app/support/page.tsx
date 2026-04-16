import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support | Aangan आँगन',
  description: 'Aangan support — हमसे संपर्क करें, सुझाव भेजें, या समस्या रिपोर्ट करें।',
  alternates: { canonical: 'https://aangan.app/support' },
  openGraph: {
    title: 'Aangan Support — सहायता',
    description: 'Get help with Aangan. Send feedback, report bugs, or reach our team.',
    url: 'https://aangan.app/support',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan — सहायता केंद्र' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aangan Support — सहायता',
    description: 'Get help with Aangan — send feedback, report bugs, reach our team.',
    images: ['/og-image.png'],
  },
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#FDFAF0]">
      {/* Header */}
      <header className="bg-[#C8A84B] text-white py-10 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2">सहायता केंद्र</h1>
        <p className="text-lg opacity-90">Aangan Support</p>
        <p className="mt-3 text-base opacity-85 max-w-xl mx-auto">
          हम आपकी मदद के लिए हाज़िर हैं — We&rsquo;re here to help.
        </p>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Primary contact */}
        <section className="bg-white rounded-2xl border border-[#C8A84B]/20 p-6">
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-2">📧 ईमेल से संपर्क करें</h2>
          <p className="text-base text-gray-600 mb-4">Email us</p>
          <a
            href="mailto:support@aangan.app"
            className="inline-flex items-center gap-2 bg-[#C8A84B] text-white font-semibold text-base px-5 py-3 rounded-xl hover:bg-[#a88a3a] transition-colors min-h-[52px]"
          >
            support@aangan.app
          </a>
          <p className="mt-4 text-base text-gray-700 leading-relaxed">
            हम आमतौर पर 24 घंटे के भीतर जवाब देते हैं।
          </p>
          <p className="text-base text-gray-500 leading-relaxed">
            We typically respond within 24 hours.
          </p>
        </section>

        {/* In-app feedback */}
        <section className="bg-white rounded-2xl border border-[#C8A84B]/20 p-6">
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-2">💬 ऐप के अंदर से सुझाव दें</h2>
          <p className="text-base text-gray-600 mb-4">Feedback directly from the app</p>
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            ऐप में लॉगिन करने के बाद, नीचे दाएँ कोने में <strong>💬 सुझाव दें</strong> बटन दबाएँ।
            चार श्रेणियाँ हैं:
          </p>
          <ul className="space-y-2 text-base text-gray-700 mb-4">
            <li>💡 <strong>सुझाव</strong> — Feature request</li>
            <li>🐛 <strong>समस्या</strong> — Bug report</li>
            <li>😟 <strong>शिकायत</strong> — Complaint</li>
            <li>💬 <strong>सामान्य</strong> — General feedback</li>
          </ul>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-[#C8A84B] font-semibold text-base hover:underline min-h-[52px]"
          >
            ऐप खोलें → Open Aangan
          </Link>
        </section>

        {/* Common questions */}
        <section className="bg-white rounded-2xl border border-[#C8A84B]/20 p-6">
          <h2 className="text-2xl font-bold text-[#C8A84B] mb-4">आम सवाल — FAQ</h2>
          <div className="space-y-5">
            <FaqItem
              q="OTP नहीं आ रहा है"
              qEn="My OTP isn't arriving"
              a="कृपया जाँच करें कि आपका फ़ोन नंबर सही है और नेटवर्क उपलब्ध है। 60 सेकंड बाद &lsquo;दोबारा भेजें&rsquo; दबाएँ। अगर फिर भी समस्या हो, support@aangan.app पर ईमेल करें।"
              aEn="Check your phone number and network. Tap &lsquo;Resend&rsquo; after 60 seconds. If it still fails, email support@aangan.app."
            />
            <FaqItem
              q="परिवार में सदस्य कैसे जोड़ें?"
              qEn="How do I add family members?"
              a="Family टैब खोलें → ऊपर दाएँ &lsquo;+&rsquo; बटन दबाएँ → नाम से खोजें → रिश्ता चुनें → जोड़ें।"
              aEn="Open Family tab → tap &lsquo;+&rsquo; top right → search by name → choose relationship → add."
            />
            <FaqItem
              q="मेरा डेटा सुरक्षित है?"
              qEn="Is my data safe?"
              a="हाँ। हम Supabase पर encrypted-at-rest data रखते हैं, केवल आप और आपके परिवार के जुड़े सदस्य आपकी पोस्ट देख सकते हैं।"
              aEn="Yes. Data is encrypted at rest on Supabase. Only you and connected family members see your posts."
            />
            <FaqItem
              q="खाता कैसे हटाएँ?"
              qEn="How to delete my account?"
              a="Settings → खाता हटाएँ। या support@aangan.app पर ईमेल करें — 7 दिन में डेटा मिटा दिया जाएगा।"
              aEn="Settings → Delete Account. Or email support@aangan.app — we delete within 7 days."
            />
          </div>
        </section>

        {/* Links */}
        <section className="flex flex-wrap gap-3 justify-center pt-4">
          <Link href="/privacy" className="text-[#C8A84B] font-semibold text-base hover:underline">
            गोपनीयता नीति — Privacy
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/terms" className="text-[#C8A84B] font-semibold text-base hover:underline">
            नियम व शर्तें — Terms
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/" className="text-[#C8A84B] font-semibold text-base hover:underline">
            मुख्य पृष्ठ — Home
          </Link>
        </section>

        <footer className="text-center text-sm text-gray-500 pt-8">
          Aangan आँगन &middot; aangan.app
        </footer>
      </div>
    </main>
  );
}

function FaqItem({
  q,
  qEn,
  a,
  aEn,
}: {
  q: string;
  qEn: string;
  a: string;
  aEn: string;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none min-h-[52px] py-2">
        <div className="flex items-start gap-2">
          <span className="text-[#C8A84B] font-bold text-lg leading-none mt-1 group-open:rotate-90 transition-transform">▶</span>
          <div className="flex-1">
            <p className="font-semibold text-base text-gray-900">{q}</p>
            <p className="text-sm text-gray-500">{qEn}</p>
          </div>
        </div>
      </summary>
      <div className="pl-6 pt-2 space-y-2">
        <p className="text-base text-gray-700 leading-relaxed">{a}</p>
        <p className="text-base text-gray-500 leading-relaxed">{aEn}</p>
      </div>
    </details>
  );
}
