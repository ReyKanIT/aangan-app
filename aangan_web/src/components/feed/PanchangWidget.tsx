'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI, type PanchangData } from '@/services/panchangService';
import { loadEvents, matchesToday, type TithiEvent, eventTypeLabel } from '@/services/tithiEventService';

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
  const [today, setToday] = useState<Date | null>(null);
  const [todayEvents, setTodayEvents] = useState<TithiEvent[]>([]);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    const data = getPanchang(now, DELHI);
    setPanchang(data);
    // Check tithi-event reminders for today
    try {
      const all = loadEvents();
      const matched = all.filter((e) => matchesToday(e));
      setTodayEvents(matched);
    } catch { /* localStorage unavailable on server */ }
  }, []);

  if (!panchang || !today) {
    return (
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-haldi-gold/20 px-5 py-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-cream rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-cream rounded w-3/4" />
            <div className="h-3 bg-cream rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

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
          <span className="text-brown-light text-base">{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Tithi highlight bar with end-time */}
        <div className="flex flex-wrap items-center gap-2 bg-cream rounded-xl px-4 py-2 mt-1">
          <span className="text-base text-brown-light font-heading">तिथि:</span>
          <span className="text-base font-semibold text-haldi-gold font-heading">{panchang.tithi}</span>
          <span className="text-xs text-brown-light/80">{panchang.tithiEndTime} तक</span>
          <span className="text-brown-light mx-1">&middot;</span>
          <span className="text-base text-brown-light font-heading">नक्षत्र:</span>
          <span className="text-base font-semibold text-haldi-gold font-heading">{panchang.nakshatra}</span>
          <span className="text-xs text-brown-light/80">{panchang.nakshatraEndTime} तक</span>
        </div>
      </button>

      {/* Expandable details grid */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-5 pb-5 pt-1 border-t border-haldi-gold/10">
          <p className="text-base text-brown-light mb-3 font-heading">आज का पंचांग &middot; Today&apos;s Panchang</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <PanchangRow label="तिथि / Tithi" value={panchang.tithi} subvalue={`${panchang.tithiEndTime} तक`} />
            <PanchangRow label="पक्ष / Paksha" value={panchang.paksha} />
            <PanchangRow label="नक्षत्र / Nakshatra" value={panchang.nakshatra} subvalue={`${panchang.nakshatraEndTime} तक`} />
            <PanchangRow label="करण / Karana" value={panchang.karana} subvalue={`${panchang.karanaEndTime} तक`} />
            <PanchangRow label="वार / Day" value={`${panchang.vara} (${WEEKDAYS_EN[today.getDay()]})`} />
            <PanchangRow label="सूर्योदय / Sunrise" value={`🌅 ${panchang.sunrise}`} />
            <PanchangRow label="सूर्यास्त / Sunset" value={`🌇 ${panchang.sunset}`} />
          </div>
          <div className="mt-4 pt-3 border-t border-haldi-gold/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-base text-brown-light font-heading">योग / Yoga</span>
              <span className="text-xs text-brown-light/70">{panchang.yogaEndTime} तक</span>
            </div>
            <span className={`text-base font-semibold ${yogaColor}`}>
              {panchang.yoga} ({yogaDesc})
            </span>
          </div>
          {/* Tithi event reminders for today */}
          {todayEvents.length > 0 && (
            <div className="mt-4 pt-3 border-t border-haldi-gold/10">
              <p className="text-sm font-heading text-haldi-gold mb-2">
                🎉 आज की तिथि घटनाएँ
              </p>
              {todayEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 bg-haldi-gold/5 rounded-lg px-3 py-2 mb-1"
                >
                  <span className="text-lg">
                    {e.type === 'birthday' ? '🎂' : e.type === 'shraddha' ? '🙏' : e.type === 'anniversary' ? '💍' : e.type === 'festival' ? '🎉' : '📌'}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-brown">{e.name}</span>
                    <span className="text-xs text-brown-light ml-2">({eventTypeLabel(e.type)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-brown-light/60">
              Location: Delhi, India &middot; Drik Ganita based calculation
            </p>
            <Link
              href="/tithi-reminders"
              className="text-xs text-haldi-gold hover:text-haldi-gold-dark font-semibold"
            >
              तिथि अनुस्मारक →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanchangRow({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) {
  return (
    <div className="flex flex-col bg-cream/50 rounded-lg px-3 py-2">
      <span className="text-xs text-brown-light">{label}</span>
      <span className="text-base text-brown font-semibold mt-0.5">{value}</span>
      {subvalue && <span className="text-xs text-brown-light/70 mt-0.5">{subvalue}</span>}
    </div>
  );
}
