'use client';

import { useState, useEffect } from 'react';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI, type PanchangData } from '@/services/panchangService';

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatEnglishDate(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_EN[date.getMonth()];
  const year = date.getFullYear();
  const weekday = WEEKDAYS_EN[date.getDay()];
  return `${weekday}, ${day} ${month} ${year}`;
}

export default function PanchangWidget() {
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [today] = useState(new Date());

  useEffect(() => {
    const data = getPanchang(new Date(), DELHI);
    setPanchang(data);
  }, []);

  if (!panchang) return null;

  const yogaDesc = yogaDescription(panchang.yoga);
  const yogaColor =
    yogaDesc === 'शुभ' ? 'text-mehndi-green' :
    yogaDesc === 'अशुभ' ? 'text-red-500' :
    'text-brown-light';

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-haldi-gold/20">
      {/* Header with English date + Hindi date */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 hover:bg-cream/50 transition-colors"
      >
        {/* English Date - prominent */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{moonPhaseEmoji(panchang.moonPhasePercent)}</span>
            <div className="text-left">
              <p className="text-lg font-semibold text-brown">
                {formatEnglishDate(today)}
              </p>
              <p className="text-sm text-haldi-gold font-heading">
                विक्रम संवत {panchang.vikramSamvat} &middot; {panchang.maas} &middot; {panchang.paksha}
              </p>
            </div>
          </div>
          <span className="text-brown-light text-sm">{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Tithi highlight bar */}
        <div className="flex items-center gap-2 bg-cream rounded-xl px-4 py-2 mt-1">
          <span className="text-sm text-brown-light font-heading">तिथि:</span>
          <span className="text-base font-semibold text-haldi-gold font-heading">{panchang.tithi}</span>
          <span className="text-brown-light mx-1">&middot;</span>
          <span className="text-sm text-brown-light font-heading">नक्षत्र:</span>
          <span className="text-base font-semibold text-haldi-gold font-heading">{panchang.nakshatra}</span>
        </div>
      </button>

      {/* Expandable details grid */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-5 pb-5 pt-1 border-t border-haldi-gold/10">
          <p className="text-sm text-brown-light mb-3 font-heading">आज का पंचांग &middot; Today&apos;s Panchang</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <PanchangRow label="तिथि / Tithi" value={panchang.tithi} />
            <PanchangRow label="पक्ष / Paksha" value={panchang.paksha} />
            <PanchangRow label="नक्षत्र / Nakshatra" value={panchang.nakshatra} />
            <PanchangRow label="वार / Day" value={`${panchang.vara} (${WEEKDAYS_EN[today.getDay()]})`} />
            <PanchangRow label="सूर्योदय / Sunrise" value={`🌅 ${panchang.sunrise}`} />
            <PanchangRow label="सूर्यास्त / Sunset" value={`🌇 ${panchang.sunset}`} />
          </div>
          <div className="mt-4 pt-3 border-t border-haldi-gold/10 flex items-center justify-between">
            <span className="text-sm text-brown-light font-heading">योग / Yoga</span>
            <span className={`text-sm font-semibold ${yogaColor}`}>
              {panchang.yoga} ({yogaDesc})
            </span>
          </div>
          <p className="text-[10px] text-brown-light/50 mt-3 text-right">
            Location: Delhi, India &middot; Drik Ganita based calculation
          </p>
        </div>
      </div>
    </div>
  );
}

function PanchangRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col bg-cream/50 rounded-lg px-3 py-2">
      <span className="text-[11px] text-brown-light">{label}</span>
      <span className="text-sm text-brown font-semibold mt-0.5">{value}</span>
    </div>
  );
}
