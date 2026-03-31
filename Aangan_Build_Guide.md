# आँगन (Aangan) — FlutterFlow + Supabase Build Guide

## Step 1: Connect FlutterFlow to Supabase

### 1.1 Get Your Supabase Keys

1. Go to [supabase.com](https://supabase.com) → Sign in
2. Open your **Aangan project** (or create one: click "New Project", name it `aangan`, set a strong password, choose region **Mumbai** for lowest latency)
3. Go to **Settings** → **API** (left sidebar)
4. Copy these two values (keep them safe):
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon (public) key** — the long key starting with `eyJ...`

> ⚠️ **Important**: FlutterFlow needs the **legacy JWT key** (starts with `eyJ`). If you see a key starting with `sb_pub_`, that's the new format — FlutterFlow doesn't support it yet. Contact Supabase support to get the legacy key.

### 1.2 Connect in FlutterFlow

1. Go to [flutterflow.io](https://flutterflow.io) → Open your Aangan project (or create one)
2. Go to **Settings** (gear icon, left sidebar) → **Supabase**
3. Toggle **Enable Supabase** ON
4. Paste your:
   - **Supabase URL** → the Project URL from above
   - **Supabase Anon Key** → the `eyJ...` key
5. Click **Test Connection** → should show ✅ green
6. Click **Save**

---

## Step 2: Set Up the Database

### 2.1 Run the Schema SQL

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase_schema.sql` (included in this folder)
4. Copy the ENTIRE contents and paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success" — this creates all 8 tables with security policies

### 2.2 Enable Phone Auth

1. In Supabase, go to **Authentication** → **Providers**
2. Find **Phone** and toggle it ON
3. For testing, enable **Phone (OTP)** with these settings:
   - **SMS Provider**: Twilio (recommended) or MessageBird
   - For Twilio setup:
     - Sign up at [twilio.com](https://twilio.com)
     - Get a Twilio phone number
     - Copy your **Account SID**, **Auth Token**, and **Phone Number**
     - Paste them in Supabase
4. Click **Save**

> 💡 **Free testing tip**: During development, Supabase lets you use test phone numbers. Go to **Authentication** → **URL Configuration** and note the redirect URL. You can add test phone numbers under **Authentication** → **Providers** → **Phone** → scroll down to "Phone Auth Testing".

---

## Step 3: Build the Login/Signup Screen in FlutterFlow

### 3.1 Create the Login Page

1. In FlutterFlow, go to **Pages** → click **+** → **Blank Page**
2. Name it `LoginPage`
3. Set it as the **Entry Page**: Right-click → Set as Entry Page

### 3.2 Build the Welcome Screen

1. Add a **Column** (full width, center aligned)
2. Inside the Column, add:
   - **Container** (top section — Haldi gold background `#C8A84B`, height 300)
     - Inside: **Text** widget → "आँगन" (font size 48, white, serif font)
     - Below it: **Text** → "Your Family" (font size 18, white)
   - **Container** (cream background `#FDFAF0`, padding 24)
     - **Text** → "अपना फ़ोन नंबर दें" (Enter Your Phone Number) — size 20, color `#333`
     - **Row** containing:
       - **Text** → "+91 🇮🇳" (prefix, size 16)
       - **TextField** → name it `phoneField`, hint "10-digit mobile number", keyboard type: Phone
     - **Button** → "OTP भेजें (Send OTP)" — background `#C8A84B`, text white, full width, border radius 12

### 3.3 Set Up the OTP Action

1. Select the "Send OTP" **Button**
2. Go to **Actions** → **+ Add Action**
3. Choose **Supabase Authentication** → **Sign In with Phone**
4. Set the phone number to: `"+91" + phoneField.text`
5. On success → Navigate to `OTPVerificationPage`

### 3.4 Create the OTP Verification Page

1. Create new page: `OTPVerificationPage`
2. Add a **Column**:
   - **Text** → "OTP दर्ज करें" (Enter OTP) — size 24
   - **Text** → "हमने +91 XXXXX पर OTP भेजा है" — size 14, grey
   - **PinCodeTextField** (or 6 TextFields in a Row) for OTP entry
   - **Button** → "Verify करें" — Haldi gold
   - **TextButton** → "OTP दोबारा भेजें" (Resend OTP)

3. **Verify Button Action**:
   - Action → **Supabase Authentication** → **Verify OTP**
   - Phone: pass from previous page
   - Token: OTP entered
   - On success → Navigate to `HomePage` (or `ProfileSetupPage` if new user)

### 3.5 Create the Profile Setup Page (New Users Only)

1. Create page: `ProfileSetupPage`
2. Add fields:
   - **TextField** → `nameField` — hint "अपना नाम लिखें (Your Name)"
   - **TextField** → `villageField` — hint "गाँव / शहर (Village / City)"
   - **ImagePicker** → for profile photo (circular, 120x120)
   - **Button** → "आँगन में शामिल हों (Join Aangan)" — Mehndi green `#7A9A3A`

3. **Join Button Action**:
   - Action 1: **Supabase** → **Insert Row** → Table: `users`
     - Map: `display_name` = nameField, `village` = villageField, `avatar_url` = uploaded image URL
   - Action 2: Navigate to `HomePage`

---

## Step 4: Style Everything Aangan-Style

### Color Palette (save in FlutterFlow Theme)
| Name | Hex | Use |
|------|-----|-----|
| Haldi Gold | `#C8A84B` | Headers, primary buttons |
| Mehndi Green | `#7A9A3A` | Accents, secondary buttons |
| Cream | `#FDFAF0` | Page background |
| Dark Text | `#2D2D2D` | Body text |
| Light Text | `#8B7E6A` | Hints, secondary text |

### Font Setup
- Go to **Settings** → **Theme** → **Typography**
- Heading font: **Tiro Devanagari Hindi** (add from Google Fonts)
- Body font: **Poppins**

### Design Rules (Dadi Strategy — दादी टेस्ट)
- Minimum button height: **52px**
- Minimum font size: **16px** (body), **20px+** (headings)
- Touch targets: at least **48x48px**
- Hindi labels first, English subtitle below in smaller text
- Rounded corners: **12-16px** on buttons and cards
- Soft shadows only (no harsh borders)

---

## Step 5: Test Your Login Flow

1. Click **Preview** (play button, top right) in FlutterFlow
2. Enter a test phone number
3. Check your phone for the OTP
4. Enter OTP → should navigate to Profile Setup or Home
5. Fill profile → should save to Supabase

### Checking Data in Supabase
1. Go to Supabase → **Table Editor** (left sidebar)
2. Click on `users` table
3. You should see your new user's data! 🎉

---

## What's Next?

After Login/Signup is working, we'll build these screens in order:

1. **🏠 Home Feed** — Family posts, photos, updates
2. **🌳 Family Tree** — Add/view family with Level 1/2/3 connections
3. **📝 Post Composer** — Create posts with audience selector
4. **🎉 Event Invitation** — Wedding/puja invites with RSVP
5. **👤 Member Profile** — View family member details
6. **🔔 Notifications** — Activity alerts

---

*Built with ❤️ for Indian families — आँगन, Your Family*
