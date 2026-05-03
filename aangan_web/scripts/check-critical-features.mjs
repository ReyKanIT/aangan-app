#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-critical-features.mjs — fail the build if any feature in
// CRITICAL_FEATURES.md disappears from the source.
//
// Why this exists:
//   On 2026-04-26 v0.10.1 silently stripped the Google sign-in button while
//   fixing an unrelated bug. The regression survived 12+ commits before being
//   caught. This script is the cheap, fast guardrail that prevents the same
//   class of regression from recurring.
//
// How it works:
//   1. The MANIFEST below lists each critical feature: a route, the file(s)
//      that contain it, and one or more "must-have" markers (string or regex).
//   2. We read each source file and confirm every marker is present.
//   3. If any marker is missing → exit 1, build fails. CI / Vercel won't ship.
//
// Why not Playwright/Cypress/etc:
//   - This script runs in <100ms with zero deps, no browser, no flakes.
//   - It catches exactly the class of bug we're trying to prevent (UI element
//     stripped from source) without the maintenance cost of full E2E.
//   - When we eventually need real-browser smoke tests, this still serves as
//     the fast pre-flight check that gates the build.
//
// To bypass intentionally (you removed a feature on purpose):
//   1. Remove the feature row from CRITICAL_FEATURES.md (with explanation in
//      the commit message).
//   2. Remove the matching MANIFEST entry below.
//   3. Both must happen in the same PR so the diff makes the intent obvious.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Each entry asserts the feature exists in the named file.
 * - `markers` are strings (or regex) that MUST appear somewhere in the file.
 * - Add to this when CRITICAL_FEATURES.md gets a new row.
 * - Remove from this only when CRITICAL_FEATURES.md row is also removed.
 */
const MANIFEST = [
  // /login — the v0.10.1 regression (Google button) plus the rest of login UX.
  {
    route: '/login',
    file: 'src/app/(auth)/login/page.tsx',
    markers: [
      { name: 'Google sign-in button', match: 'data-testid="login-google-button"' },
      { name: 'Google handler call', match: 'signInWithGoogle' },
      { name: 'Phone number input', match: /input.*type=["']tel["']/s },
      { name: 'Email-OTP fallback link', match: 'sendEmailOtp' },
    ],
  },
  // /(app)/settings — useConfirm() must NOT regress to native confirm() for
  // sign-out (see Jyotsna's "popup msgs not clear" ticket → fix in v0.13.15).
  {
    route: '/(app)/settings',
    file: 'src/app/(app)/settings/page.tsx',
    markers: [
      { name: 'useConfirm import', match: "import { useConfirm } from '@/components/ui/ConfirmDialog'" },
      { name: 'Sign-out uses await confirm({...})', match: /handleSignOut[\s\S]{0,400}await confirm\(/ },
      { name: 'NOT browser confirm() for sign-out', mustNotMatch: /handleSignOut[\s\S]{0,200}\bif\s*\(\s*!\s*confirm\(/ },
    ],
  },
  // /(app)/error — route-level error boundary added v0.13.15 to prevent
  // events-RLS-style P0s from white-screening the whole authenticated shell.
  {
    route: '/(app)/error',
    file: 'src/app/(app)/error.tsx',
    markers: [
      { name: 'Sentry capture', match: 'Sentry.captureException' },
      { name: 'reset() retry button', match: 'reset' },
    ],
  },
  // / (landing) — UTM-tagged share URLs added v0.13.15 for share→install
  // funnel attribution.
  {
    route: '/',
    file: 'src/app/page.tsx',
    markers: [
      { name: 'UTM-tagged share URL (any campaign)', match: /utm_source=whatsapp/ },
    ],
  },
  // /(app)/family/FamilyTreeDiagram — Dadi tap-target rule (52px) on tree
  // card buttons. Anything < 44px is a Dadi failure regression.
  {
    route: 'FamilyTreeDiagram',
    file: 'src/components/family/FamilyTreeDiagram.tsx',
    markers: [
      { name: '52px Add-Relative bubble', match: /onClick=\{node\.onAdd\}[\s\S]{0,200}w-\[52px\]/ },
    ],
  },
];

const errors = [];
const warnings = [];

for (const entry of MANIFEST) {
  const path = resolve(ROOT, entry.file);
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch (e) {
    errors.push(`MISSING FILE: ${entry.file} (route ${entry.route}) — ${e.message}`);
    continue;
  }

  for (const marker of entry.markers) {
    if (marker.match) {
      const re = marker.match instanceof RegExp ? marker.match : new RegExp(escapeRegex(marker.match));
      if (!re.test(src)) {
        errors.push(`REGRESSION: ${entry.route} — "${marker.name}" not found in ${entry.file}`);
      }
    }
    if (marker.mustNotMatch) {
      const re = marker.mustNotMatch instanceof RegExp ? marker.mustNotMatch : new RegExp(escapeRegex(marker.mustNotMatch));
      if (re.test(src)) {
        errors.push(`REGRESSION: ${entry.route} — "${marker.name}" forbidden pattern present in ${entry.file}`);
      }
    }
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (errors.length === 0) {
  const total = MANIFEST.reduce((n, e) => n + e.markers.length, 0);
  console.log(`✅ check-critical-features: ${total} markers across ${MANIFEST.length} routes — all present.`);
  process.exit(0);
}

console.error('');
console.error('🚨 check-critical-features FAILED — a critical UI feature appears to have been removed.');
console.error('');
for (const err of errors) console.error('  ' + err);
console.error('');
console.error('What to do:');
console.error('  1. If this was an accidental removal: restore the feature.');
console.error('  2. If you intentionally removed it: also delete the matching row from');
console.error('     CRITICAL_FEATURES.md AND scripts/check-critical-features.mjs MANIFEST,');
console.error('     and call out the removal in your commit message.');
console.error('');
console.error('See CRITICAL_FEATURES.md for the full manifest.');
process.exit(1);
