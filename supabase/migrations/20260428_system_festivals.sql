-- ============================================================================
-- SYSTEM FESTIVALS + USER PREFS + USER STATE
-- ============================================================================
-- Backbone for the festival/tithi notification feature. Replaces the
-- hard-coded FESTIVALS array in api/cron/panchang-nudge with a DB-backed
-- catalogue. Adds per-user opt-in/out + per-festival lead-time override,
-- plus state code on users so regional festivals (Chhath/Karwa Chauth/etc)
-- only fire for users in those states. Seeded with ~32 festivals covering
-- the next 12 months (May 2026 → Apr 2027). Akshaya Tritiya (20-Apr-2026)
-- is intentionally NOT seeded — Kumar declined retroactive notifications.
-- Created: 2026-04-28
-- ============================================================================

-- ── system_festivals ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_festivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    date DATE NOT NULL,
    -- 'all-india' or comma-separated ISO 3166-2:IN codes (e.g. 'IN-MH,IN-GJ')
    region TEXT NOT NULL DEFAULT 'all-india',
    importance TEXT NOT NULL DEFAULT 'medium' CHECK (importance IN ('major', 'medium', 'minor')),
    icon TEXT DEFAULT '🎉',
    notify_days_before INTEGER NOT NULL DEFAULT 7 CHECK (notify_days_before BETWEEN 0 AND 60),
    description_hi TEXT,
    description_en TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_festivals_date ON public.system_festivals(date);
CREATE INDEX IF NOT EXISTS idx_system_festivals_active ON public.system_festivals(is_active) WHERE is_active = TRUE;

ALTER TABLE public.system_festivals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_festivals_read_all" ON public.system_festivals;
CREATE POLICY "system_festivals_read_all" ON public.system_festivals
    FOR SELECT TO authenticated USING (TRUE);

-- Writes restricted to service_role (admin / cron). No INSERT/UPDATE/DELETE
-- policies for `authenticated` — that means regular users cannot mutate.

-- ── user_festival_prefs ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_festival_prefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    festival_id UUID NOT NULL REFERENCES public.system_festivals(id) ON DELETE CASCADE,
    opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    -- nullable; when set, overrides system_festivals.notify_days_before for this user
    notify_days_before INTEGER CHECK (notify_days_before IS NULL OR notify_days_before BETWEEN 0 AND 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, festival_id)
);

CREATE INDEX IF NOT EXISTS idx_user_festival_prefs_user ON public.user_festival_prefs(user_id);

ALTER TABLE public.user_festival_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_festival_prefs_owner_read" ON public.user_festival_prefs;
CREATE POLICY "user_festival_prefs_owner_read" ON public.user_festival_prefs
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_festival_prefs_owner_insert" ON public.user_festival_prefs;
CREATE POLICY "user_festival_prefs_owner_insert" ON public.user_festival_prefs
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_festival_prefs_owner_update" ON public.user_festival_prefs;
CREATE POLICY "user_festival_prefs_owner_update" ON public.user_festival_prefs
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_festival_prefs_owner_delete" ON public.user_festival_prefs;
CREATE POLICY "user_festival_prefs_owner_delete" ON public.user_festival_prefs
    FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trigger_user_festival_prefs_updated_at
    BEFORE UPDATE ON public.user_festival_prefs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ── users — add state_code + GPS coords ─────────────────────────────────────

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS state_code TEXT,
    ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION;

-- ── Seed: festivals May 2026 → Apr 2027 ────────────────────────────────────
-- Region uses ISO 3166-2:IN codes; major north-India bloc =
--   'IN-DL,IN-HR,IN-PB,IN-UP,IN-RJ,IN-MP,IN-UT,IN-HP,IN-CH,IN-JK'
-- Bihar/UP/Jharkhand bloc (Chhath etc) = 'IN-BR,IN-UP,IN-JH'
-- Verify dates against pandit calendar before final ship — lunar
-- observances can shift by ±1 day in some regions.

INSERT INTO public.system_festivals (name_en, name_hi, date, region, importance, icon, notify_days_before, description_en, description_hi) VALUES
    ('Buddha Purnima',           'बुद्ध पूर्णिमा',   '2026-05-11', 'all-india', 'major',  '☸️', 7,  'Birth anniversary of Lord Buddha',                  'भगवान बुद्ध का जन्मदिवस'),
    ('Vat Savitri',              'वट सावित्री',      '2026-05-19', 'IN-MH,IN-GJ,IN-UP,IN-BR,IN-MP', 'medium', '🌳', 7,  'Married women fast for husband''s long life',       'सुहागिनों का व्रत'),
    ('Ganga Dussehra',           'गंगा दशहरा',       '2026-05-26', 'all-india', 'medium', '🌊', 7,  'Descent of Ganga to earth',                          'गंगा अवतरण'),
    ('Nirjala Ekadashi',         'निर्जला एकादशी',   '2026-05-27', 'all-india', 'medium', '🪔', 5,  'Most austere of all Ekadashis',                      'सबसे कठिन एकादशी'),
    ('Devshayani Ekadashi',      'देवशयनी एकादशी',   '2026-06-29', 'all-india', 'medium', '🪔', 5,  'Lord Vishnu enters cosmic sleep',                    'विष्णु शयन'),
    ('Jagannath Rath Yatra',     'जगन्नाथ रथ यात्रा', '2026-07-16', 'IN-OR,IN-WB', 'major', '🛕', 14, 'Annual chariot festival of Lord Jagannath',          'भगवान जगन्नाथ की रथ यात्रा'),
    ('Guru Purnima',             'गुरु पूर्णिमा',     '2026-07-28', 'all-india', 'major',  '🙏', 7,  'Day to honour gurus and teachers',                   'गुरुओं को सम्मान का दिन'),
    ('Hariyali Teej',            'हरियाली तीज',      '2026-08-09', 'IN-RJ,IN-UP,IN-HR,IN-PB,IN-DL', 'medium', '🌿', 7,  'Married women festival of Sawan',                    'सावन का स्त्री-व्रत'),
    ('Nag Panchami',             'नाग पंचमी',        '2026-08-15', 'all-india', 'medium', '🐍', 5,  'Worship of serpents',                                 'नाग देवता की पूजा'),
    ('Raksha Bandhan',           'रक्षा बंधन',       '2026-08-27', 'all-india', 'major',  '🪢', 7,  'Brother-sister bond festival',                       'भाई-बहन का त्योहार'),
    ('Krishna Janmashtami',      'कृष्ण जन्माष्टमी',  '2026-09-04', 'all-india', 'major',  '🦚', 7,  'Birth of Lord Krishna',                              'भगवान कृष्ण का जन्म'),
    ('Ganesh Chaturthi',         'गणेश चतुर्थी',     '2026-09-14', 'all-india', 'major',  '🐘', 7,  'Arrival of Lord Ganesha',                            'गणपति बप्पा का आगमन'),
    ('Anant Chaturdashi',        'अनंत चतुर्दशी',    '2026-09-24', 'IN-MH,IN-KA,IN-GA,IN-AP,IN-TG', 'medium', '🌊', 5,  'Ganesh Visarjan day',                                'गणेश विसर्जन'),
    ('Pitru Paksha begins',      'पितृ पक्ष आरंभ',   '2026-09-27', 'all-india', 'medium', '🪔', 3,  'Fortnight of ancestor remembrance',                  'पितरों का स्मरण पक्ष'),
    ('Sarva Pitru Amavasya',     'सर्व पितृ अमावस्या', '2026-10-11', 'all-india', 'medium', '🌑', 5,  'Last day of Pitru Paksha',                           'पितृ पक्ष का अंतिम दिन'),
    ('Sharad Navratri begins',   'शारदीय नवरात्रि',   '2026-10-12', 'all-india', 'major',  '🪔', 7,  'Nine nights of Goddess Durga',                       'माँ दुर्गा के नौ दिन'),
    ('Durga Ashtami',            'दुर्गा अष्टमी',     '2026-10-19', 'all-india', 'major',  '🌺', 5,  'Eighth day of Navratri — Durga Puja',                'नवरात्रि की अष्टमी'),
    ('Vijayadashami / Dussehra', 'विजयदशमी',         '2026-10-21', 'all-india', 'major',  '🏹', 7,  'Victory of Lord Rama over Ravana',                   'राम की रावण पर विजय'),
    ('Karwa Chauth',             'करवा चौथ',         '2026-11-03', 'IN-DL,IN-HR,IN-PB,IN-UP,IN-RJ,IN-MP,IN-UT,IN-HP,IN-CH,IN-JK', 'major', '🌙', 7,  'Married women fast for husband''s long life',       'सुहागिनों का व्रत'),
    ('Dhanteras',                'धनतेरस',           '2026-11-07', 'all-india', 'major',  '💰', 7,  'First day of Diwali — Lakshmi & Dhanvantari',        'दीपावली का पहला दिन'),
    ('Diwali',                   'दीपावली',          '2026-11-09', 'all-india', 'major',  '🪔', 14, 'Festival of lights — Lakshmi Puja',                  'रोशनी का त्योहार'),
    ('Govardhan Puja',           'गोवर्धन पूजा',     '2026-11-10', 'all-india', 'medium', '🐄', 5,  'Worship of Mount Govardhan',                         'गोवर्धन पर्वत की पूजा'),
    ('Bhai Dooj',                'भाई दूज',          '2026-11-11', 'all-india', 'medium', '🪔', 5,  'Sister prays for brother''s long life',              'भाई-बहन का प्रेम'),
    ('Chhath Puja',              'छठ पूजा',          '2026-11-14', 'IN-BR,IN-UP,IN-JH', 'major',  '🌅', 14, 'Sun and Chhathi Maiya worship',                      'सूर्य देव और छठी मैया की पूजा'),
    ('Geeta Jayanti',            'गीता जयंती',       '2026-12-19', 'all-india', 'medium', '📖', 5,  'Birth anniversary of Bhagavad Gita',                 'भगवद् गीता का जन्मदिन'),
    ('Christmas',                'क्रिसमस',          '2026-12-25', 'all-india', 'medium', '🎄', 5,  'Birth of Jesus Christ',                              'ईसा मसीह का जन्म'),
    ('Makar Sankranti / Pongal', 'मकर संक्रांति',    '2027-01-14', 'all-india', 'major',  '🌞', 7,  'Sun enters Capricorn — harvest festival',            'सूर्य उत्तरायण'),
    ('Vasant Panchami',          'वसंत पंचमी',       '2027-01-23', 'all-india', 'medium', '📚', 7,  'Goddess Saraswati worship — spring begins',          'माँ सरस्वती की पूजा'),
    ('Maha Shivratri',           'महा शिवरात्रि',     '2027-02-16', 'all-india', 'major',  '🔱', 7,  'Great night of Lord Shiva',                          'भगवान शिव की महा रात्रि'),
    ('Holika Dahan',             'होलिका दहन',       '2027-03-04', 'all-india', 'major',  '🔥', 7,  'Bonfire on the eve of Holi',                         'होली से एक रात पहले'),
    ('Holi',                     'होली',             '2027-03-05', 'all-india', 'major',  '🎨', 7,  'Festival of colours',                                'रंगों का त्योहार'),
    ('Ram Navami',               'राम नवमी',         '2027-04-15', 'all-india', 'major',  '🏹', 7,  'Birth of Lord Rama',                                 'भगवान राम का जन्म'),
    ('Hanuman Jayanti',          'हनुमान जयंती',     '2027-04-21', 'all-india', 'major',  '💪', 7,  'Birth of Lord Hanuman',                              'भगवान हनुमान का जन्म')
ON CONFLICT DO NOTHING;
