# Aangan SMS Templates — Vi DLT (vilpower.in) Submission Pack

> Prepared: [2:55pm - 17Apr26] · Target portal: https://www.vilpower.in
> PEID: **VI-1100093984** · Header (Sender ID): **AANGFM** · Aggregator: MSG91

## Submission quick-reference

Everything below is copy-paste-ready for the vilpower.in "Content Template Registration" screen. Match the Template Type column to the dropdown; the platform rejects mismatched categories.

DLT variable placeholder on Vi is literally `{#var#}` (case-sensitive, no spaces, no numbering). Use one per dynamic field in the order they appear.

---

## A. INDIVIDUAL SMS — Service Implicit (transactional, user-triggered)

Service Implicit = sent in direct response to a user action (they invited someone, they RSVP'd, etc.). Highest delivery priority after OTP. Does NOT need explicit opt-in — implied consent from the user action.

### A1. Event Invite Received
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Host creates event & invites specific family members
**Sample content (fill-in):**

```
{#var#} ne aapko {#var#} mein bulaya hai. {#var#} ko {#var#} par. RSVP: {#var#} - AANGFM
```

**Variables in order:**
1. Inviter name (e.g., "Ram Sharma")
2. Event name (e.g., "Priya ki shaadi")
3. Date (e.g., "15 Jun 2026")
4. Venue (e.g., "Jaipur")
5. Short link (e.g., "aangan.app/e/ab12")

**Char count:** 118 chars with sample values → fits in 1 SMS part. ✅

---

### A2. RSVP Confirmation
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Guest clicks "जाएंगे / going" on an event

```
Aapka RSVP {#var#} event ke liye confirm ho gaya. Tarikh {#var#}. Details: {#var#} - AANGFM
```

**Variables:** 1) Event name · 2) Event date · 3) Event link
**Char count:** ~100 chars. ✅

---

### A3. Event Reminder (24 hours before)
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Cron at T-24h for every guest who RSVP'd going

```
Kal {#var#} par {#var#} hai. Samay {#var#} baje. Pata: {#var#}. Dekhein: {#var#} - AANGFM
```

**Variables:** 1) Venue · 2) Event name · 3) Time · 4) Address · 5) Link
**Char count:** ~110 chars. ✅

---

### A4. Event Reminder (2 hours before)
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Cron at T-2h for every guest going

```
Yaad dilaane ke liye: {#var#} 2 ghante mein shuru hoga. {#var#} par. Dekhein: {#var#} - AANGFM
```

**Variables:** 1) Event name · 2) Venue · 3) Link

---

### A5. Family Member Joined Aangan
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Invited family member completes signup

```
{#var#} ne Aangan join kar liya hai aur aapke family tree mein jud gaye. Dekhein: {#var#} - AANGFM
```

**Variables:** 1) New member name · 2) Profile link

---

### A6. Physical Invitation Card Sent
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Host marks physical card as sent

```
{#var#} ne aapko {#var#} ka card {#var#} se bheja hai. Mil jaaye toh confirm karein: {#var#} - AANGFM
```

**Variables:** 1) Host name · 2) Event name · 3) Delivery method (hand/post/courier) · 4) Link

---

### A7. Support Ticket Reply
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Admin replies on a support ticket via /admin/issues

```
Aapke ticket {#var#} par Aangan team ne jawab diya hai. Padhein: {#var#} - AANGFM
```

**Variables:** 1) Ticket number (TKT-001023) · 2) Ticket link

---

### A8. Issue Resolved
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Admin marks support ticket / content report as resolved

```
Aapki shikayat ka samadhan ho gaya hai. Details: {#var#} - AANGFM
```

**Variables:** 1) Ticket/report link

---

## B. BULK SMS — Service Explicit (broadcast to consented users)

Service Explicit = informational broadcast where the user opted in at signup (Aangan ToS covers this). Lower priority than Service Implicit, but avoids DND blocks because of explicit consent.

### B1. Festival Greeting
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** Broadcast on major festival days to all active users

```
{#var#} ki hardik shubhkamnaye! Apne parivaar ke saath khushiyan baantein Aangan par: {#var#} - AANGFM
```

**Variables:** 1) Festival name (Diwali/Holi/Raksha Bandhan/etc.) · 2) App link

---

### B2. Daily Panchang Digest (opt-in)
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** Daily at 6 AM IST to users who enabled Panchang reminders

```
Aaj ka panchang - Tithi: {#var#}, Nakshatra: {#var#}, Vaar: {#var#}. Poora padhein: {#var#} - AANGFM
```

**Variables:** 1) Tithi name · 2) Nakshatra name · 3) Day · 4) Panchang URL

---

### B3. Weekly Family Digest
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** Weekly Sunday 8 PM IST — summary of family activity

```
Is hafte aapke parivaar ne Aangan par {#var#} posts aur {#var#} photos share kiye. Dekhein: {#var#} - AANGFM
```

**Variables:** 1) Post count · 2) Photo count · 3) Feed link

---

### B4. Upcoming Events Digest
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** Weekly on Friday — upcoming family events

```
Aane waale hafte mein parivaar ke {#var#} events hain. Pehla: {#var#} {#var#} ko. Sab dekhein: {#var#} - AANGFM
```

**Variables:** 1) Event count · 2) Next event name · 3) Next event date · 4) Events link

---

### B5. Birthday / Anniversary Reminder
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** At 9 AM on birthday/anniversary, to close family (Level 1/2)

```
Aaj {#var#} ka {#var#} hai. Shubhkamnaye bhejein: {#var#} - AANGFM
```

**Variables:** 1) Person name · 2) Occasion (janamdin/shaadi ki saalgirah) · 3) Profile link

---

### B6. App Update Announcement
**Template Type:** Service Explicit · **Category:** Transactional
**Trigger:** On major release (e.g., v1.0)

```
Aangan ka naya version {#var#} aa gaya. Nayi sevayein add hui hain. Update karein: {#var#} - AANGFM
```

**Variables:** 1) Version (e.g., 1.0) · 2) Play Store / App Store link

---

### B7. Maintenance Notice
**Template Type:** Service Implicit · **Category:** Transactional
**Trigger:** Pre-scheduled downtime notification

```
Aangan {#var#} se {#var#} tak maintenance ke liye band rahega. Asuvidha ke liye khed hai. - AANGFM
```

**Variables:** 1) Start time · 2) End time

---

## Submission workflow on vilpower.in

### Step 1 — Login
1. Visit https://www.vilpower.in
2. Login with the Aangan Principal Entity credentials (PEID VI-1100093984)
3. Navigate to **Content Template** → **Add New Template**

### Step 2 — For each template, fill:
| Field | Value |
|---|---|
| **Header (Sender ID)** | AANGFM |
| **Template Type** | Match the "Template Type" row above |
| **Template Category** | Transactional |
| **Template Content Type** | Text (not Unicode — these templates are all Roman Hindi) |
| **Template Name** | Use the A1/A2/B1 label, e.g. "Aangan Event Invite" |
| **Template Content** | Paste the boxed content above, keeping `{#var#}` literal |
| **PE Consent Template ID** | Blank unless vilpower prompts (use your existing consent template if any) |

### Step 3 — Submit → wait for Vi DLT approval
- Approval typically takes 24-72 hours
- Rejected templates show a reason on the dashboard → fix + resubmit
- Once approved, each template gets a **Template ID** (e.g., `1107174321234567890`)
- Save each Template ID into Supabase env vars (see wiring table below)

### Step 4 — Wire into code
Once Vi returns Template IDs, set them as Supabase secrets and reference from the edge functions:

| Template | Env var to set |
|---|---|
| A1 Event Invite | `MSG91_TEMPLATE_EVENT_INVITE` |
| A2 RSVP Confirm | `MSG91_TEMPLATE_RSVP_CONFIRM` |
| A3 Reminder 24h | `MSG91_TEMPLATE_REMIND_24H` |
| A4 Reminder 2h | `MSG91_TEMPLATE_REMIND_2H` |
| A5 Family Join | `MSG91_TEMPLATE_FAMILY_JOIN` |
| A6 Card Sent | `MSG91_TEMPLATE_CARD_SENT` |
| A7 Ticket Reply | `MSG91_TEMPLATE_TICKET_REPLY` |
| A8 Issue Resolved | `MSG91_TEMPLATE_ISSUE_RESOLVED` |
| B1 Festival | `MSG91_TEMPLATE_FESTIVAL` |
| B2 Panchang | `MSG91_TEMPLATE_PANCHANG_DAILY` |
| B3 Weekly Digest | `MSG91_TEMPLATE_WEEKLY_DIGEST` |
| B4 Upcoming Events | `MSG91_TEMPLATE_EVENTS_DIGEST` |
| B5 Birthday | `MSG91_TEMPLATE_BIRTHDAY` |
| B6 App Update | `MSG91_TEMPLATE_APP_UPDATE` |
| B7 Maintenance | `MSG91_TEMPLATE_MAINTENANCE` |

Set via:
```bash
supabase secrets set MSG91_TEMPLATE_EVENT_INVITE=1107174321234567890
```

### Step 5 — Test each
MSG91 dashboard → Campaigns → send 1 SMS per template to your own number to confirm delivery before wiring to users.

---

## Content rules to remember

- **Sender ID must be in the body**: every template ends with "- AANGFM" because Vi checks for the header at the tail of the content.
- **No URLs with tracking params** unless the domain is whitelisted on vilpower.in. Use short aangan.app/e/... paths.
- **No emojis in DLT templates** — Unicode encoding cuts char limit to 70 per part and some handsets mangle. Keep pure ASCII.
- **Hindi Devanagari** requires Unicode templates + separate category submission. These Roman-Hindi templates (लिखा-as-typed) are covered by the standard ASCII category.
- **Character count**: keep each template under 160 chars WITH sample max-length variables. Vi rejects templates that overflow with realistic values.

---

## On auto-submission

I can walk you through the vilpower.in form via Claude-in-Chrome MCP — I'll fill each field while you watch, and **you click the final Submit**. But DLT submissions affect your PEID score if content/category is wrong, so I won't blind-submit on your behalf.

If you want me to drive the browser, say the word and I'll:
1. Open vilpower.in in your Chrome
2. Navigate to Content Template → Add New
3. Fill fields from this doc, one template at a time
4. Pause before each Submit so you confirm
5. Track approval status via dashboard reads

Alternative: you copy-paste each block into the portal yourself — faster if you know the UI.
