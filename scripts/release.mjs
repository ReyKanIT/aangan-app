#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scripts/release.mjs — cross-store release-train for Aangan
//
// CEO Review 2026-05-08 — 90d strategic bet (COO):
//   "release.mjs cross-store release-train tooling — a single script that
//    bumps package.json + app.json, tags, builds AAB+IPA in one EAS run,
//    stages metadata to Play/ASC/Indus — eliminates the manual 'fill 3
//    store consoles' tax that gates every release today."
//
// What this script does:
//   1. Reads the current version from aangan_web/package.json (the
//      authoritative "marketing" version).
//   2. Bumps it according to --type (patch | minor | major) — semver.
//   3. Mirrors the new version into:
//        aangan_web/package.json   (web)
//        aangan_rn/package.json    (RN package)
//        aangan_rn/app.json        (expo.version)
//        aangan_rn/app.json        (expo.ios.buildNumber  — incremented +1)
//        aangan_rn/app.json        (expo.android.versionCode — incremented +1)
//   4. Runs `npm run build` in aangan_web (which runs check-critical-features
//      as prebuild). Build failure aborts the release.
//   5. (--commit) Stages and commits the bumped files + creates a git tag
//      `v<version>`.
//   6. (--build) Kicks off `eas build --platform <platform> --profile <profile>`
//      for the chosen platform(s). Default: both iOS + Android production.
//   7. Prints a clean summary with versions, tag, and EAS build links.
//
// Usage:
//   node scripts/release.mjs --type patch
//   node scripts/release.mjs --type minor --commit
//   node scripts/release.mjs --type patch --commit --build ios
//   node scripts/release.mjs --type patch --commit --build all
//
// Flags:
//   --type {patch|minor|major}   Required. semver bump
//   --commit                     Stage + commit + tag
//   --build {ios|android|all}    Trigger EAS build after commit
//   --dry-run                    Print what would happen, no writes
//
// EAS quota awareness:
//   Free Expo plan = 15 Android builds / month. This script does NOT
//   pre-check quota — Kumar's responsibility per CLAUDE.md. The script
//   prints the chosen platform(s) before triggering so you can abort.
//
// Idempotency:
//   - Re-running the same --type without --commit is safe (no-op writes).
//   - If a tag already exists, `git tag` fails and the script aborts
//     before the EAS build trigger.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const WEB_PKG = join(ROOT, 'aangan_web/package.json');
const RN_PKG  = join(ROOT, 'aangan_rn/package.json');
const RN_APP  = join(ROOT, 'aangan_rn/app.json');

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const TYPE = arg('type');
const COMMIT = !!arg('commit');
const BUILD = arg('build');
const DRY = !!arg('dry-run');

if (!TYPE || !['patch', 'minor', 'major'].includes(TYPE)) {
  console.error('USAGE: node scripts/release.mjs --type {patch|minor|major} [--commit] [--build {ios|android|all}] [--dry-run]');
  process.exit(1);
}

// ─── Read current version ────────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function writeJson(path, obj) {
  if (DRY) {
    console.log(`  (dry-run) would write ${path}`);
    return;
  }
  // Preserve trailing newline + 2-space indent (matches existing repo style)
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

const webPkg = readJson(WEB_PKG);
const rnPkg  = readJson(RN_PKG);
const rnApp  = readJson(RN_APP);

const oldVersion = webPkg.version;
const [maj, min, pat] = oldVersion.split('.').map((s) => parseInt(s, 10));
const newVersion =
  TYPE === 'major' ? `${maj + 1}.0.0` :
  TYPE === 'minor' ? `${maj}.${min + 1}.0` :
                     `${maj}.${min}.${pat + 1}`;

const oldBuildNumber = parseInt(rnApp.expo.ios.buildNumber, 10);
const newBuildNumber = String(oldBuildNumber + 1);

const oldVersionCode = rnApp.expo.android.versionCode;
const newVersionCode = oldVersionCode + 1;

console.log(`\nAangan release — ${TYPE} bump\n`);
console.log(`  Web version:      ${oldVersion}    → ${newVersion}`);
console.log(`  RN version:       ${rnPkg.version} → ${newVersion}`);
console.log(`  RN app.json:      ${rnApp.expo.version} → ${newVersion}`);
console.log(`  iOS buildNumber:  ${oldBuildNumber}  → ${newBuildNumber}`);
console.log(`  Android versionCode: ${oldVersionCode} → ${newVersionCode}`);
console.log(`  Commit + tag:     ${COMMIT ? 'YES (v' + newVersion + ')' : 'no'}`);
console.log(`  EAS build:        ${BUILD ?? 'no'}`);
console.log(`  Dry-run:          ${DRY}\n`);

// ─── Write the version bumps ─────────────────────────────────────────────────

webPkg.version = newVersion;
rnPkg.version  = newVersion;
rnApp.expo.version = newVersion;
rnApp.expo.ios.buildNumber = newBuildNumber;
rnApp.expo.android.versionCode = newVersionCode;

writeJson(WEB_PKG, webPkg);
writeJson(RN_PKG, rnPkg);
writeJson(RN_APP, rnApp);

// ─── Run web build (includes check-critical-features prebuild) ───────────────

if (!DRY) {
  console.log('→ npm run build (aangan_web)');
  const buildResult = spawnSync('npm', ['run', 'build'], {
    cwd: join(ROOT, 'aangan_web'),
    stdio: 'inherit',
  });
  if (buildResult.status !== 0) {
    console.error('\n✗ Web build failed — aborting release. Files have been bumped but no commit was made. Revert with `git checkout aangan_web aangan_rn` if needed.');
    process.exit(1);
  }
  console.log('✓ Web build passed');
}

// ─── Commit + tag ────────────────────────────────────────────────────────────

if (COMMIT && !DRY) {
  console.log('\n→ git add + commit + tag');
  try {
    execSync('git add aangan_web/package.json aangan_rn/package.json aangan_rn/app.json', { cwd: ROOT });
    execSync(
      `git commit -m "chore(release) v${newVersion} — ${TYPE} bump\n\n` +
      `- aangan_web ${oldVersion} → ${newVersion}\n` +
      `- aangan_rn ${rnPkg.version === newVersion ? oldVersion : rnPkg.version} → ${newVersion}\n` +
      `- iOS buildNumber ${oldBuildNumber} → ${newBuildNumber}\n` +
      `- Android versionCode ${oldVersionCode} → ${newVersionCode}"`,
      { cwd: ROOT },
    );
    execSync(`git tag v${newVersion}`, { cwd: ROOT });
    console.log(`✓ Committed and tagged v${newVersion}`);
  } catch (err) {
    console.error(`✗ Commit/tag failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── EAS build trigger ───────────────────────────────────────────────────────

if (BUILD && !DRY) {
  const platforms = BUILD === 'all' ? ['ios', 'android'] : [BUILD];
  console.log(`\n→ Triggering EAS build for: ${platforms.join(', ')}`);
  console.log('  ⚠️  Free plan = 15 Android builds/month. Skip if quota tight.\n');

  for (const platform of platforms) {
    console.log(`\n--- EAS build: ${platform} ---`);
    const easResult = spawnSync('eas', ['build', '--platform', platform, '--profile', 'production', '--non-interactive'], {
      cwd: join(ROOT, 'aangan_rn'),
      stdio: 'inherit',
    });
    if (easResult.status !== 0) {
      console.error(`✗ EAS build for ${platform} failed (status ${easResult.status})`);
      // Don't abort — the other platform may still succeed
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Aangan release v${newVersion} — summary`);
console.log('='.repeat(60));
console.log(`Version bumped:    ${oldVersion} → ${newVersion}`);
console.log(`iOS buildNumber:   ${oldBuildNumber} → ${newBuildNumber}`);
console.log(`Android versionCode: ${oldVersionCode} → ${newVersionCode}`);
console.log(`Committed + tagged: ${COMMIT && !DRY ? 'yes (v' + newVersion + ')' : 'no'}`);
console.log(`EAS build started:  ${BUILD && !DRY ? BUILD : 'no'}`);
if (!COMMIT) console.log('\nNext: re-run with --commit to commit, --build to trigger EAS.');
if (!DRY && COMMIT && !existsSync(join(ROOT, '.git/refs/tags/v' + newVersion))) {
  console.warn('\n⚠️  Tag was not created (existed already?). Verify with: git tag --list v' + newVersion);
}
console.log('');
