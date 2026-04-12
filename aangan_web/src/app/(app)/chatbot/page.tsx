'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import GoldButton from '@/components/ui/GoldButton';
import VoiceButton from '@/components/ui/VoiceButton';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

/* ─── Quick Reply Suggestions ────────────────────────────────── */
const QUICK_REPLIES = [
  { emoji: '🪔', text: 'आज का पंचांग बताओ', english: "Today's Panchang" },
  { emoji: '📅', text: 'अगला त्योहार कौन सा है?', english: 'Next festival?' },
  { emoji: '🛕', text: 'कुलदेवी के बारे में बताओ', english: 'About Kuldevi' },
  { emoji: '👨‍👩‍👧‍👦', text: 'परिवार का पेड़ कैसे बनाएं?', english: 'How to build family tree?' },
];

/* ─── Local Knowledge Base (no API needed) ───────────────────── */
function getBotResponse(input: string): string {
  const q = input.toLowerCase();

  // Panchang
  if (q.includes('पंचांग') || q.includes('panchang') || q.includes('tithi') || q.includes('तिथि')) {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
    const dateStr = today.toLocaleDateString('hi-IN', options);
    return `🪔 आज ${dateStr} है।\n\nविस्तृत पंचांग देखने के लिए "पंचांग" पेज पर जाएं — वहाँ तिथि, नक्षत्र, योग, करण सब मिलेगा!\n\n📱 मेनू में "पंचांग" पर टैप करें।`;
  }

  // Festivals
  if (q.includes('त्योहार') || q.includes('festival') || q.includes('tyohar') || q.includes('दिवाली') || q.includes('होली') || q.includes('नवरात्रि')) {
    return '📅 आगामी प्रमुख त्योहार:\n\n🪔 अक्षय तृतीया — मई 2026\n🙏 गुरु पूर्णिमा — जुलाई 2026\n🎋 रक्षाबंधन — अगस्त 2026\n🪔 दिवाली — अक्टूबर 2026\n\nसभी त्योहारों की लिस्ट "Festivals" पेज पर देखें!';
  }

  // Kuldevi
  if (q.includes('कुलदेवी') || q.includes('kuldevi') || q.includes('kuldevta') || q.includes('कुलदेवता')) {
    return '🛕 कुलदेवी/कुलदेवता आपके परिवार की आराध्य देवी/देवता हैं।\n\n✏️ अपनी कुलदेवी की जानकारी "कुलदेवी" पेज पर भर सकते हैं — नाम, मंदिर का स्थान, पूजा पद्धति, और नियम।\n\nमेनू में "कुलदेवी" पर जाएं!';
  }

  // Family tree
  if (q.includes('परिवार') || q.includes('family') || q.includes('पेड़') || q.includes('tree') || q.includes('रिश्ता') || q.includes('relation')) {
    return '👨‍👩‍👧‍👦 परिवार का पेड़ बनाने के लिए:\n\n1️⃣ "परिवार" पेज पर जाएं\n2️⃣ "सदस्य जोड़ें" बटन दबाएं\n3️⃣ फ़ोन नंबर या नाम से खोजें\n4️⃣ रिश्ता चुनें (जैसे: पिता, माँ, भाई)\n5️⃣ Level चुनें (1 = सगे, 2 = करीबी, 3 = बड़ा परिवार)\n\nजोड़ने पर सामने वाले को invite भेजा जाएगा! 🎉';
  }

  // Events
  if (q.includes('इवेंट') || q.includes('event') || q.includes('शादी') || q.includes('wedding') || q.includes('पूजा') || q.includes('जन्मदिन') || q.includes('birthday')) {
    return '📅 इवेंट बनाने के लिए:\n\n1️⃣ "उत्सव" पेज पर जाएं\n2️⃣ "नया इवेंट" बटन दबाएं\n3️⃣ शादी, जन्मदिन, पूजा — कोई भी चुनें\n4️⃣ तारीख, समय, और जगह भरें\n5️⃣ परिवार के सदस्यों को RSVP भेजें\n\nसब एक जगह! 🎊';
  }

  // Photos / Posts
  if (q.includes('फ़ोटो') || q.includes('photo') || q.includes('पोस्ट') || q.includes('post') || q.includes('शेयर')) {
    return '📸 फ़ोटो शेयर करने के लिए:\n\n1️⃣ "घर" (Home) पेज पर जाएं\n2️⃣ "कुछ साझा करें" बटन दबाएं\n3️⃣ 📷 बटन से फ़ोटो चुनें (20 तक)\n4️⃣ कैप्शन लिखें\n5️⃣ Audience चुनें (सभी परिवार या Level)\n6️⃣ "पोस्ट करें" दबाएं!\n\nफ़ोटो Cloudflare CDN पर safe रहती हैं 🔒';
  }

  // Voice
  if (q.includes('आवाज़') || q.includes('voice') || q.includes('बोलो') || q.includes('माइक')) {
    return '🎤 Voice Control कैसे इस्तेमाल करें:\n\n1️⃣ 🎙️ माइक बटन दबाएं\n2️⃣ हिंदी में बोलें\n3️⃣ Text अपने आप type हो जाएगा!\n\nPost बनाते समय, Comment करते समय, और Chat में — सब जगह माइक बटन है।\n\n💡 Tip: शांत जगह पर बोलें, बेहतर सुनाई देगा!';
  }

  // Help
  if (q.includes('help') || q.includes('मदद') || q.includes('कैसे') || q.includes('how')) {
    return '🙏 मैं आपकी ये मदद कर सकता हूँ:\n\n🪔 पंचांग — आज की तिथि, नक्षत्र\n📅 त्योहार — आगामी त्योहारों की जानकारी\n🛕 कुलदेवी — कुलदेवी/कुलदेवता की जानकारी\n👨‍👩‍👧‍👦 परिवार — Family tree कैसे बनाएं\n📸 पोस्ट — फ़ोटो और बातें कैसे शेयर करें\n📅 इवेंट — शादी/पूजा का इवेंट बनाएं\n\nकोई भी सवाल पूछें! 😊';
  }

  // Greeting
  if (q.includes('नमस्ते') || q.includes('hello') || q.includes('hi') || q.includes('हाय') || q.includes('राम राम')) {
    return '🙏 नमस्ते! मैं आँगन बॉट हूँ — आपका परिवार सहायक!\n\nमुझसे पूछें:\n• आज का पंचांग\n• अगला त्योहार\n• परिवार का पेड़ कैसे बनाएं\n• फ़ोटो कैसे शेयर करें\n\nया नीचे दिए बटन दबाएं! 👇';
  }

  // Default
  return '🤔 मैं अभी सीख रहा हूँ! इन विषयों पर मदद कर सकता हूँ:\n\n🪔 पंचांग\n📅 त्योहार\n🛕 कुलदेवी\n👨‍👩‍👧‍👦 परिवार\n📸 पोस्ट & फ़ोटो\n📅 इवेंट\n\nइनमें से कोई विषय पूछें या नीचे दिए बटन दबाएं! 👇';
}

/* ─── Chatbot Page ───────────────────────────────────────────── */
export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: '🙏 नमस्ते! मैं आँगन बॉट हूँ — आपका परिवार सहायक!\n\nमुझसे कुछ भी पूछें — पंचांग, त्योहार, कुलदेवी, या परिवार के बारे में।\n\nनीचे दिए बटन दबाकर शुरू करें! 👇',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getBotResponse(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-dark bg-white">
          <div className="w-10 h-10 rounded-full bg-haldi-gold flex items-center justify-center text-white text-lg">
            🤖
          </div>
          <div>
            <h1 className="font-heading text-lg text-brown font-bold">आँगन बॉट</h1>
            <p className="font-body text-base text-mehndi-green">
              {isTyping ? 'टाइप कर रहा है...' : 'ऑनलाइन — Online'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-cream/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-haldi-gold text-white rounded-br-md'
                    : 'bg-white text-brown border border-cream-dark rounded-bl-md shadow-sm'
                }`}
              >
                <p className="font-body text-base whitespace-pre-line">{msg.text}</p>
                <p className={`font-body text-sm mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-brown-light'}`}>
                  {msg.timestamp.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-brown border border-cream-dark rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-brown-light rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-brown-light rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-brown-light rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-white border-t border-cream-dark">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr.text}
                  onClick={() => sendMessage(qr.text)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-haldi-gold/30 bg-cream hover:bg-haldi-gold/10 transition-colors min-h-dadi"
                >
                  <span className="text-lg">{qr.emoji}</span>
                  <span className="font-body text-base text-brown whitespace-nowrap">{qr.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-cream-dark bg-white">
          <VoiceButton
            onResult={(text) => sendMessage(text)}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px]"
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="कुछ पूछें... Ask anything..."
            className="flex-1 font-body text-base text-brown placeholder-gray-400 bg-cream-dark rounded-full px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-haldi-gold/30"
          />
          <GoldButton type="submit" size="sm" disabled={!input.trim() || isTyping}>
            भेजें
          </GoldButton>
        </form>
      </div>
  );
}
