-- ============================================================================
-- RECURRING PANCHANG EVENTS — Ekadashi, Purnima, Amavasya, Pradosh, etc.
-- ============================================================================
-- Covers May 2026 → Apr 2027. Cross-referenced from Drik Panchang, Vakya
-- Panchang, and Vishvavijaya Panchang. Dates may shift ±1 day by region /
-- panchang tradition — lunar dates are approximate. Existing seeded events
-- (Nirjala, Devshayani, Guru Purnima, Raksha Bandhan, Diwali, etc.) are NOT
-- duplicated here.
-- Created: 2026-04-27
-- ============================================================================

INSERT INTO public.system_festivals
    (name_en, name_hi, date, region, importance, icon,
     notify_days_before, description_en, description_hi)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- EKADASHI — 11th tithi of each paksha (2× monthly = 22 per year added here;
-- Nirjala & Devshayani already in DB)
-- Premier fasting day; Vishnu is especially pleased on Ekadashi.
-- ═══════════════════════════════════════════════════════════════════════════

('Mohini Ekadashi',           'मोहिनी एकादशी',            '2026-05-08', 'all-india', 'medium', '🌙', 3,
 'Vaishakha Shukla Ekadashi — grants beauty and removes sins',
 'वैशाख शुक्ल एकादशी — पाप नाशक, मोक्षदायी'),

('Apara Ekadashi',            'अपरा एकादशी',              '2026-05-23', 'all-india', 'medium', '🌙', 3,
 'Jyeshtha Krishna Ekadashi — removes sins committed unknowingly',
 'ज्येष्ठ कृष्ण एकादशी — अपार पापों का नाश'),

('Yogini Ekadashi',           'योगिनी एकादशी',            '2026-06-22', 'all-india', 'medium', '🌙', 3,
 'Ashadha Krishna Ekadashi — cures diseases, grants liberation',
 'आषाढ़ कृष्ण एकादशी — रोगनाशक, मुक्तिदायी'),

('Kamika Ekadashi',           'कामिका एकादशी',            '2026-07-22', 'all-india', 'medium', '🌙', 3,
 'Shravana Krishna Ekadashi — Tulsi worship pleases Vishnu',
 'श्रावण कृष्ण एकादशी — तुलसी पूजन, विष्णुप्रिय'),

('Shravana Putrada Ekadashi', 'श्रावण पुत्रदा एकादशी',    '2026-08-06', 'all-india', 'medium', '🌙', 3,
 'Shravana Shukla Ekadashi — grants good progeny',
 'श्रावण शुक्ल एकादशी — पुत्र प्राप्ति का वरदान'),

('Aja Ekadashi',              'अजा एकादशी',               '2026-08-21', 'all-india', 'medium', '🌙', 3,
 'Bhadrapada Krishna Ekadashi — destroys sins of many lifetimes',
 'भाद्रपद कृष्ण एकादशी — महापाप नाशक'),

('Parivartini Ekadashi',      'परिवर्तिनी एकादशी',        '2026-09-04', 'all-india', 'medium', '🌙', 3,
 'Bhadrapada Shukla — Vishnu changes sides during cosmic sleep',
 'भाद्रपद शुक्ल एकादशी — विष्णु करवट बदलते हैं'),

('Indira Ekadashi',           'इंदिरा एकादशी',            '2026-09-19', 'all-india', 'medium', '🌙', 3,
 'Ashwin Krishna Ekadashi — falls during Pitru Paksha; frees ancestors',
 'आश्विन कृष्ण एकादशी — पितृ पक्ष में पितरों का उद्धार'),

('Papankusha Ekadashi',       'पापांकुशा एकादशी',         '2026-10-04', 'all-india', 'medium', '🌙', 3,
 'Ashwin Shukla Ekadashi — destroys accumulated sins',
 'आश्विन शुक्ल एकादशी — पापों का अंकुश'),

('Rama Ekadashi',             'रमा एकादशी',               '2026-10-19', 'all-india', 'medium', '🌙', 3,
 'Kartik Krishna Ekadashi — grants prosperity and removes sins',
 'कार्तिक कृष्ण एकादशी — धन-समृद्धि एवं पाप नाश'),

('Devutthana Ekadashi',       'देवउठनी एकादशी',           '2026-11-01', 'all-india', 'major',  '🌙', 7,
 'Kartik Shukla — Vishnu wakes from 4-month cosmic sleep; Tulsi Vivah',
 'कार्तिक शुक्ल एकादशी — चातुर्मास समाप्ति — तुलसी विवाह'),

('Utpanna Ekadashi',          'उत्पन्ना एकादशी',          '2026-11-17', 'all-india', 'medium', '🌙', 3,
 'Margashirsha Krishna — day Ekadashi Devi took birth to destroy sins',
 'मार्गशीर्ष कृष्ण एकादशी — एकादशी माता का जन्म'),

('Mokshada Ekadashi',         'मोक्षदा एकादशी',           '2026-12-01', 'all-india', 'medium', '🌙', 3,
 'Margashirsha Shukla — grants liberation; coincides with Gita Jayanti',
 'मार्गशीर्ष शुक्ल एकादशी — मोक्षदायी — गीता जयंती'),

('Saphala Ekadashi',          'सफला एकादशी',              '2026-12-17', 'all-india', 'medium', '🌙', 3,
 'Pausha Krishna Ekadashi — grants success in all endeavours',
 'पौष कृष्ण एकादशी — सर्वकार्य सिद्धि'),

('Putrada Ekadashi',          'पुत्रदा एकादशी',           '2026-12-31', 'all-india', 'medium', '🌙', 3,
 'Pausha Shukla Ekadashi — grants good children; Vaikunta Ekadashi in South India',
 'पौष शुक्ल एकादशी — पुत्र प्राप्ति — वैकुंठ एकादशी'),

('Shattila Ekadashi',         'षट्तिला एकादशी',           '2027-01-15', 'all-india', 'medium', '🌙', 3,
 'Magha Krishna — six uses of til (sesame) remove sins',
 'माघ कृष्ण एकादशी — तिल का दान, स्नान, भोजन'),

('Jaya Ekadashi',             'जया एकादशी',               '2027-01-30', 'all-india', 'medium', '🌙', 3,
 'Magha Shukla Ekadashi — removes ghosts and evil spirits',
 'माघ शुक्ल एकादशी — भूत-पिशाच बाधा नाश'),

('Vijaya Ekadashi',           'विजया एकादशी',             '2027-02-14', 'all-india', 'medium', '🌙', 3,
 'Phalguna Krishna Ekadashi — grants victory over enemies',
 'फाल्गुन कृष्ण एकादशी — शत्रु विजय, विजयदायिनी'),

('Amalaki Ekadashi',          'आमलकी एकादशी',             '2027-03-01', 'all-india', 'medium', '🌙', 3,
 'Phalguna Shukla — worship of amla tree; Vishnu resides in amla on this day',
 'फाल्गुन शुक्ल एकादशी — आंवला पूजन — विष्णु का निवास'),

('Papamochani Ekadashi',      'पापमोचनी एकादशी',          '2027-03-15', 'all-india', 'medium', '🌙', 3,
 'Chaitra Krishna Ekadashi — frees from all sins',
 'चैत्र कृष्ण एकादशी — सर्व पाप मोचन'),

('Kamada Ekadashi',           'कामदा एकादशी',             '2027-03-29', 'all-india', 'medium', '🌙', 3,
 'Chaitra Shukla Ekadashi — fulfils all desires',
 'चैत्र शुक्ल एकादशी — मनोकामना पूर्ण'),

('Varuthini Ekadashi',        'वरूथिनी एकादशी',           '2027-04-13', 'all-india', 'medium', '🌙', 3,
 'Vaishakha Krishna Ekadashi — removes sins of countless lives',
 'वैशाख कृष्ण एकादशी — जन्म-जन्मांतर के पाप नाश'),

-- ═══════════════════════════════════════════════════════════════════════════
-- PURNIMA — Full moon (12 per year; Buddha Purnima & Guru Purnima already seeded)
-- Auspicious for worship, pilgrimage, charity, and ancestor rituals.
-- ═══════════════════════════════════════════════════════════════════════════

('Jyeshtha Purnima',          'ज्येष्ठ पूर्णिमा',         '2026-06-11', 'all-india', 'medium', '🌕', 2,
 'Full moon of Jyeshtha — Vat Savitri Purnima for some traditions',
 'ज्येष्ठ मास की पूर्णिमा'),

('Ashadha Purnima',           'आषाढ़ पूर्णिमा',            '2026-07-10', 'all-india', 'medium', '🌕', 2,
 'Full moon of Ashadha — also observed as Guru Purnima',
 'आषाढ़ मास की पूर्णिमा — गुरु पूजा'),

('Bhadrapada Purnima',        'भाद्रपद पूर्णिमा',          '2026-09-07', 'all-india', 'medium', '🌕', 2,
 'Full moon of Bhadrapada — Anant Chaturdashi follows next day',
 'भाद्रपद मास की पूर्णिमा'),

('Sharad Purnima',            'शरद पूर्णिमा',              '2026-10-06', 'all-india', 'major',  '🌕', 5,
 'Ashwin Purnima — brightest full moon; kheer kept under moonlight for healing',
 'शरद पूर्णिमा — चंद्रमा सोलह कलाओं से पूर्ण — खीर का रस'),

('Kartik Purnima / Dev Deepawali', 'कार्तिक पूर्णिमा — देव दीपावली', '2026-11-05',
 'all-india', 'major', '🪔', 7,
 'Gods celebrate Diwali — massive lamp festival at Varanasi ghats; Sikh Gurpurab',
 'देव दीपावली — काशी में लाखों दीप — गुरु नानक जयंती'),

('Margashirsha Purnima',      'मार्गशीर्ष पूर्णिमा',       '2026-12-04', 'all-india', 'medium', '🌕', 2,
 'Full moon of Margashirsha — Dattatreya Jayanti',
 'मार्गशीर्ष मास की पूर्णिमा — दत्तात्रेय जयंती'),

('Pausha Purnima',            'पौष पूर्णिमा',              '2027-01-03', 'all-india', 'medium', '🌕', 2,
 'Full moon of Pausha — Kalpvas begins at Prayagraj; cold-month holy bath',
 'पौष पूर्णिमा — प्रयागराज में कल्पवास आरंभ'),

('Magha Purnima',             'माघ पूर्णिमा',              '2027-02-01', 'all-india', 'medium', '🌕', 3,
 'Most sacred bath of Magha month at Prayagraj sangam; ends Kalpvas',
 'माघी पूर्णिमा — संगम स्नान, कल्पवास समाप्ति'),

('Phalguna Purnima',          'फाल्गुन पूर्णिमा',          '2027-03-03', 'all-india', 'medium', '🌕', 2,
 'Holi Purnima — Holika Dahan performed at night; Holi next morning',
 'फाल्गुन पूर्णिमा — होलिका दहन की रात'),

('Chaitra Purnima',           'चैत्र पूर्णिमा',            '2027-04-01', 'all-india', 'medium', '🌕', 2,
 'Full moon of Chaitra — Hanuman Jayanti in many traditions; Sita Navami fortnight',
 'चैत्र मास की पूर्णिमा — हनुमान जयंती (कुछ परंपराओं में)'),

-- ═══════════════════════════════════════════════════════════════════════════
-- AMAVASYA — New moon (12 per year; Sarva Pitru & Diwali already seeded)
-- Ancestor rituals (tarpan, shraddha), Shiva worship, charity.
-- ═══════════════════════════════════════════════════════════════════════════

('Vaishakha Amavasya',        'वैशाख अमावस्या',           '2026-05-27', 'all-india', 'medium', '🌑', 2,
 'New moon — tarpan and charity for ancestors',
 'वैशाख अमावस्या — पितृ तर्पण'),

('Jyeshtha Amavasya / Shani Amavasya', 'ज्येष्ठ अमावस्या — शनि अमावस्या', '2026-06-25',
 'all-india', 'medium', '🌑', 3,
 'New moon of Jyeshtha — Shani Amavasya if Saturday; Shani worship',
 'ज्येष्ठ अमावस्या — शनि देव की विशेष पूजा'),

('Ashadha Amavasya',          'आषाढ़ अमावस्या',             '2026-07-24', 'all-india', 'medium', '🌑', 2,
 'New moon of Ashadha — Dakshinayana (sun starts southward journey)',
 'आषाढ़ अमावस्या — दक्षिणायन में पितृ तर्पण'),

('Shravana Amavasya',         'श्रावण अमावस्या',            '2026-08-23', 'all-india', 'medium', '🌑', 2,
 'New moon in holy Shravana — Shiva worship and ancestor rites',
 'श्रावण अमावस्या — शिव पूजन एवं पितृ तर्पण'),

('Bhadrapada Amavasya',       'भाद्रपद अमावस्या',           '2026-09-21', 'all-india', 'medium', '🌑', 2,
 'New moon — Pitru Paksha nears end; ancestor worship',
 'भाद्रपद अमावस्या — पितृ श्राद्ध'),

('Ashwin Amavasya',           'आश्विन अमावस्या',            '2026-10-21', 'all-india', 'medium', '🌑', 2,
 'New moon of Ashwin — ancestor rites; Diwali preparation',
 'आश्विन अमावस्या — पितृ तर्पण'),

('Margashirsha Amavasya',     'मार्गशीर्ष अमावस्या',        '2026-11-19', 'all-india', 'medium', '🌑', 2,
 'New moon of Margashirsha',
 'मार्गशीर्ष अमावस्या — पितृ श्राद्ध'),

('Pausha Amavasya',           'पौष अमावस्या',              '2026-12-19', 'all-india', 'medium', '🌑', 2,
 'New moon of Pausha — cold-month ancestor rites',
 'पौष अमावस्या — शीतकाल में पितृ तर्पण'),

('Mauni Amavasya',            'मौनी अमावस्या',             '2027-01-18', 'all-india', 'major',  '🌑', 5,
 'Magha Amavasya — sacred vow of silence; major holy bath at Prayagraj (Kumbh / Ardha Kumbh)',
 'माघ अमावस्या — मौन व्रत — संगम में महास्नान'),

('Phalguna Amavasya',         'फाल्गुन अमावस्या',           '2027-02-17', 'all-india', 'medium', '🌑', 2,
 'New moon of Phalguna',
 'फाल्गुन अमावस्या — पितृ तर्पण'),

('Chaitra Amavasya',          'चैत्र अमावस्या',            '2027-03-19', 'all-india', 'medium', '🌑', 2,
 'New moon of Chaitra — Hindu new year Chaitra Navratri follows next day',
 'चैत्र अमावस्या — नवरात्रि से एक दिन पूर्व'),

-- ═══════════════════════════════════════════════════════════════════════════
-- PRADOSH VRAT — 13th tithi (Trayodashi) of each paksha (2× monthly)
-- Shiva worship at dusk. Soma Pradosh (Monday) & Shani Pradosh (Saturday)
-- are especially sacred.
-- ═══════════════════════════════════════════════════════════════════════════

('Pradosh Vrat',     'प्रदोष व्रत',   '2026-05-05', 'all-india', 'medium', '🕉️', 1, 'Vaishakha Krishna Pradosh — Shiva puja at dusk', 'शिव पूजा — प्रदोष काल'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-05-21', 'all-india', 'medium', '🕉️', 1, 'Vaishakha Shukla Pradosh', 'शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-06-04', 'all-india', 'medium', '🕉️', 1, 'Jyeshtha Krishna Pradosh', 'ज्येष्ठ कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-06-20', 'all-india', 'medium', '🕉️', 1, 'Jyeshtha Shukla Pradosh', 'ज्येष्ठ शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-07-03', 'all-india', 'medium', '🕉️', 1, 'Ashadha Krishna Pradosh', 'आषाढ़ कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-07-19', 'all-india', 'medium', '🕉️', 1, 'Ashadha Shukla Pradosh', 'आषाढ़ शुक्ल प्रदोष'),
('Pradosh Vrat',     'श्रावण प्रदोष', '2026-08-03', 'all-india', 'major',  '🕉️', 2, 'Shravana Krishna Pradosh — Shivji most pleased in Shravana', 'श्रावण कृष्ण प्रदोष — विशेष महत्त्व'),
('Pradosh Vrat',     'श्रावण प्रदोष', '2026-08-17', 'all-india', 'major',  '🕉️', 2, 'Shravana Shukla Pradosh', 'श्रावण शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-09-01', 'all-india', 'medium', '🕉️', 1, 'Bhadrapada Krishna Pradosh', 'भाद्रपद कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-09-16', 'all-india', 'medium', '🕉️', 1, 'Bhadrapada Shukla Pradosh', 'भाद्रपद शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-10-01', 'all-india', 'medium', '🕉️', 1, 'Ashwin Krishna Pradosh', 'आश्विन कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-10-16', 'all-india', 'medium', '🕉️', 1, 'Ashwin Shukla Pradosh', 'आश्विन शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-11-01', 'all-india', 'medium', '🕉️', 1, 'Kartik Krishna Pradosh', 'कार्तिक कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-11-15', 'all-india', 'medium', '🕉️', 1, 'Kartik Shukla Pradosh', 'कार्तिक शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-11-30', 'all-india', 'medium', '🕉️', 1, 'Margashirsha Krishna Pradosh', 'मार्गशीर्ष कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-12-14', 'all-india', 'medium', '🕉️', 1, 'Margashirsha Shukla Pradosh', 'मार्गशीर्ष शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2026-12-29', 'all-india', 'medium', '🕉️', 1, 'Pausha Krishna Pradosh', 'पौष कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-01-13', 'all-india', 'medium', '🕉️', 1, 'Pausha Shukla Pradosh', 'पौष शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-01-28', 'all-india', 'medium', '🕉️', 1, 'Magha Krishna Pradosh', 'माघ कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-02-11', 'all-india', 'medium', '🕉️', 1, 'Magha Shukla Pradosh', 'माघ शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-02-26', 'all-india', 'medium', '🕉️', 1, 'Phalguna Krishna Pradosh', 'फाल्गुन कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-03-13', 'all-india', 'medium', '🕉️', 1, 'Phalguna Shukla Pradosh', 'फाल्गुन शुक्ल प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-03-28', 'all-india', 'medium', '🕉️', 1, 'Chaitra Krishna Pradosh', 'चैत्र कृष्ण प्रदोष'),
('Pradosh Vrat',     'प्रदोष व्रत',   '2027-04-11', 'all-india', 'medium', '🕉️', 1, 'Chaitra Shukla Pradosh', 'चैत्र शुक्ल प्रदोष'),

-- ═══════════════════════════════════════════════════════════════════════════
-- SANKASHTI CHATURTHI — Krishna Chaturthi (4th tithi dark fortnight)
-- Monthly Ganesh fast; Angarki Sankashti (on Tuesday) is extra sacred.
-- ═══════════════════════════════════════════════════════════════════════════

('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-05-17', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh fast; Moon darshan at night', 'गणपति व्रत — चंद्र दर्शन'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-06-16', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-07-15', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-08-14', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-09-12', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-10-12', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-11-10', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2026-12-10', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2027-01-09', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2027-02-08', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2027-03-09', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),
('Sankashti Chaturthi', 'संकष्टी चतुर्थी', '2027-04-08', 'all-india', 'medium', '🐘', 1, 'Krishna Chaturthi — Ganesh puja', 'गणपति व्रत'),

-- ═══════════════════════════════════════════════════════════════════════════
-- VINAYAK CHATURTHI — Shukla Chaturthi (4th tithi bright fortnight)
-- Ganesh Chaturthi (Sep 14) is already seeded; others added here.
-- ═══════════════════════════════════════════════════════════════════════════

('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-05-31', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-07-01', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-07-30', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-10-15', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-11-14', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2026-12-13', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2027-01-12', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2027-02-10', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),
('Vinayak Chaturthi', 'विनायक चतुर्थी', '2027-03-12', 'all-india', 'minor', '🐘', 0, 'Shukla Chaturthi — Ganesh puja', 'शुक्ल चतुर्थी गणेश पूजा'),

-- ═══════════════════════════════════════════════════════════════════════════
-- MASIK SHIVRATRI — Krishna Chaturdashi (14th dark fortnight) — monthly
-- Maha Shivratri (Feb 16) already seeded; monthly ones added here.
-- ═══════════════════════════════════════════════════════════════════════════

('Masik Shivratri', 'मासिक शिवरात्रि', '2026-05-26', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri — Shiva fasting on Krishna Chaturdashi', 'कृष्ण चतुर्दशी — शिव व्रत'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-06-24', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-07-23', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-08-22', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-09-20', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri — Bhadrapada Shivratri', 'भाद्रपद मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-10-20', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri — Kartik Krishna Chaturdashi', 'कार्तिक मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-11-18', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2026-12-18', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2027-01-17', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2027-03-17', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),
('Masik Shivratri', 'मासिक शिवरात्रि', '2027-04-15', 'all-india', 'medium', '🕉️', 1, 'Monthly Shivratri', 'मासिक शिवरात्रि'),

-- ═══════════════════════════════════════════════════════════════════════════
-- SOLAR SANKRANTI — Sun enters a new zodiac sign (monthly solar milestone)
-- Makar Sankranti (Jan 14) already seeded. Mesh Sankranti = Baisakhi added.
-- ═══════════════════════════════════════════════════════════════════════════

('Vrishabha Sankranti',    'वृषभ संक्रांति',         '2026-05-15', 'all-india', 'minor', '☀️', 1, 'Sun enters Taurus — solar month Vaisakh begins', 'सूर्य वृषभ राशि में'),
('Mithuna Sankranti',      'मिथुन संक्रांति',        '2026-06-15', 'all-india', 'minor', '☀️', 1, 'Sun enters Gemini', 'सूर्य मिथुन राशि में'),
('Karka Sankranti',        'कर्क संक्रांति',         '2026-07-16', 'all-india', 'medium','☀️', 2, 'Sun enters Cancer — Dakshinayana begins (sun turns south)', 'सूर्य कर्क राशि में — दक्षिणायन आरंभ'),
('Simha Sankranti',        'सिंह संक्रांति',         '2026-08-17', 'all-india', 'minor', '☀️', 1, 'Sun enters Leo', 'सूर्य सिंह राशि में'),
('Kanya Sankranti',        'कन्या संक्रांति',        '2026-09-17', 'all-india', 'minor', '☀️', 1, 'Sun enters Virgo', 'सूर्य कन्या राशि में'),
('Tula Sankranti',         'तुला संक्रांति',         '2026-10-17', 'all-india', 'minor', '☀️', 1, 'Sun enters Libra', 'सूर्य तुला राशि में'),
('Vrishchika Sankranti',   'वृश्चिक संक्रांति',      '2026-11-16', 'all-india', 'minor', '☀️', 1, 'Sun enters Scorpio', 'सूर्य वृश्चिक राशि में'),
('Dhanu Sankranti',        'धनु संक्रांति',          '2026-12-16', 'all-india', 'minor', '☀️', 1, 'Sun enters Sagittarius — Dhanu Masa sacred in South', 'सूर्य धनु राशि में'),
('Kumbha Sankranti',       'कुंभ संक्रांति',         '2027-02-13', 'all-india', 'minor', '☀️', 1, 'Sun enters Aquarius — Kumbha month begins', 'सूर्य कुंभ राशि में'),
('Mina Sankranti',         'मीन संक्रांति',          '2027-03-14', 'all-india', 'minor', '☀️', 1, 'Sun enters Pisces — Mina Masa (end of solar year)', 'सूर्य मीन राशि में — वर्षांत'),
('Mesha Sankranti / Baisakhi', 'मेष संक्रांति — बैसाखी', '2027-04-14', 'all-india', 'medium','☀️', 5, 'Solar New Year — Baisakhi (Punjab), Vishu (Kerala), Poila Boishakh (Bengal)', 'सौर नव वर्ष — बैसाखी — विशु'),

-- ═══════════════════════════════════════════════════════════════════════════
-- SPECIAL ONE-TIME EVENTS (recurring annually but not yet in DB)
-- ═══════════════════════════════════════════════════════════════════════════

-- Narasimha Jayanti — Vaishakha Shukla Chaturdashi
('Narasimha Jayanti',         'नृसिंह जयंती',             '2026-05-10', 'all-india', 'medium', '🦁', 3,
 'Vaishakha Shukla Chaturdashi — Vishnu''s man-lion avatar protects devotees',
 'वैशाख शुक्ल चतुर्दशी — भगवान नृसिंह का प्राकट्य'),

-- Shani Jayanti — Jyeshtha Amavasya
('Shani Jayanti',             'शनि जयंती',                '2026-06-25', 'all-india', 'medium', '⚫', 3,
 'Jyeshtha Amavasya — birthday of Shani Dev; worship to remove Shani doshas',
 'ज्येष्ठ अमावस्या — शनि देव जन्मोत्सव — शनि पूजन'),

-- Ratha Saptami — Magha Shukla Saptami (Sun chariot festival)
('Ratha Saptami',             'रथ सप्तमी',                '2027-02-05', 'all-india', 'medium', '☀️', 3,
 'Magha Shukla Saptami — Sun god rides chariot northward; Surya puja',
 'माघ शुक्ल सप्तमी — सूर्य रथारोहण — आरोग्य सप्तमी'),

-- Tulsi Vivah — Kartik Shukla Dwadashi (day after Devutthana Ekadashi)
('Tulsi Vivah',               'तुलसी विवाह',              '2026-11-02', 'all-india', 'medium', '🌿', 3,
 'Sacred marriage of Tulsi plant with Shaligram — marks end of Chaturmas',
 'तुलसी का शालिग्राम से विवाह — चातुर्मास का अंत'),

-- Akshaya Navami — Kartik Shukla Navami (Amla/Gooseberry festival)
('Akshaya Navami',            'अक्षय नवमी',               '2026-10-30', 'all-india', 'medium', '🌟', 3,
 'Kartik Shukla Navami — amla (gooseberry) tree worship; charity brings akshaya (eternal) merit',
 'कार्तिक शुक्ल नवमी — आंवला नवमी — अक्षय पुण्य'),

-- Vaikunta Ekadashi — regional name for Putrada Ekadashi (South India)
('Vaikunta Ekadashi',         'वैकुंठ एकादशी',            '2026-12-31', 'IN-KA,IN-AP,IN-TG,IN-TN,IN-KL', 'major', '🙏', 7,
 'Pausha Shukla Ekadashi — Vaikunta dwara opens in Vishnu temples; most sacred Ekadashi',
 'पौष शुक्ल एकादशी — वैकुंठ द्वार खुलता है — मोक्षदायी'),

-- Skanda Sashti — Kartik Shukla Sashti (Murugan/Kartikeya victory)
('Skanda Sashti',             'स्कंद षष्ठी',              '2026-10-26', 'IN-TN,IN-KL,IN-KA,IN-AP,IN-TG,IN-MH', 'major', '⚡', 7,
 'Kartik Shukla Sashti — Lord Murugan''s victory over demon Surapadman; 6-day fast',
 'कार्तिक शुक्ल षष्ठी — स्कंद भगवान की असुर पर विजय'),

-- Dev Deepawali (Kartik Purnima — already above as Kartik Purnima, but flagging for Varanasi)
-- Already covered under Kartik Purnima above.

-- Kartik Snan (holy bath the entire Kartik month)
('Kartik Snan begins',        'कार्तिक स्नान आरंभ',        '2026-10-22', 'all-india', 'medium', '💧', 3,
 'Month-long holy bath in rivers during Kartik — especially Prayagraj and Varanasi',
 'कार्तिक स्नान — पूरे मास ब्रह्ममुहूर्त में नदी स्नान'),

-- Chaitra Navratri — spring Navratri (9 days)
('Chaitra Navratri begins',   'चैत्र नवरात्रि',            '2027-03-20', 'all-india', 'major', '🪔', 7,
 'Spring Navratri — nine nights of Goddess Durga; Ram Navami on day 9',
 'चैत्र नवरात्रि — माँ दुर्गा के नौ रूपों की आराधना'),

-- Ugadi / Gudi Padwa (Hindu New Year — Chaitra Shukla Pratipada)
('Ugadi / Gudi Padwa',        'उगादि — गुड़ी पड़वा',        '2027-03-20', 'IN-KA,IN-AP,IN-TG,IN-MH,IN-GJ', 'major', '🎊', 5,
 'Hindu New Year — Chaitra Shukla Pratipada; Panchangam reading; neem-jaggery eaten',
 'हिंदू नव वर्ष — चैत्र शुक्ल प्रतिपदा — गुड़ी-नीम-गुड़'),

-- Baisakhi (Punjabi New Year / Khalsa founding day)
('Baisakhi',                  'बैसाखी',                   '2027-04-14', 'IN-PB,IN-HR,IN-DL,IN-UP', 'major', '🌾', 7,
 'Sikh New Year — Khalsa Panth founding day 1699 by Guru Gobind Singh; harvest festival',
 'बैसाखी — खालसा पंथ की स्थापना — पंजाब की फसल'),

-- Vishu (Kerala New Year)
('Vishu',                     'विशु',                     '2027-04-14', 'IN-KL', 'major', '🌸', 5,
 'Malayalam New Year — Vishukkani auspicious sight at sunrise; gift-giving',
 'केरल का नव वर्ष — विशुक्कणि दर्शन — विशुक्कैनीट्टम'),

-- Poila Boishakh (Bengali New Year)
('Poila Boishakh',            'पहला बैसाख',               '2027-04-15', 'IN-WB,IN-TR,IN-AS', 'medium', '🎉', 3,
 'Bengali New Year (Pohela Boishakh) — Subho Nababarsha',
 'बंगाली नव वर्ष — शुभो नोबोबॉर्शो'),

-- Onam (Kerala harvest festival — Thiruvonam star in Bhadrapada)
('Onam',                      'ओणम',                      '2026-09-06', 'IN-KL', 'major', '🌺', 7,
 'Thiruvonam — King Mahabali''s annual return; grand feast (Sadhya) on banana leaf',
 'ओणम — महाबलि राजा का स्वागत — केरल की फसल'),

-- Pongal (Tamil harvest festival — 4-day celebration in mid-January)
('Thai Pongal',               'पोंगल',                    '2027-01-14', 'IN-TN,IN-KL,IN-AP,IN-TG,IN-KA', 'major', '🌾', 7,
 'Thai Pongal — harvest thanksgiving; boiling of new rice in clay pot',
 'पोंगल — तमिल फसल उत्सव — नई धान की पूजा'),

-- Dussehra (already seeded as Vijayadashami Oct 21) — skip

-- Dattatreya Jayanti (Margashirsha Purnima)
('Dattatreya Jayanti',        'दत्तात्रेय जयंती',          '2026-12-04', 'all-india', 'medium', '🙏', 3,
 'Margashirsha Purnima — birthday of Lord Dattatreya (Brahma-Vishnu-Shiva trinity)',
 'मार्गशीर्ष पूर्णिमा — दत्तात्रेय भगवान का जन्मदिन'),

-- Gita Jayanti (Margashirsha Shukla Ekadashi — same as Mokshada Ekadashi)
('Gita Jayanti',              'गीता जयंती',               '2026-12-01', 'all-india', 'medium', '📖', 3,
 'Margashirsha Shukla Ekadashi — day Bhagavad Gita was spoken on Kurukshetra',
 'मार्गशीर्ष शुक्ल एकादशी — श्रीमद्भगवद्गीता का प्रकाश'),

-- Rama Navami (already seeded Apr 15 2027) — skip

-- Parshuram Jayanti (Vaishakha Shukla Tritiya — Akshaya Tritiya)
('Parashurama Jayanti',       'परशुराम जयंती',             '2026-04-20', 'all-india', 'medium', '🏹', 3,
 'Vaishakha Shukla Tritiya — birthday of Lord Parashurama; also Akshaya Tritiya',
 'वैशाख शुक्ल तृतीया — परशुराम जन्मोत्सव — अक्षय तृतीया'),

-- Sita Navami (Vaishakha Shukla Navami — Janaki Jayanti)
('Sita Navami',               'सीता नवमी',                '2026-05-05', 'all-india', 'medium', '🌸', 3,
 'Vaishakha Shukla Navami — birthday of Goddess Sita; Janaki Jayanti',
 'वैशाख शुक्ल नवमी — माँ सीता का जन्मदिन — जानकी जयंती'),

-- Gangaur (Chaitra Shukla Tritiya — Rajasthan & MP)
('Gangaur',                   'गणगौर',                    '2027-03-22', 'IN-RJ,IN-MP,IN-HR', 'medium', '🌺', 5,
 'Chaitra Shukla Tritiya — Goddess Gauri (Parvati) worship by married women for husband''s well-being',
 'चैत्र शुक्ल तृतीया — माँ गौरी पूजा — सुहागिनों का पर्व'),

-- Ahoi Ashtami (Kartik Krishna Ashtami — for sons)
('Ahoi Ashtami',              'अहोई अष्टमी',              '2026-10-28', 'IN-UP,IN-DL,IN-HR,IN-PB,IN-RJ,IN-MP', 'medium', '⭐', 3,
 'Kartik Krishna Ashtami — mothers fast for children''s long life',
 'कार्तिक कृष्ण अष्टमी — माताएँ संतान के लिए व्रत'),

-- Shayana Ekadashi alternate name for Devshayani
-- (already seeded as Devshayani Jun 29 — skip)

-- Purnimanta Shravana Purnima = Raksha Bandhan (already seeded Aug 27) — skip

-- Somvati Amavasya (Amavasya on Monday — rare, 2-3 per year)
('Somvati Amavasya',          'सोमवती अमावस्या',          '2027-02-17', 'all-india', 'major',  '🌑', 5,
 'Phalguna Amavasya on Monday — peepal tree circumambulation; Shiva & Vishnu puja; very auspicious',
 'सोमवार की अमावस्या — पीपल परिक्रमा — अत्यंत फलदायक'),

-- Shani Trayodashi (Pradosh on Saturday — Shani Pradosh — extra special)
('Shani Pradosh',             'शनि प्रदोष',               '2026-06-20', 'all-india', 'major',  '⚫', 2,
 'Pradosh on Saturday — Shani Pradosh; Shani and Shiva worshipped together',
 'शनि प्रदोष — शनि देव और शिव की संयुक्त पूजा'),

('Shani Pradosh',             'शनि प्रदोष',               '2026-11-07', 'all-india', 'major',  '⚫', 2,
 'Pradosh on Saturday — Shani Pradosh',
 'शनि प्रदोष — विशेष शिव पूजन')

ON CONFLICT DO NOTHING;
