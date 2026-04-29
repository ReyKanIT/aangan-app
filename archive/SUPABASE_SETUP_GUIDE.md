# Aangan -- Supabase Auth Setup Guide

> Project ref: `okzmeuhxodzkbdilvkyu`
> Dashboard: https://supabase.com/dashboard/project/okzmeuhxodzkbdilvkyu

---

## 1. Email Template: Send 6-Digit OTP Instead of Magic Link

By default, Supabase sends a magic link for email auth. To send a **6-digit OTP code** instead, you must update the email template to use `{{ .Token }}` (the OTP code) instead of `{{ .ConfirmationURL }}` (the magic link).

### Steps

1. Go to **Supabase Dashboard** -> **Authentication** -> **Email Templates**
2. Select the **"Confirm signup"** template tab
3. Replace the entire HTML body with the content below
4. Click **Save**
5. Repeat for **"Magic Link"** template tab (same HTML)
6. Optionally repeat for **"Change Email Address"** and **"Reset Password"** tabs

### Email Template HTML

Copy the entire block below and paste it into the template editor:

```html
<h2 style="color: #C8A84B; font-family: 'Tiro Devanagari Hindi', serif;">Aangan आँगन</h2>
<p style="font-size: 16px;">आपका OTP कोड / Your verification code:</p>
<div style="text-align: center; padding: 20px; margin: 20px 0; background: #FDFAF0; border-radius: 12px; border: 2px solid #C8A84B;">
  <h1 style="font-size: 36px; letter-spacing: 10px; color: #C8A84B; margin: 0;">{{ .Token }}</h1>
</div>
<p style="font-size: 14px;">यह कोड 1 घंटे में समाप्त हो जाएगा।<br/>This code expires in 1 hour.</p>
<p style="color: #999; font-size: 12px;">अगर आपने यह अनुरोध नहीं किया, तो कृपया इसे अनदेखा करें।<br/>If you didn't request this, please ignore this email.</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
<p style="color: #C8A84B; font-size: 12px; text-align: center;">Aangan आँगन — परिवार से जुड़ें</p>
```

### Key Detail: `{{ .Token }}` vs `{{ .ConfirmationURL }}`

| Variable | What it renders |
|----------|----------------|
| `{{ .Token }}` | 6-digit OTP code (e.g. `482917`) |
| `{{ .ConfirmationURL }}` | Full magic link URL |
| `{{ .TokenHash }}` | Hashed token for PKCE flows |

When you use `{{ .Token }}` in the template, Supabase automatically switches to **OTP mode** -- the email will contain a 6-digit code and the user verifies by entering it in the app (not by clicking a link).

### Email OTP Settings

Also verify these settings in **Authentication** -> **Providers** -> **Email**:

- **Enable Email provider**: ON
- **Confirm email**: ON (so OTP is required)
- **Secure email change**: ON
- **OTP Expiry**: 3600 seconds (1 hour)
- **OTP Length**: 6

These should already be set, but double-check them.

---

## 2. Enable Phone (SMS) OTP Provider

Phone OTP is the primary auth method for Aangan. The app uses MSG91 via a Supabase Edge Function hook.

### Step 2a: Enable Phone Provider

1. Go to **Authentication** -> **Providers** -> **Phone**
2. Toggle **Enable Phone provider**: ON
3. Toggle **Enable phone confirmations**: ON
4. Set **SMS OTP Expiry**: 600 (10 minutes)
5. Set **SMS OTP Length**: 6
6. **Phone provider**: Select **Twilio** (this is just a placeholder; the actual SMS goes through the MSG91 hook)
7. Enter any placeholder values for Twilio SID/Token/Messaging Service SID (they won't be used since the hook overrides SMS delivery)
8. Click **Save**

### Step 2b: Configure the Send SMS Hook

1. Go to **Authentication** -> **Hooks**
2. Find **Send SMS** hook
3. Toggle it **ON**
4. Set **Hook type**: HTTP
5. Set **URL**: `https://okzmeuhxodzkbdilvkyu.supabase.co/functions/v1/send-otp-sms`
6. Click **Save**

When this hook is active, Supabase calls your edge function instead of the built-in Twilio integration whenever an SMS OTP needs to be sent.

---

## 3. Deploy the `send-otp-sms` Edge Function

The edge function is at `supabase/functions/send-otp-sms/index.ts`. It receives the OTP from Supabase Auth and forwards it to MSG91.

### Step 3a: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 3b: Login to Supabase

```bash
npx supabase login
```

This opens a browser to generate an access token. The token is saved to `~/.supabase/access-token`.

### Step 3c: Link to the Remote Project

```bash
cd ~/Documents/Claude/Projects/Aangan_App/aangan_rn
npx supabase link --project-ref okzmeuhxodzkbdilvkyu
```

You will be prompted for your database password.

### Step 3d: Set Edge Function Secrets (MSG91 Credentials)

```bash
# REDACTED 2026-04-29 — original auth key was committed and is now considered leaked.
# Rotate via MSG91 dashboard, then set the new key from your password manager.
# See MSG91_KEY_ROTATION_RUNBOOK.md.
npx supabase secrets set \
  MSG91_AUTH_KEY="<NEW_KEY_FROM_PASSWORD_MANAGER>" \
  MSG91_TEMPLATE_ID="<TEMPLATE_ID_FROM_PASSWORD_MANAGER>" \
  MSG91_SENDER_ID="AANGAN" \
  --project-ref okzmeuhxodzkbdilvkyu
```

### Step 3e: Deploy the Edge Function

```bash
cd ~/Documents/Claude/Projects/Aangan_App
npx supabase functions deploy send-otp-sms --project-ref okzmeuhxodzkbdilvkyu
```

### Step 3f: Deploy Other Edge Functions

```bash
npx supabase functions deploy daily-reminders --project-ref okzmeuhxodzkbdilvkyu
npx supabase functions deploy audit-log --project-ref okzmeuhxodzkbdilvkyu
npx supabase functions deploy rate-limit --project-ref okzmeuhxodzkbdilvkyu
```

---

## 4. MSG91 Hook Configuration (Complete Reference)

### MSG91 Dashboard Setup

1. Log in to **control.msg91.com**
2. Go to **SMS** -> **Templates**
3. Create an OTP template:
   - Template Name: `AanganOTPLogin`
   - Sender ID: `AANGAN`
   - Template body: `आँगन (Aangan) - आपका OTP है: {{otp}}। 10 मिनट में expire होगा।`
   - Submit for DLT approval
4. After approval, copy the **Template ID**

### MSG91 Credentials (from CREDENTIALS.md)

| Key | Value |
|-----|-------|
| Auth Key | **REDACTED** — see CREDENTIALS.md (gitignored) / 1Password. Original committed value rotated 2026-04-29. |
| OTP Template ID | **REDACTED** — see CREDENTIALS.md / 1Password. |
| Sender ID | `AANGAN` |

### How the Hook Works

```
User taps "Send OTP" in app
  -> Supabase Auth generates 6-digit OTP
  -> Supabase calls Send SMS hook (your edge function URL)
  -> Edge function receives { user: { phone }, otp }
  -> Edge function calls MSG91 API with OTP + phone
  -> MSG91 delivers SMS to user's phone
  -> User enters OTP in app
  -> App calls supabase.auth.verifyOtp({ phone, token })
  -> Supabase verifies and creates session
```

---

## 5. Voice Messages Migration SQL

If you want to add a voice messages feature (audio messages in family chat), run this migration in **Supabase Dashboard** -> **SQL Editor**:

```sql
-- ============================================================
-- Aangan: Voice Messages Migration
-- ============================================================

-- 1. Add voice_url column to messages table (if messages table exists)
ALTER TABLE IF EXISTS public.messages
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS voice_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS is_voice_message BOOLEAN DEFAULT FALSE;

-- 2. Create a storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  false,
  10485760,  -- 10 MB max
  ARRAY['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policy: users can upload voice messages to their own folder
CREATE POLICY IF NOT EXISTS "Users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. RLS policy: family members can listen to voice messages
CREATE POLICY IF NOT EXISTS "Family members can access voice messages"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-messages'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2
        ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid()
        AND fm2.user_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 5. Index for querying voice messages
CREATE INDEX IF NOT EXISTS idx_messages_voice
ON public.messages (is_voice_message)
WHERE is_voice_message = TRUE;
```

---

## 6. Update Email Template via Supabase Management API (Alternative)

If you have a Supabase access token, you can update the email template programmatically:

### Get an Access Token

```bash
npx supabase login
# Token saved to ~/.supabase/access-token
```

Or generate one at: https://supabase.com/dashboard/account/tokens

### Update Email Template via API

```bash
# Read the access token
ACCESS_TOKEN=$(cat ~/.supabase/access-token)
PROJECT_REF="okzmeuhxodzkbdilvkyu"

# Update the "Confirm signup" email template
curl -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_templates_confirmation": "<h2 style=\"color: #C8A84B; font-family: '\''Tiro Devanagari Hindi'\'', serif;\">Aangan आँगन</h2><p style=\"font-size: 16px;\">आपका OTP कोड / Your verification code:</p><div style=\"text-align: center; padding: 20px; margin: 20px 0; background: #FDFAF0; border-radius: 12px; border: 2px solid #C8A84B;\"><h1 style=\"font-size: 36px; letter-spacing: 10px; color: #C8A84B; margin: 0;\">{{ .Token }}</h1></div><p style=\"font-size: 14px;\">यह कोड 1 घंटे में समाप्त हो जाएगा।<br/>This code expires in 1 hour.</p><p style=\"color: #999; font-size: 12px;\">अगर आपने यह अनुरोध नहीं किया, तो कृपया इसे अनदेखा करें।<br/>If you didn'\''t request this, please ignore this email.</p><hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\"/><p style=\"color: #C8A84B; font-size: 12px; text-align: center;\">Aangan आँगन — परिवार से जुड़ें</p>",
    "mailer_templates_confirmation_subject": "Aangan आँगन — आपका OTP कोड",
    "mailer_otp_length": 6,
    "mailer_otp_exp": 3600
  }'
```

### Update Magic Link Template

```bash
curl -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_templates_magic_link": "<h2 style=\"color: #C8A84B; font-family: '\''Tiro Devanagari Hindi'\'', serif;\">Aangan आँगन</h2><p style=\"font-size: 16px;\">आपका OTP कोड / Your verification code:</p><div style=\"text-align: center; padding: 20px; margin: 20px 0; background: #FDFAF0; border-radius: 12px; border: 2px solid #C8A84B;\"><h1 style=\"font-size: 36px; letter-spacing: 10px; color: #C8A84B; margin: 0;\">{{ .Token }}</h1></div><p style=\"font-size: 14px;\">यह कोड 1 घंटे में समाप्त हो जाएगा।<br/>This code expires in 1 hour.</p><p style=\"color: #999; font-size: 12px;\">अगर आपने यह अनुरोध नहीं किया, तो कृपया इसे अनदेखा करें।<br/>If you didn'\''t request this, please ignore this email.</p><hr style=\"border: none; border-top: 1px solid #eee; margin: 20px 0;\"/><p style=\"color: #C8A84B; font-size: 12px; text-align: center;\">Aangan आँगन — परिवार से जुड़ें</p>",
    "mailer_templates_magic_link_subject": "Aangan आँगन — आपका OTP कोड"
  }'
```

---

## 7. Update Local Supabase Config for Email Templates

To also apply the OTP email template for **local development**, update `aangan_rn/supabase/config.toml`.

Add these lines after the `[auth.email]` section:

```toml
[auth.email.template.confirmation]
subject = "Aangan आँगन — आपका OTP कोड"
content_path = "./templates/otp_email.html"

[auth.email.template.magic_link]
subject = "Aangan आँगन — आपका OTP कोड"
content_path = "./templates/otp_email.html"

[auth.email.template.email_change]
subject = "Aangan आँगन — ईमेल बदलने का OTP"
content_path = "./templates/otp_email.html"
```

The template file is already saved at `supabase/templates/otp_email.html`.

---

## 8. Quick Checklist

- [ ] Email template updated in Supabase Dashboard (Confirm signup tab)
- [ ] Email template updated in Supabase Dashboard (Magic Link tab)
- [ ] Template uses `{{ .Token }}` (NOT `{{ .ConfirmationURL }}`)
- [ ] OTP Length set to 6 in Email provider settings
- [ ] Phone provider enabled in Authentication -> Providers
- [ ] `send-otp-sms` edge function deployed
- [ ] MSG91 secrets set in Edge Function secrets
- [ ] Send SMS hook configured in Authentication -> Hooks
- [ ] Local config.toml updated with email template paths
- [ ] Test: sign up with email -> receive 6-digit code (not magic link)
- [ ] Test: sign up with phone -> receive SMS OTP via MSG91
