#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-critical-rn.mjs — RN analogue of aangan_web/scripts/check-critical-features.mjs.
//
// Why this exists:
//   Aangan has had 3 regressions in 7 weeks where unrelated refactors silently
//   removed UI elements (Google sign-in v0.10.1, etc.). The web side already
//   has a fast pre-build guardrail; this is the same protection for RN.
//
// How it works:
//   1. Reads CRITICAL_FEATURES.md to confirm the manifest still lives.
//   2. The MANIFEST below lists each cross-platform feature, the source file
//      it lives in, and one or more "must-have" markers (literal string or
//      regex) that must appear there.
//   3. Reads each source file; reports any missing marker; exits non-zero.
//
// Scope: covers UI features OTHER THAN the four v0.16.1 lockdowns already
// asserted by aangan_rn/src/__tests__/structural/v0_16_1_lockdown.test.ts
// (default tab=tree, name-first Add Member, special-today ribbon, no Storage/
// Referral routes). This file picks up Google sign-in, phone OTP, language
// toggle, sign-out confirm, account-delete readiness, WhatsApp invite, FAB,
// notification bell, panchang widget.
//
// To bypass intentionally (you removed a feature on purpose):
//   1. Update CRITICAL_FEATURES.md and explain in the commit message.
//   2. Remove the matching MANIFEST entry below (same PR).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RN = resolve(ROOT, 'aangan_rn');

// Sanity-check the manifest still exists. If someone deletes
// CRITICAL_FEATURES.md, this script's protection layer evaporates — fail loud.
const MANIFEST_PATH = resolve(ROOT, 'CRITICAL_FEATURES.md');
if (!existsSync(MANIFEST_PATH)) {
  console.error('🚨 CRITICAL_FEATURES.md is missing at the repo root. Restore it before continuing.');
  process.exit(1);
}

/**
 * Each entry asserts the feature exists in the named RN source file.
 * - `markers` are strings (or regex) that MUST appear somewhere in the file.
 * - `mustNotMatch` is the inverse — assert the pattern is NOT present.
 */
const MANIFEST = [
  // Login surface — the v0.10.1 class of regression (Google button) plus the
  // rest of the auth UX every Indian user depends on.
  {
    surface: 'auth/LoginScreen',
    file: 'src/screens/auth/LoginScreen.tsx',
    markers: [
      { name: 'Google sign-in handler', match: 'handleGoogleSignIn' },
      { name: 'Google OAuth provider call', match: /provider:\s*['"]google['"]/ },
      { name: 'Google button onPress wired', match: /onPress=\{handleGoogleSignIn\}/ },
      { name: 'Google label visible (Hindi)', match: 'Google से जारी रखें' },
      { name: 'Phone OTP path (sendOtp)', match: 'sendOtp' },
      { name: '+91 country code prefix', match: '+91' },
      { name: 'Email OTP fallback', match: 'sendEmailOtp' },
      { name: 'Language toggle (Hindi/English)', match: 'toggleLanguage' },
    ],
  },

  // Settings — sign-out must use Alert.alert with a "destructive" option, NOT
  // a silent signOut(). Also: account-delete is a Play/Apple compliance
  // requirement; RN currently has it as i18n strings only, so we assert the
  // strings exist (so they don't drift away) but the in-app flow is tracked
  // separately as TODO. (See CRITICAL_FEATURES.md /(app)/settings.)
  {
    surface: 'settings/SettingsScreen',
    file: 'src/screens/settings/SettingsScreen.tsx',
    markers: [
      { name: 'signOut from authStore', match: /signOut.*useAuthStore|useAuthStore\(\)/ },
      { name: 'Sign-out confirm via Alert.alert', match: /Alert\.alert\([\s\S]{0,200}(लॉगआउट|Logout)/ },
      { name: 'Destructive option on sign-out', match: /style:\s*['"]destructive['"]/ },
      { name: 'Awaits signOut() inside confirm handler', match: /await\s+signOut\(\)/ },
    ],
  },

  // Account-delete i18n keys — must exist somewhere so the future in-app
  // delete flow has its labels ready. Tracks the Play/Apple compliance gap.
  {
    surface: 'i18n/delete-account-strings',
    file: 'src/i18n/hi.ts',
    markers: [
      { name: 'Hindi delete_account label', match: 'delete_account' },
      { name: 'Hindi delete_account_confirm copy', match: 'delete_account_confirm' },
    ],
  },
  {
    surface: 'i18n/delete-account-strings-en',
    file: 'src/i18n/en.ts',
    markers: [
      { name: 'English delete_account label', match: 'delete_account' },
      { name: 'English delete_account_confirm copy', match: 'delete_account_confirm' },
    ],
  },

  // Family tree — Add Member entry, WhatsApp invite, and the tree tab.
  // (The "default tab = tree" and "name-first form" invariants are covered
  // by v0_16_1_lockdown.test.ts — we don't duplicate them here.)
  {
    surface: 'family/FamilyTreeScreen',
    file: 'src/screens/family/FamilyTreeScreen.tsx',
    markers: [
      { name: 'Family emoji marker (👨‍👩‍👧‍👦)', match: '👨‍👩‍👧‍👦' },
      { name: 'WhatsApp invite (deep link)', match: 'whatsapp://send' },
      { name: 'WhatsApp invite accessibilityLabel', match: /accessibilityLabel=["']Invite via WhatsApp["']/ },
      { name: 'Add-family-member invite button', match: /accessibilityLabel=["']Invite family member["']/ },
    ],
  },

  // Home feed — composer FAB ("+"), notification bell, PanchangWidget with
  // date + tithi pairing. These are the three things Kumar's Dadi-test users
  // rely on every session.
  {
    surface: 'home/HomeFeedScreen',
    file: 'src/screens/home/HomeFeedScreen.tsx',
    markers: [
      { name: 'PanchangWidget rendered', match: '<PanchangWidget />' },
      { name: 'Panchang date + tithi pairing', match: /englishDate[\s\S]{0,80}panchang\.tithi/ },
      { name: 'Notification bell icon', match: '🔔' },
      { name: 'FAB style defined', match: /fab:\s*\{/ },
      { name: 'FAB navigates to PostComposer', match: /navigation\.navigate\(['"]PostComposer['"]\)/ },
      { name: 'FAB "+" glyph', match: /fabText[\s\S]{0,60}\{['"]\+['"]\}/ },
      { name: 'Composer prompt card present', match: 'ComposerPrompt' },
    ],
  },
];

const errors = [];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const entry of MANIFEST) {
  const path = resolve(RN, entry.file);
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch (e) {
    errors.push(`MISSING FILE: ${entry.file} (surface ${entry.surface}) — ${e.message}`);
    continue;
  }

  for (const marker of entry.markers) {
    if (marker.match) {
      const re = marker.match instanceof RegExp ? marker.match : new RegExp(escapeRegex(marker.match));
      if (!re.test(src)) {
        errors.push(`REGRESSION: ${entry.surface} — "${marker.name}" not found in ${entry.file}`);
      }
    }
    if (marker.mustNotMatch) {
      const re = marker.mustNotMatch instanceof RegExp ? marker.mustNotMatch : new RegExp(escapeRegex(marker.mustNotMatch));
      if (re.test(src)) {
        errors.push(`REGRESSION: ${entry.surface} — "${marker.name}" forbidden pattern present in ${entry.file}`);
      }
    }
  }
}

const totalMarkers = MANIFEST.reduce((n, e) => n + e.markers.length, 0);

if (errors.length === 0) {
  console.log(`✅ check-critical-rn: ${totalMarkers} markers across ${MANIFEST.length} RN surfaces — all present.`);
  process.exit(0);
}

console.error('');
console.error('🚨 check-critical-rn FAILED — a critical RN UI feature appears to have been removed.');
console.error('');
for (const err of errors) console.error('  ' + err);
console.error('');
console.error(`Checked ${totalMarkers} markers across ${MANIFEST.length} surfaces. ${errors.length} failure(s).`);
console.error('');
console.error('What to do:');
console.error('  1. If this was an accidental removal: restore the feature in the source file.');
console.error('  2. If you intentionally removed it: update CRITICAL_FEATURES.md AND this');
console.error('     script\'s MANIFEST in the same commit, and call out the removal in your');
console.error('     commit message.');
console.error('');
console.error('See CRITICAL_FEATURES.md for the full manifest.');
process.exit(1);
