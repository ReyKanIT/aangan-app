/**
 * Structural lockdown tests for v0.16.1 fixes — Tier T1 of the regression suite.
 *
 * These tests read SOURCE FILES directly and assert structural invariants
 * (presence of an option, a default value, a hidden toggle being gone, etc.).
 * They run in milliseconds because nothing renders.
 *
 * Each lockdown corresponds to a real bug Kumar reported on 2026-05-17.
 * If a future edit accidentally undoes the fix, the test fails before commit.
 *
 * Why source-level: rendering FamilyTreeScreen requires a full navigation +
 * stores context (heavy). The bug class we want to prevent — "someone deletes
 * the fix in a refactor" — is exactly what a source-string assertion catches.
 *
 * This is the SAME pattern as `aangan_web/scripts/check-critical-features.mjs`
 * for the web app, ported to Jest for the RN side.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '..', '..');

function read(rel: string): string {
  return readFileSync(resolve(SRC, rel), 'utf8');
}

describe('v0.16.1 fixes — structural lockdown', () => {
  describe('Bug #1: Family tree default tab', () => {
    const f = read('screens/family/FamilyTreeScreen.tsx');

    it("default tab is 'tree' (not 'all' grid)", () => {
      expect(f).toMatch(/useState<TabKey>\(\s*['"]tree['"]\s*\)/);
    });

    it('has exactly 3 main tabs (collapsed from 6)', () => {
      // The TABS array has one entry per tab. Count keys present in the array literal.
      const tabsBlock = f.match(/const TABS:[^=]+=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
      const keyMatches = tabsBlock.match(/key:\s*['"][^'"]+['"]/g) ?? [];
      expect(keyMatches).toHaveLength(3);
    });

    it("'tree' is one of the 3 main tabs", () => {
      expect(f).toMatch(/key:\s*['"]tree['"]/);
    });

    it('L1/L2/L3/All are exposed as LEVEL_CHIPS inside Members tab, not as main tabs', () => {
      expect(f).toMatch(/LEVEL_CHIPS/);
      const chipsBlock = f.match(/const LEVEL_CHIPS:[^=]+=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
      expect(chipsBlock).toMatch(/key:\s*['"]L1['"]/);
      expect(chipsBlock).toMatch(/key:\s*['"]L2['"]/);
      expect(chipsBlock).toMatch(/key:\s*['"]L3['"]/);
      expect(chipsBlock).toMatch(/key:\s*['"]all['"]/);
    });
  });

  describe('Bug #2: Add Member name-first form', () => {
    const f = read('screens/family/FamilyTreeScreen.tsx');

    it('Name field is the first labelled field in the modal body', () => {
      // The order in which fieldLabel text appears in the JSX = the order on screen.
      // Find all fieldLabel rendering calls and assert "Name" comes before "Phone".
      const body = f.match(/<ScrollView style={modalStyles\.body}[\s\S]+?<\/ScrollView>/)?.[0] ?? '';
      expect(body).toBeTruthy();
      const nameIdx = body.search(/['"]नाम — ज़रूरी['"]|['"]Name — required['"]/);
      const phoneIdx = body.search(/['"]फोन नंबर \(वैकल्पिक\)['"]|['"]Phone \(optional\)['"]/);
      expect(nameIdx).toBeGreaterThan(-1);
      expect(phoneIdx).toBeGreaterThan(-1);
      expect(nameIdx).toBeLessThan(phoneIdx);
    });

    it('phone is optional — submit routes to offline when phone is empty', () => {
      expect(f).toMatch(/onSubmitOffline\(\{[\s\S]+?\}\)/);
      expect(f).toMatch(/phoneTrim\.length\s*>\s*0/);
    });

    it('the old AddMemberMode online/offline toggle is gone', () => {
      // The fix replaced the mode toggle with a single form. If anyone
      // re-adds the toggle, this lockdown fails.
      expect(f).not.toMatch(/type AddMemberMode\s*=\s*['"]online['"]\s*\|\s*['"]offline['"]/);
      expect(f).not.toMatch(/\bsetMode\(/);
    });
  });

  describe('Bug #3: Home page "what\'s special today" ribbon', () => {
    const home = read('screens/home/HomeFeedScreen.tsx');
    const service = (() => {
      try { return read('services/panchangService.ts'); } catch { return ''; }
    })();

    it('PanchangWidget consumes computeSpecialToday from panchangService', () => {
      // The logic was extracted from HomeFeedScreen → panchangService in v0.16.1
      // (Testing Lead refactor) so it can be unit-tested directly. HomeFeed
      // must IMPORT and USE the helper; the helper must EXIST + look at
      // festivals + special tithis.
      expect(home).toMatch(/import\s*\{[^}]*\bcomputeSpecialToday\b[^}]*\}\s*from\s*['"][^'"]*panchangService/);
      expect(home).toMatch(/\bcomputeSpecialToday\s*\(/);
      expect(service).toMatch(/export\s+function\s+computeSpecialToday/);
      expect(service).toMatch(/getUpcomingFestivals|FESTIVALS_2026/);
      expect(service).toMatch(/पूर्णिमा|अमावस्या|एकादशी/);
    });

    it('specialToday ribbon is rendered inside PanchangWidget', () => {
      expect(home).toMatch(/specialRibbon/);
      expect(home).toMatch(/panchangStyles\.specialRibbon/);
    });

    it('helper falls back to null on a regular day (no festival, no special tithi)', () => {
      // The function body must include a `return null` path. If a future edit
      // makes it always return a value, this fails — we want the ribbon to
      // disappear cleanly on regular days, not show empty / lorem text.
      const fnBody = service.match(/export\s+function\s+computeSpecialToday[\s\S]+?\n\}/)?.[0] ?? '';
      expect(fnBody).toMatch(/return\s+null\s*;/);
    });
  });

  describe('Bug #4: Storage / Referral routes removed from navigator', () => {
    const f = read('navigation/AppNavigator.tsx');

    it('does NOT register the Storage stack screen', () => {
      expect(f).not.toMatch(/<Stack\.Screen\s+name=["']Storage["']/);
    });

    it('does NOT register the Referral stack screen', () => {
      expect(f).not.toMatch(/<Stack\.Screen\s+name=["']Referral["']/);
    });

    it("does NOT declare 'Storage' or 'Referral' in RootStackParamList", () => {
      // The type only lists ROUTABLE screens. If anyone re-adds Storage
      // here, the route is reachable again — fail loudly.
      const paramListBlock = f.match(/export type RootStackParamList\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
      expect(paramListBlock).not.toMatch(/^\s*Storage:\s/m);
      expect(paramListBlock).not.toMatch(/^\s*Referral:\s/m);
    });
  });

  describe('Design Lead quick-win #2: Sign-out uses useConfirm, not Alert.alert', () => {
    // Jyotsna ticket — never regress to native confirm. The sign-out
    // confirmation must come from the Hindi-first useConfirm dialog,
    // not from the system Alert.alert. CRITICAL_FEATURES.md tracks
    // this; this lockdown enforces it at the source level.
    const settings = read('screens/settings/SettingsScreen.tsx');

    it('imports useConfirm from components/common', () => {
      expect(settings).toMatch(
        /import\s*\{[^}]*\buseConfirm\b[^}]*\}\s*from\s*['"][^'"]*components\/common\/useConfirm['"]/,
      );
    });

    it("handleLogout does NOT call Alert.alert (would be a regression)", () => {
      // Pull the body of handleLogout — bounded by its closing
      // `}, [deps]);` line so we don't accidentally grep the whole
      // file (Alert.alert is still legitimately used for the Aangan
      // ID "Copied" toast elsewhere).
      const fnBody =
        settings.match(/const\s+handleLogout\s*=\s*useCallback\([\s\S]+?\}\s*,\s*\[[^\]]*\]\s*\)\s*;/)?.[0] ?? '';
      expect(fnBody).toBeTruthy();
      expect(fnBody).not.toMatch(/Alert\.alert\s*\(/);
    });

    it('handleLogout awaits confirm({ ... destructive: true })', () => {
      const fnBody =
        settings.match(/const\s+handleLogout\s*=\s*useCallback\([\s\S]+?\}\s*,\s*\[[^\]]*\]\s*\)\s*;/)?.[0] ?? '';
      expect(fnBody).toMatch(/await\s+confirm\s*\(/);
      expect(fnBody).toMatch(/destructive:\s*true/);
    });

    it("the rendered tree mounts {confirmDialog} (otherwise the dialog never shows)", () => {
      expect(settings).toMatch(/\{confirmDialog\}/);
    });
  });

  describe('Forced "Invite 3 family members" onboarding (v0.16.1 growth bet)', () => {
    // This is the CEO + CMO #1 priority for the 10K-MAU push. Silent removal
    // would tank the projected k-factor lift (0.25 → 0.55+). Lockdown is
    // source-level so it runs in milliseconds and can't be tricked by a
    // stubbed component.

    it('InviteThreeFamily is in the RootStackParamList', () => {
      // Note: can't use a non-greedy regex to slice the RootStackParamList
      // block because some entries have nested `{ ... }` (e.g. OTP, Chat),
      // which truncate the match. Just assert the line exists at any indent.
      const nav = read('navigation/AppNavigator.tsx');
      expect(nav).toMatch(/^\s*InviteThreeFamily:\s/m);
    });

    it('InviteThreeFamily is registered as a Stack.Screen in the navigator', () => {
      const nav = read('navigation/AppNavigator.tsx');
      expect(nav).toMatch(/<Stack\.Screen\s+name=["']InviteThreeFamily["']/);
    });

    it('ProfileSetupScreen navigates to InviteThreeFamily on completion (not directly to Main)', () => {
      const profile = read('screens/auth/ProfileSetupScreen.tsx');
      // The success path of handleSave must `replace('InviteThreeFamily')`.
      // If anyone re-points it at 'Main', the forced gate is bypassed and
      // the growth bet is silently broken.
      expect(profile).toMatch(/navigation\.replace\(\s*['"]InviteThreeFamily['"]\s*\)/);
    });

    it('the InviteThreeFamily screen file declares all 3 pre-filled relationship strings', () => {
      const screen = read('screens/auth/InviteThreeFamilyScreen.tsx');
      // Hindi-first labels per CMO spec. JSX wrapping is enforced separately
      // (Hindi-in-JSX-must-be-in-{'...'} rule); here we just confirm the
      // literal strings have not been deleted in a future "refactor".
      expect(screen).toContain('पिताजी');
      expect(screen).toContain('माँ');
      expect(screen).toContain('भाई-बहन');
    });

    it('the InviteThreeFamily screen wires all 5 funnel events', () => {
      const screen = read('screens/auth/InviteThreeFamilyScreen.tsx');
      expect(screen).toMatch(/forced_invite_shown/);
      expect(screen).toMatch(/forced_invite_phone_filled/);
      expect(screen).toMatch(/forced_invite_whatsapp_sent/);
      expect(screen).toMatch(/forced_invite_continued/);
      expect(screen).toMatch(/forced_invite_skipped/);
    });
  });

  // v0.16.2 — Kumar couple-pair feature (2026-05-18). Husband-wife pairs
  // render as a paired unit; children attach to the couple midpoint. The
  // lockdown asserts the structural pieces are still in place: helper is
  // exported, source contains the couple-render marker, and the new memos
  // sit ABOVE the empty-state early return (Rules-of-Hooks invariant).
  describe('v0.16.2: husband-wife couple-pair rendering', () => {
    const tree = read('components/family/KulvrikshTreeView.tsx');

    it('exports detectCouples for reuse', () => {
      expect(tree).toMatch(/export\s+function\s+detectCouples\s*\(/);
    });

    it('declares the CoupleSlot type publicly', () => {
      expect(tree).toMatch(/export\s+interface\s+CoupleSlot/);
    });

    it('contains the couple-pair render marker (couplePairWrapper style)', () => {
      expect(tree).toMatch(/couplePairWrapper/);
    });

    it('detectCouples handles the You+spouse case (gen 0)', () => {
      expect(tree).toMatch(/['"]you\+spouse['"]/);
    });

    it('detectCouples handles parents (father+mother) at gen -1', () => {
      expect(tree).toMatch(/['"]father\+mother['"]/);
    });

    it('detectCouples handles grandparents at gen -2', () => {
      expect(tree).toMatch(/['"]paternal-grandparents['"]/);
      expect(tree).toMatch(/['"]maternal-grandparents['"]/);
    });

    it('new couple-detection memos sit ABOVE the empty-state early return', () => {
      // Rules-of-Hooks lockdown — the empty-state `if (members.length === 0)`
      // must remain after every hook call. If a future refactor moves any
      // useMemo below it, hook count flips between empty / populated renders
      // and Hermes throws "Rendered more hooks than during the previous
      // render" (the v0.16.1 incident).
      const emptyReturnIdx = tree.search(/if\s*\(\s*members\.length\s*===\s*0\s*\)/);
      expect(emptyReturnIdx).toBeGreaterThan(-1);
      const couplesMemoIdx = tree.search(/useMemo\(\(\)\s*=>\s*detectCouples\(/);
      expect(couplesMemoIdx).toBeGreaterThan(-1);
      expect(couplesMemoIdx).toBeLessThan(emptyReturnIdx);
    });
  });

  // v0.16.3 — Direct tree editing (Kumar directive 2026-05-18 8:48 IST).
  // Long-press a tree card → action sheet → contextual add/edit/remove.
  // Lockdown asserts the structural pieces are in place so a future refactor
  // can't silently rip them out.
  describe('v0.16.3: direct tree editing (long-press action sheet)', () => {
    const tree = read('components/family/KulvrikshTreeView.tsx');
    const screen = read('screens/family/FamilyTreeScreen.tsx');
    const store = read('stores/familyStore.ts');
    const funnel = read('utils/funnelEvents.ts');

    it('KulvrikshTreeView declares the onMemberLongPress prop', () => {
      expect(tree).toMatch(/onMemberLongPress\?:\s*\(m:\s*FamilyMember\)\s*=>\s*void/);
    });

    it('KulvrikshTreeView declares the onYouLongPress prop', () => {
      expect(tree).toMatch(/onYouLongPress\?:\s*\(\s*\)\s*=>\s*void/);
    });

    it('KulvrikshTreeView wires onLongPress on Pressable in MemberCardNode', () => {
      expect(tree).toMatch(/onLongPress=\{onLongPress\s*\?\s*\(\)\s*=>\s*onLongPress\(member\)/);
    });

    it('KulvrikshTreeView wires onLongPress on the YouCardNode Pressable', () => {
      // YouCardNode is now a Pressable (not a View) so it can handle the
      // long-press gesture for the "You — actions" sheet.
      expect(tree).toMatch(/function YouCardNode[\s\S]+?<Pressable/);
    });

    it('FamilyTreeScreen imports TreeCardActionSheet from components/family', () => {
      expect(screen).toMatch(
        /import\s+TreeCardActionSheet[\s\S]+?from\s+['"][^'"]*components\/family\/TreeCardActionSheet['"]/,
      );
    });

    it('FamilyTreeScreen imports useConfirm for the Remove flow', () => {
      expect(screen).toMatch(
        /import\s+useConfirm\s+from\s+['"][^'"]*components\/common\/useConfirm['"]/,
      );
    });

    it('FamilyTreeScreen renders <TreeCardActionSheet> in its JSX', () => {
      expect(screen).toMatch(/<TreeCardActionSheet[\s\S]+?\/>/);
    });

    it('FamilyTreeScreen mounts {confirmDialog} (otherwise Remove confirm never shows)', () => {
      expect(screen).toMatch(/\{confirmDialog\}/);
    });

    it('AddMemberModal accepts prefilledRelationship + lockedRelationship props', () => {
      expect(screen).toMatch(/prefilledRelationship\?\s*:\s*string/);
      expect(screen).toMatch(/lockedRelationship\?\s*:\s*boolean/);
    });

    it('familyStore exports deleteMember + deleteOfflineMember', () => {
      expect(store).toMatch(/deleteMember:\s*\(/);
      expect(store).toMatch(/deleteOfflineMember:\s*\(/);
    });

    it('familyStore exports updateMember + updateOfflineMember', () => {
      expect(store).toMatch(/updateMember:\s*\(/);
      expect(store).toMatch(/updateOfflineMember:\s*\(/);
    });

    it('funnelEvents declares all 7 tree-editing event names', () => {
      expect(funnel).toMatch(/tree_card_longpress/);
      expect(funnel).toMatch(/tree_add_child_from_card/);
      expect(funnel).toMatch(/tree_add_spouse_from_card/);
      expect(funnel).toMatch(/tree_add_parent_from_card/);
      expect(funnel).toMatch(/tree_edit_relationship/);
      expect(funnel).toMatch(/tree_edit_name/);
      expect(funnel).toMatch(/tree_remove_member/);
    });

    it('Rules-of-Hooks: KulvrikshTreeView new longpress wiring stays ABOVE empty-state early return', () => {
      // No new hook can be added below the empty-state check. We assert
      // that nothing matches `useMemo|useCallback|useState` BETWEEN the
      // empty-state `if (...)` and the final `return (` of the component.
      const emptyReturnIdx = tree.search(/if\s*\(\s*members\.length\s*===\s*0\s*\)/);
      const renderReturnIdx = tree.search(/\/\/\s*──\s*render/);
      expect(emptyReturnIdx).toBeGreaterThan(-1);
      expect(renderReturnIdx).toBeGreaterThan(emptyReturnIdx);
      const between = tree.slice(emptyReturnIdx, renderReturnIdx);
      // Allow `return` keyword but no hook calls in between.
      expect(between).not.toMatch(/\buseMemo\s*\(/);
      expect(between).not.toMatch(/\buseCallback\s*\(/);
      expect(between).not.toMatch(/\buseState\s*\(/);
    });
  });

  describe('CRITICAL_FEATURES: login surfaces always present', () => {
    // Echoes the highest-priority feature from CRITICAL_FEATURES.md: Google
    // sign-in. The v0.10.1 regression that lost ~7 days of Google signups
    // would have been caught by this.
    const auth = (() => {
      try {
        return read('screens/auth/AuthScreen.tsx');
      } catch {
        try { return read('screens/auth/LoginScreen.tsx'); } catch { return ''; }
      }
    })();

    it('login screen renders SOMETHING with "Google" in it', () => {
      // We don't pin the exact text — that's brittle. Just assert "Google"
      // is present somewhere in the auth screen. If it disappears entirely,
      // we know.
      if (auth) expect(auth).toMatch(/Google/);
    });

    it('login screen has a phone-OTP path (the Indian-mobile default)', () => {
      if (auth) expect(auth).toMatch(/phone|फोन|OTP/i);
    });
  });
});
