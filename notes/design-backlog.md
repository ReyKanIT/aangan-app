# Aangan Design Backlog
> Last updated: [5:37pm - 17May26] (Design Lead agent — first audit)
> Scope: HomeFeedScreen, FamilyTreeScreen, KulvrikshTreeView, LoginScreen, SettingsScreen
> Convention: each item is `[Screen] Summary — file:line — fix — risk`

---

## P0 — Ship-blockers (Dadi Test failures or critical regressions)

- [ ] **[Login] Google sign-in icon renders as Unicode "🅖" glyph instead of the Google G logo** — `aangan_rn/src/screens/auth/LoginScreen.tsx:315` — replace `<Text style={styles.googleIcon}>🅖</Text>` with the SVG `<GoogleIcon />` used in `aangan_web` (or a multicolour PNG); current glyph looks like a placeholder and undermines the highest-converting CTA. **Risk:** touches the `login-google-button` critical feature row in `CRITICAL_FEATURES.md` — DO NOT remove the button, only replace the icon node. Add a smoke-test selector via `accessibilityLabel="Google से जारी रखें"` (already present) and a `testID="login-google-button"`.

- [ ] **[Login] Google button label is bare JSX text** — `LoginScreen.tsx:316` — `<Text style={styles.googleButtonText}>Google से जारी रखें</Text>` violates the CLAUDE.md "Hindi in JSX must be wrapped in `{'...'}`" rule that was added 2026-05-03 to prevent the v0.13.16 Devanagari-escape regression. Wrap as `<Text style={styles.googleButtonText}>{'Google से जारी रखें'}</Text>`. Same fix needed at lines 358, 409, 472, 488, 286 ("English" / "हिंदी"), 298–300 (title — currently uses `\u…` escapes which work but should also be JS strings), 330–331, 358, 419–420, 472, 488, 503–505, 519, 537, 543–546. **Risk:** none — these are non-functional refactors. **Add a guardrail test** (`hindi-jsx-wrapping.test.ts`) that grep-asserts no bare Devanagari inside `<Text>…</Text>` in `src/screens/**`.

- [ ] **[FamilyTree] Tab font size is 14px, below the 16px Dadi-minimum** — `FamilyTreeScreen.tsx:1261` (`tabText: { fontSize: 14 }`) — set to `fontSize: 16`, and let `tabIcon` shrink from 22→20 to keep the height. **Risk:** mid-refactor screen (v0.16.1 just collapsed tabs). Confirm visual rhythm with `KulvrikshTreeView` tab. Add structural test that `tabText.fontSize >= DADI_MIN_BODY_TEXT`.

- [ ] **[HomeFeed] Panchang header date+tithi line is 16px Poppins-700 — Hindi tithi inside is too small for grandma to read** — `HomeFeedScreen.tsx:1064` (`headerTitle: { fontSize: 16 }`) — bump to `fontSize: 18, lineHeight: 26`. The line currently mixes 16px Hindi tithi (`पूर्णिमा`) with English date and the Hindi conjuncts compress visually. **Risk:** the `specialRibbon` (line 1082) below sits tight to the header; if you increase header height by ~6px, also bump `panchangStyles.header.paddingVertical` from 18→14 to keep total card height.

- [ ] **[KulvrikshTree] Member card name is 13px, relationship is 11px — both below the 16px Dadi minimum** — `KulvrikshTreeView.tsx:783, 799` — bump to `name: 15` and `rel: 13` minimum. Cards may need to grow from `CARD_W:110 / CARD_H:132` → `CARD_W:124 / CARD_H:146`; recompute `widestRowCount` math. **Risk:** this screen was just refactored (v0.16.1, c9dbfa0) — the `useMemo`-above-early-return fix is in line 316. Do NOT reorder hooks again. Run jest after the change to verify `tree-card-name-min-font.test.ts` (to be added).

- [ ] **[KulvrikshTree] No tap handler wired on `MemberCardNode` from `FamilyTreeScreen`** — `FamilyTreeScreen.tsx:1143-1151` passes no `onMemberPress` — tapping a card is silent. Tapping should navigate to `MemberProfile`. Wire it: `<KulvrikshTreeView … onMemberPress={(m) => navigation.navigate('MemberProfile', { memberId: m.id })} />`. **Risk:** verify `MemberProfile` route accepts both real (`family_members.id`) and synthetic (`offline-${id}`) IDs. If not, gate the press for offline rows (`if (m.id.startsWith('offline-')) return;`).

---

## P1 — Premium polish (visual rhythm, hierarchy, micro-interactions)

- [ ] **[HomeFeed] Header is haldi-gold with white text, but app uses cream/brown elsewhere — feels disconnected from card surfaces** — `HomeFeedScreen.tsx:766-783` — keep haldi-gold for brand impact, but add a 6-8px subtle gradient/glow on the bottom edge (`borderBottomLeftRadius/RightRadius: 16` to match the card language). **Risk:** none — purely additive.

- [ ] **[HomeFeed] FAB at bottom-right is plain haldi-gold circle without elevation halo** — `HomeFeedScreen.tsx:857-867` — add `shadowColor: Colors.haldiGoldDark, shadowRadius: 16, shadowOpacity: 0.35, shadowOffset: {0, 8}` and a faint inner highlight ring. Currently the FAB feels stamped-on. **Risk:** none.

- [ ] **[HomeFeed] ComposerPrompt action chips are unclickable (View, not TouchableOpacity)** — `HomeFeedScreen.tsx:198-211` — the `📷 फ़ोटो / 🎥 वीडियो / 🎤 आवाज़` buttons sit inside a single Pressable that opens the composer. Users will expect tapping `📷` to open the camera directly. Either (a) make each `<View style={composerStyles.action}>` a `<TouchableOpacity onPress={() => navigation.navigate('PostComposer', { mode: 'photo' })}>`, or (b) remove the visual divider/chip styling that implies tap-ability. **Risk:** check `PostComposer` accepts a `mode` route param.

- [ ] **[HomeFeed] GuidedFlowBanner step buttons are `minHeight: 36` — below Dadi 44px tap target** — `HomeFeedScreen.tsx:938` — bump to `minHeight: 44`. Also the green check `✅` vs hollow circle `○` are misaligned (line-heights differ). Use a fixed-size circular badge component. **Risk:** none.

- [ ] **[FamilyTree] Bottom invite banner overlaps the tree's scroll area without a fade gradient** — `FamilyTreeScreen.tsx:1349-1358` — add a 24px linear gradient (`cream → transparent`) above the `inviteBanner` so SVG nodes near the bottom aren't clipped abruptly. **Risk:** import `expo-linear-gradient`; verify it's in package.json (it is — used by KulvrikshTreeView? actually it uses SVG Defs gradient — fine).

- [ ] **[FamilyTree] Level filter chips have 14px text** — `FamilyTreeScreen.tsx:1289` (`...Typography.bodySmall`) — bump to `Typography.body` (16px). Also `paddingVertical: Spacing.sm` (8px) → `Spacing.md` (12px) to hit 44px tap target. **Risk:** none.

- [ ] **[KulvrikshTree] Generation labels are 11px uppercase tracking 0.5 — illegible for grandmother** — `KulvrikshTreeView.tsx:675` — bump to `fontSize: 13, letterSpacing: 0.3, textTransform: 'none'`. The uppercase Hindi (`दादा-दादी / नाना-नानी`) doesn't even uppercase visually; only the letter-spacing applies, making it look thin. **Risk:** none.

- [ ] **[KulvrikshTree] Hint chip says "चुटकी से zoom" — "चुटकी" is colloquial for pinch but unusual; grandma won't know to pinch** — `KulvrikshTreeView.tsx:493-498` — change to `'दो उँगलियों से ज़ूम करें · दो बार टैप करें reset'`. Better: replace text with an animated pinch icon for 3 seconds on first render, then fade. **Risk:** none.

- [ ] **[Login] No country-code picker for non-IN numbers** — `LoginScreen.tsx:333-335` — the `+91` is hardcoded in a `prefixBox` View. CRITICAL_FEATURES.md row 51 lists "Country code picker dropdown with at least IN +91" as critical. Today's hardcoded prefix blocks NRIs from signing up. **Risk:** this is listed in `CRITICAL_FEATURES.md` — adding the picker is allowed (it's the absence that's the regression). Add a dropdown that defaults to +91 and includes +1, +44, +971 for diaspora.

- [ ] **[Login] "ईमेल से लॉगिन" wording in the email expand button doesn't match CRITICAL_FEATURES manifest** — manifest expects exact text "ईमेल से लॉगिन" but code has "ईमेल से जारी रखें" — `LoginScreen.tsx:378`. The smoke test in `aangan_web/tests/smoke/login.spec.ts` may match by `data-testid` instead. **Risk:** verify the RN screen's accessibilityLabel matches the manifest's regex selector. Either update the manifest entry or sync the copy.

- [ ] **[Settings] Aangan ID card uses `fontFamily: 'Courier New'` — not in the loaded font set, falls back to system mono which looks inconsistent across Android/iOS** — `SettingsScreen.tsx:648` — switch to `Platform.select({ ios: 'Menlo', android: 'monospace' })` or load `JetBrainsMono-Regular.ttf` via expo-font. **Risk:** none.

- [ ] **[Settings] Logout uses native `Alert.alert` confirm — CRITICAL_FEATURES.md row 70 says it must use the Hindi-first `useConfirm()` dialog** — `SettingsScreen.tsx:135-151` — replace with `useConfirm({ titleHi: 'लॉगआउट करें?', titleEn: 'Logout?', confirmLabelHi: 'हाँ', cancelLabelHi: 'नहीं' })`. Background note in manifest references "Jyotsna ticket — never regress to native confirm." **Risk:** HIGH — this is explicitly called out in the manifest. Native Alert IS the regression. Verify `useConfirm` hook exists in `aangan_rn/src/components/common/` first; if not, port from `aangan_web`.

- [ ] **[Settings] No "Delete account" / "Danger Zone" in RN — CRITICAL_FEATURES.md row 72 requires it** — `SettingsScreen.tsx` lacks any `handleDeleteAccount` flow. Manifest says it's a Play/Apple App Review blocker. **Risk:** HIGH — this is a store-rejection issue. Must be implemented before next store submission. Mirror the web flow: section with typed `DELETE` confirmation → POST `/api/account/delete`. For RN we hit the same endpoint with auth cookie or call `supabase.auth.admin.deleteUser` from an edge function.

- [ ] **[Settings] Help link `helpText` color is `Colors.mehndiGreen` (line 887) — should be `Colors.brown` to match other rows; green reads as success/CTA** — `SettingsScreen.tsx:885-889` — change `color: Colors.mehndiGreen` to `Colors.brown`. **Risk:** none.

---

## P2 — Nice-to-have

- [ ] **[HomeFeed] Festival cards horizontal list — no pagination dots or progress hint** — `HomeFeedScreen.tsx:385-397` — add a small "3/12 आगामी" counter under the section title to nudge users to scroll. **Risk:** none.

- [ ] **[HomeFeed] Post-card author initial avatar is `Colors.haldiGoldLight` for everyone — looks uniform** — `HomeFeedScreen.tsx:1201` — derive a deterministic colour from user_id hash (5 brand-palette tints: haldi, mehndi, brownLight, info-blue, maybe). **Risk:** none.

- [ ] **[HomeFeed] EmptyFeed icon is `📭` mailbox — emotionally off for a family app** — `HomeFeedScreen.tsx:486` — switch to `🌱` (sprout) or `🪔` (diya). Hindi line is good ("अभी कोई पोस्ट नहीं है"). **Risk:** none.

- [ ] **[HomeFeed] Panchang ribbon line ("आज पूर्णिमा — चंद्र दर्शन का दिन") is great copy — but no CTA to share the day's specialness on WhatsApp** — `HomeFeedScreen.tsx:328-335` — add a tiny share icon on the right of the ribbon (matches CRITICAL_FEATURES "panchang-share" row). **Risk:** none — additive.

- [ ] **[FamilyTree] Relationship picker doesn't search/filter — 18 hard-coded options + scroll is clunky** — `FamilyTreeScreen.tsx:401-424` — add a `TextInput` above the list that filters by Hindi or English label. **Risk:** none.

- [ ] **[FamilyTree] AddMember submit button has no Hindi-first label when phone is empty — currently "जोड़ें (Add to Family)"** — that's good actually; leave as-is. Verify the WhatsApp invite alert also uses `useConfirm`. — `FamilyTreeScreen.tsx:979-992`. **Risk:** uses native Alert — same regression pattern as the Settings sign-out. Lower priority because no manifest entry; still worth porting.

- [ ] **[KulvrikshTree] Deceased members show grey ring but no visual indicator on the card itself (e.g. small diya next to name)** — `KulvrikshTreeView.tsx:559-579` — add `{extra?.is_deceased && <Text style={cardStyles.diya}>🪔</Text>}` next to the name. **Risk:** none. Test that the diya doesn't push the name out of `numberOfLines={1}`.

- [ ] **[KulvrikshTree] No "fit to screen" button — pinch+pan can leave the tree off-canvas** — `KulvrikshTreeView.tsx:283-291` — already has double-tap reset. Add a visible 🎯 button in the corner for grandma who won't intuit double-tap. **Risk:** none.

- [ ] **[Login] Logo `AANGAN` is 32px Poppins-700 — for a brand mark it should be the loaded Tiro Devanagari font** — `LoginScreen.tsx:610-615` — switch `logoText` to use `FontFamily.headingHindi`. The `आँगन` ("आँगन") subtitle (line 294) is already correct. **Risk:** Tiro is heading-only; check it has Latin glyphs (it does, via Devanagari roman fallback) or use a paired Devanagari+Latin display font. If unsure, keep Poppins-Bold but increase to 40px.

- [ ] **[Login] No social-proof subtitle ("10,000+ परिवार जुड़े")** — `LoginScreen.tsx:300` — under the existing subtitle, add a soft testimonial chip. **Risk:** verify the count is true before adding.

- [ ] **[Settings] Profile name truncated to single line — no last-name visible for "Krishna Kumar Mishra"** — `SettingsScreen.tsx:216` — change `numberOfLines={1}` to `numberOfLines={2}` and adjust `profileInfo.marginLeft`. **Risk:** none.

- [ ] **[Settings] Storage section removed (v0.15.8 — bootstrap pivot) but `storageStore`, `CircularProgress`, and 30+ lines of unused styles remain** — `SettingsScreen.tsx:815-846, 954-994` — flag as dead-code cleanup. **Risk:** comment in code says "remain for internal tooling / future per-family quotas." Verify with Kumar before removing.

- [ ] **[Settings] App-version footer shows "(BUILD_NUMBER)" verbatim if constants don't ship — verify both ship in prod** — `SettingsScreen.tsx:577` — already wrapped in `{}` JS expression so fine; just add a Sentry breadcrumb if either is undefined. **Risk:** none.

---

## P3 — Speculative / future

- [ ] **[FamilyTree] Tree tab could add a "generations covered" badge ("4 पीढ़ियाँ · 12 सदस्य") for emotional weight** — KulvrikshTreeView could derive this from `usedGenerations.length` and `members.length`.
- [ ] **[HomeFeed] Stories row hasn't been audited yet** — see `StoriesRow` component.
- [ ] **[Settings] Theme toggle is plain — could animate the colour palette swap with a 200ms cross-fade.**

---

## Done (recent)

- (none yet — first audit)

---

## Gen-tree Maestro-readiness audit (2026-05-17, requested by CTO)

> Anchor: M5 (60d) — Maestro E2E on the 5 critical flows.
> Scope: bottom-tab → Family → KulvrikshTreeView → tap card → MemberProfile → back → pinch zoom → double-tap reset.
> Source files: `aangan_rn/src/navigation/AppNavigator.tsx` (bottom tabs), `aangan_rn/src/screens/family/FamilyTreeScreen.tsx` (tab bar + tree mount), `aangan_rn/src/components/family/KulvrikshTreeView.tsx` (cards + gestures), `aangan_rn/src/screens/family/MemberProfileScreen.tsx` (tap target).
> Lockdown test that covers the empty→populated transition: `aangan_rn/src/__tests__/components/KulvrikshTreeView.test.tsx`.

### Interaction script (canonical happy path)

The Testing Lead can codify this verbatim in `.maestro/family-tree.yaml`. Each step lists the user gesture, the assertion, and the testID we expect to query. **Today most of those testIDs do not exist** — they are P1 adds (next section). Until they ship, Maestro must fall back to text matching, which is brittle for Hindi-first labels that change with localisation.

1. **App at home feed.** App is launched, user is signed in, lands on the Home tab.
   - Assert: bottom tab bar visible (`testID="bottom-tab-bar"` — P1 add on `AppNavigator.tsx:153` `Tab.Navigator`)
   - Assert: home tab is the active tab (`testID="bottom-tab-home"` active)
2. **Tap the Family tab.** User taps the `परिवार` (Family) icon — second bottom-tab item.
   - Action: `tapOn: { id: "bottom-tab-family" }` (P1 add on `AppNavigator.tsx:169-173` `Tab.Screen name="Family"`)
   - Fallback (no testID today): `tapOn: "परिवार"` — works because the label text is unique on screen, but breaks the moment we add a भी `परिवार` string anywhere.
3. **Tree tab is the landing tab inside Family.** v0.16.1 default is `activeTab='tree'` (FamilyTreeScreen.tsx:869).
   - Assert: `testID="family-tab-tree"` is selected (P1 add on `FamilyTreeScreen.tsx:1042-1062` `TouchableOpacity` inside `TABS.map`)
   - Assert: `testID="tree-viewport"` is visible (P1 add on `KulvrikshTreeView.tsx:349` outer `View style={styles.viewport}`)
4. **Wait for spinner to clear.** `fetchMembers()` + `fetchOfflineMembers()` resolve.
   - Assert: NOT visible — `testID="tree-loading"` (does not exist today; spinner is `RefreshControl` on FlatList only — see note for Testing Lead)
   - Assert: visible — `testID="tree-canvas"` (P1 add on `KulvrikshTreeView.tsx:351-356` `Animated.View style={[styles.canvas, ...]}`)
5. **Empty-state branch (skipped on populated test fixture).** If `members.length === 0`:
   - Assert: `testID="tree-empty-state"` visible (P1 add on `KulvrikshTreeView.tsx:332-345` empty-state View). Maestro should test this with a fresh-signup fixture in a separate flow file.
6. **Tree renders with cards.** With a populated members list (test fixture should provide at least 1 L1 + 1 L2 + 1 L3 member spanning gen -1, 0, +1):
   - Assert: at least one `testID="tree-card-{member.id}"` is visible (P1 add on `KulvrikshTreeView.tsx:545-558` `MemberCardNode` Pressable). Use `tree-card-` as a stable prefix the Testing Lead can match via `contains` predicate.
   - Assert: exactly one `testID="tree-card-you"` (P1 add on `KulvrikshTreeView.tsx:605-615` `YouCardNode` outer `View`).
   - Assert: at least one `testID="tree-generation-label-{g}"` rendered (P1 add on `KulvrikshTreeView.tsx:438-444` Text inside the `usedGenerations.map`).
7. **Tap a member card.** Pick the first non-You card by testID prefix.
   - Action: `tapOn: { id: "tree-card-<first-member-id>" }`.
   - Assert (today): nothing happens — `onMemberPress` is not wired from FamilyTreeScreen (see P0 item in main backlog: "[KulvrikshTree] No tap handler wired"). **Maestro test will fail at this step until that P0 lands.**
   - After fix: assert navigation to MemberProfile route with `testID="member-profile-screen"` (P1 add on MemberProfileScreen root view).
8. **Assert member name on MemberProfile.** The tapped member's name is visible.
   - Assert: `testID="member-profile-name"` text equals the test fixture name (P1 add on `MemberProfileScreen.tsx` display-name `Text`).
9. **Back to Family.** User taps the navigation back arrow.
   - Action: `tapOn: { id: "header-back" }` (P1 add on native-stack header back button or use the system back gesture).
   - Assert: `testID="tree-canvas"` visible again — we returned to the tree.
10. **Pinch to zoom in.** Two-finger pinch gesture, 1.5x.
    - Action: `pinchOut: { id: "tree-canvas", percentage: 50 }` (Maestro built-in pinch).
    - Assert: `tree-canvas` transform `scale > 1.4` — Maestro can't read transform directly, so the proxy is: an off-canvas card that was previously visible is now centered. Pragmatically, the assertion is `visible: tree-card-you` still holds (it should because we clamp 0.5 ≤ scale ≤ 3 in KulvrikshTreeView.tsx:271).
11. **Double-tap to reset.** Two quick taps on the You-card area.
    - Action: `doubleTapOn: { id: "tree-card-you" }` — already wired via `Gesture.Tap().numberOfTaps(2)` at KulvrikshTreeView.tsx:285-291.
    - Assert: scale returns to 1, pan returns to (0,0). Again no direct transform read in Maestro, so the proxy is: every card from the initial render is visible at its expected position.
12. **Pan the tree.** Single-finger drag to shift the canvas right by ~100px.
    - Action: `swipe: { from: tree-canvas, direction: right, duration: 300 }`.
    - Assert: a card that was off-screen-left is now visible (requires fixture with `widestRowCount > screenW / (CARD_W+COL_GAP)` — i.e. 4+ members in a single gen on iPhone SE).
13. **Switch to Members tab.** Tap the `सदस्य` tab inside FamilyTreeScreen.
    - Action: `tapOn: { id: "family-tab-members" }` (P1 add).
    - Assert: `testID="family-search-input"` visible (P1 add on `FamilyTreeScreen.tsx:1096-1104` search TextInput) — confirms the tab swap took effect.
14. **Return to tree tab.** Tap `कुलवृक्ष`.
    - Action: `tapOn: { id: "family-tab-tree" }`.
    - Assert: `testID="tree-canvas"` visible — end of canonical flow.

### TestIDs needed (P1 — design-backlog adds)

Grouped by file. Owner: whoever implements the v0.17 testability pass.

**`aangan_rn/src/navigation/AppNavigator.tsx`**
- [ ] `bottom-tab-bar` — on the `Tab.Navigator` (line 153) via `screenOptions={{ tabBarTestID: ... }}` per-tab, or on the surrounding `View`.
- [ ] `bottom-tab-home` — `Tab.Screen name="Home"` options `{ tabBarTestID: 'bottom-tab-home' }` (line 165-168).
- [ ] `bottom-tab-family` — same on `Tab.Screen name="Family"` (line 169-173). **HIGHEST PRIORITY** — this is the entry point of every family-tree test.
- [ ] `bottom-tab-compose` — line 174-184.
- [ ] `bottom-tab-events` — line 185-189.
- [ ] `bottom-tab-notifications` — line 190-194.
- [ ] `bottom-tab-settings` — line 195-199.

**`aangan_rn/src/screens/family/FamilyTreeScreen.tsx`**
- [ ] `family-screen-root` — outermost `<View style={styles.screen}>` at line 1038.
- [ ] `family-tab-tree` / `family-tab-members` / `family-tab-events` — `TouchableOpacity` inside the `TABS.map` at line 1042-1062. Use `tab.key` to derive the testID.
- [ ] `family-level-chip-all` / `family-level-chip-l1` / `-l2` / `-l3` — `TouchableOpacity` inside `LEVEL_CHIPS.map` at line 1070-1087.
- [ ] `family-search-input` — TextInput at line 1096-1104.
- [ ] `family-search-clear` — TouchableOpacity at line 1111-1119.
- [ ] `family-fab-add` — `TouchableOpacity` for "जोड़ें" at line 1183-1192.
- [ ] `family-fab-invite-whatsapp` — `TouchableOpacity` for "WhatsApp आमंत्रण" at line 1193-1202.
- [ ] `family-add-member-modal` — Modal at line 1207-1214 (use `testID` on the Modal's container View).

**`aangan_rn/src/components/family/KulvrikshTreeView.tsx`**
- [ ] `tree-viewport` — outer `View style={styles.viewport}` at line 349. Marks "we entered the tree".
- [ ] `tree-canvas` — `Animated.View style={[styles.canvas...]}` at line 351-356. Pinch/pan/double-tap targets attach here.
- [ ] `tree-empty-state` — empty-state View at line 332-345 (the 🪔 Build your Kulvriksh screen).
- [ ] `tree-card-{member.id}` — `MemberCardNode` Pressable at line 545-558. Use the prop `member.id` (already prefixed `offline-` for offline rows, so it stays unique).
- [ ] `tree-card-you` — `YouCardNode` outer View at line 605-615.
- [ ] `tree-generation-label-{g}` — Text at line 438-444 inside `usedGenerations.map`. Use the signed generation offset (`-2`, `-1`, `0`, `1`, `2`) — testIDs CAN contain hyphens but not signs, so prefix negatives as `gen-minus-1` / `gen-0` / `gen-plus-1`.
- [ ] `tree-hint-chip` — `View style={styles.hintChip}` at line 493-499. Currently `pointerEvents="none"`; we don't tap it but assert it disappears after first interaction (P3 polish).
- [ ] `tree-fab-zoom-reset` — does NOT exist today. Backlog P2 item ("No 'fit to screen' button") on line 72 of this file already requests it; when we add the 🎯 button, give it `testID="tree-fab-zoom-reset"` so Maestro can call reset without relying on the double-tap gesture (which Maestro can dispatch but is fragile across iOS/Android timing).

**`aangan_rn/src/screens/family/MemberProfileScreen.tsx`** (file not yet read in detail — these are based on the route signature)
- [ ] `member-profile-screen` — root SafeAreaView/View.
- [ ] `member-profile-name` — the display-name Text.
- [ ] `member-profile-relationship` — the `relationshipLabel` Text.
- [ ] `member-profile-back` — header back button (or rely on native-stack `headerBackTestID` option).
- [ ] `member-profile-chat-button` — the "बातचीत शुरू करें" CTA at line 246 (`navigation.navigate(...otherUserId...)`).

### Notes for Testing Lead

1. **The current `KulvrikshTreeView` wraps content in nested `ScrollView` ONLY in the legacy `FamilyTreeVisualization` (lines 610-611 of FamilyTreeScreen.tsx)** — the active tree (`KulvrikshTreeView`) does NOT use ScrollView; it uses pinch + pan via `react-native-gesture-handler` on an `Animated.View`. Maestro's `scrollUntilVisible` will NOT work to find off-canvas cards. Use `swipe` (pan) or `pinchIn/pinchOut` (zoom) instead. If a card is genuinely off-canvas, the test fixture should be sized to keep it on-canvas at scale=1.

2. **The lockdown test at `aangan_rn/src/__tests__/components/KulvrikshTreeView.test.tsx` covers the empty→populated transition** (the v0.16.1 Rules-of-Hooks regression). Jest is fine for unit-level coverage, but Maestro adds the missing layer: real gesture dispatch on a real device, navigation transitions, and the tab→tree→profile journey. Both layers should stay green; neither replaces the other.

3. **Synthetic IDs from offline members** are prefixed `offline-` (FamilyTreeScreen.tsx:896). The `tree-card-{member.id}` testID will therefore look like `tree-card-offline-abc123` for offline rows. That's fine for Maestro; just document it so test authors know prefixes vary. The downstream MemberProfile route may NOT handle synthetic IDs today (it queries `users` table by `eq('id', memberId)` at MemberProfileScreen.tsx:199) — see the existing P0 item "verify MemberProfile route accepts both real and synthetic IDs."

4. **Hindi label fallback for Maestro.** Until testIDs land, the most stable text selectors are:
   - Bottom tab: `परिवार` (unique in app).
   - Tab bar inside Family: `कुलवृक्ष` / `सदस्य` / `जीवन यात्रा`.
   - Empty state title: `अपना कुलवृक्ष बनाएँ`.
   - Hint chip: `चुटकी से zoom · दो-बार-tap reset` (NOTE: backlog P1 says we're changing this copy to `दो उँगलियों से ज़ूम करें · दो बार टैप करें reset` — Maestro will need an update when the copy ships).
   - Generation labels: `दादा-दादी / नाना-नानी`, `माता-पिता / चाचा-बुआ`, `आप, जीवनसाथी, भाई-बहन`, `बच्चे / भतीजे-भांजे`, `पोते-पोती / नाती-नातिन`.
   These are localisation-fragile; the language store toggles to English on tap (see `useLanguageStore`). The Maestro test should pin language to Hindi via a pre-flight `clearState` + auth-fixture step.

5. **`Gesture.Tap().numberOfTaps(2)` works in Maestro,** but the double-tap target is currently the entire `Animated.View` canvas (not a discrete button). On Android, Maestro's `doubleTapOn` debounces at 200ms; on iOS, 300ms. Tests will be flaky without an explicit reset button — hence the P2 backlog request for `tree-fab-zoom-reset`. Recommend the Testing Lead either (a) waits for the FAB to land, or (b) wraps the double-tap in a retry loop with a 500ms inter-tap delay and asserts state via card-position fallbacks.

6. **Pinch gesture limits** are clamped to `[0.5, 3]` (KulvrikshTreeView.tsx:271). Maestro pinches beyond that range are silently capped — the test should not assert a scale > 3.

7. **No accessibility identifiers today.** Some `accessibilityLabel`s exist (e.g. tab `accessibilityLabel={\`${tab.label} ${tab.labelEn}\`}` at FamilyTreeScreen.tsx:1052). Maestro can match on `accessibilityLabel` as a fallback but iOS-only; on Android the equivalent is `content-description` which RN sets from the same prop. If we don't get the testID pass in time, Maestro tests can lean on `accessibilityLabel`-based matching with the caveat that any localisation change in Hindi/English breaks the selectors.

8. **Recommended test-fixture shape** for `.maestro/family-tree.yaml`:
   - 1 authenticated user (Kumar dev account or a test account).
   - Pre-seeded `family_members`: 1 grandparent (gen -2), 2 parents (gen -1), 1 sibling (gen 0), 2 children (gen +1). That guarantees every generation row except gen +2 renders, and `widestRowCount = 2` ≤ iPhone-SE width so the tree fits without pan.
   - Optional: 1 offline member with `is_deceased=true` so the deceased-ring branch (KulvrikshTreeView.tsx:540-542) is exercised.

### Suggested execution order
1. Land all `bottom-tab-*` + `family-tab-*` + `tree-canvas` testIDs first (5 min of mechanical edits, no behavior change). Maestro can then run steps 1-6 and 13-14 of the script today.
2. Land the P0 `onMemberPress` wiring (already in main backlog) plus `tree-card-{id}` + `member-profile-*` testIDs. Unblocks steps 7-9.
3. Optional: add `tree-fab-zoom-reset` FAB (P2 polish) for sturdier pinch/reset tests. Until then, gestures-only steps 10-12 stay in the flaky bucket.

End-state DoD: a single `.maestro/family-tree.yaml` that runs end-to-end on iOS + Android in CI, with zero text-based selectors and zero `sleep` calls between gestures.

---

## Quick-wins — Top-3 to ship if Kumar gives you 1 hour tomorrow

1. **P0 Hindi-JSX-wrap audit on LoginScreen + add a guard test** — biggest regression-risk class (CLAUDE.md 2026-05-03 rule). 20-30 min of mechanical edits across `LoginScreen.tsx` + ~15 min to write `aangan_rn/__tests__/hindi-jsx-no-bare.test.ts` that greps `src/screens/**/*.tsx` for bare `<Text>…[ऀ-ॿ]…</Text>`. Catches the Google-button class of bug forever.

2. **P0 KulvrikshTree card-text bump to 15/13 px + wire `onMemberPress` to MemberProfile** — `KulvrikshTreeView.tsx:783, 799` + `FamilyTreeScreen.tsx:1143-1151`. ~20 min including verifying offline-id route handling. Makes the freshly-refactored tree (the "wow feature") tappable AND readable — closes the biggest Dadi-Test miss on a screen Kumar specifically called out as "looks like a newbie's job" last week.

3. **P1 Settings sign-out → `useConfirm()` (Hindi-first dialog)** — `SettingsScreen.tsx:135-151`. This is explicitly in `CRITICAL_FEATURES.md` row 70 as the Jyotsna ticket regression to never repeat. Find or port `useConfirm` from web (~15 min), replace the native Alert (~5 min), add a structural test that `Alert.alert` is NOT imported into SettingsScreen for the signOut path (~10 min). Total ~30 min and closes a manifest item.
