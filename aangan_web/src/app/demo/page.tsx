'use client';
import PublicShareCTA from '@/components/ui/PublicShareCTA';

import { useState, useEffect } from 'react';

const SLIDES = [
  {
    bg: 'from-amber-50 to-orange-50',
    emoji: '🏠',
    title: 'Aangan आँगन',
    subtitle: 'Your Family\'s Digital Home',
    hindi: 'अपने परिवार का डिजिटल घर',
    desc: 'India\'s first Hindi-first family social network',
  },
  {
    bg: 'from-green-50 to-emerald-50',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Family Tree',
    subtitle: 'परिवार का पेड़',
    hindi: '3 स्तर — दादा-दादी से पोते-पोतियों तक',
    desc: '3-level hierarchy with 40+ Hindi relationship labels',
  },
  {
    bg: 'from-yellow-50 to-amber-50',
    emoji: '📅',
    title: 'Hindu Panchang',
    subtitle: 'पंचांग',
    hindi: 'तिथि, नक्षत्र, योग — बिना इंटरनेट भी',
    desc: 'Self-contained Vedic calendar — works offline!',
  },
  {
    bg: 'from-purple-50 to-pink-50',
    emoji: '🎤',
    title: 'Voice Control',
    subtitle: 'बोलकर चलाएं',
    hindi: 'हिंदी और अंग्रेज़ी में बोलकर लिखें',
    desc: 'Voice-to-text, voice commands, voice messages',
  },
  {
    bg: 'from-blue-50 to-cyan-50',
    emoji: '🎉',
    title: 'Events & RSVP',
    subtitle: 'कार्यक्रम',
    hindi: 'शादी, पूजा, जन्मदिन — RSVP के साथ',
    desc: 'Plan family events with photo sharing & check-in',
  },
  {
    bg: 'from-orange-50 to-red-50',
    emoji: '🛕',
    title: 'Kuldevi & Sutak',
    subtitle: 'कुलदेवी और सूतक',
    hindi: 'परिवार की परंपराएं सुरक्षित रखें',
    desc: 'Preserve family traditions, temple info & rituals',
  },
  {
    bg: 'from-amber-50 to-yellow-50',
    emoji: '👵',
    title: 'Dadi Test Passed!',
    subtitle: 'दादी टेस्ट पास ✔️',
    hindi: 'बड़े बटन, बड़े अक्षर — दादी भी चला सकती हैं!',
    desc: '52px+ buttons, 16px+ text, Hindi-first design',
  },
  {
    bg: 'from-green-50 to-amber-50',
    emoji: '📱',
    title: 'Download Now!',
    subtitle: 'अभी डाउनलोड करें',
    hindi: 'aangan.app पर जाएं',
    desc: 'Free for Android — aangan.app',
  },
];

export default function DemoPage() {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const slide = SLIDES[current];

  return (
    <main
      className={`min-h-screen bg-gradient-to-br ${slide.bg} flex flex-col items-center justify-center px-6 transition-all duration-1000`}
      onClick={() => {
        setCurrent((prev) => (prev + 1) % SLIDES.length);
        setIsPlaying(false);
      }}
    >
      {/* Progress dots */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); setIsPlaying(false); }}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-amber-600 scale-125' : 'bg-amber-300'
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div
        key={current}
        className="text-center max-w-lg animate-fade-in"
      >
        <div className="text-8xl mb-6 animate-bounce-slow">{slide.emoji}</div>

        <h1
          className="text-4xl md:text-5xl font-bold mb-2 tracking-tight"
          style={{ color: '#C8A84B', fontFamily: 'Georgia, serif' }}
        >
          {slide.title}
        </h1>

        <p
          className="text-2xl md:text-3xl font-semibold mb-4"
          style={{ color: '#4A2C2A', fontFamily: 'Georgia, serif' }}
        >
          {slide.subtitle}
        </p>

        <p className="text-lg text-amber-900/70 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          {slide.hindi}
        </p>

        <p className="text-base text-amber-800/50">
          {slide.desc}
        </p>
      </div>

      {/* Play/Pause */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white/80 border border-amber-200 flex items-center justify-center text-amber-700 hover:bg-white transition-colors"
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Brand watermark */}
      <div className="fixed bottom-6 left-6 text-sm text-amber-600/50" style={{ fontFamily: 'Georgia, serif' }}>
        aangan.app
      </div>

      <PublicShareCTA
        titleHi={'यह demo किसी को दिखाएं'}
        titleEn="Share this Aangan demo with family"
        shareMessage={'Aangan — भारतीय परिवारों के लिए social network. Hindi voice, family tree, panchang सब एक जगह। देखें:'}
        loginLabel={'Aangan शुरू करें — Sign up'}
      />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
