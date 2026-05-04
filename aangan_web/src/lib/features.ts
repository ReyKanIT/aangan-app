/**
 * Feature flag infrastructure.
 *
 * Why: production-grade pattern at any non-trivial scale. Every "shipped
 * but not yet visible" feature gates behind a flag so we can:
 *   - Merge to main behind OFF default → no risk to prod
 *   - Enable in preview/staging → real-environment testing
 *   - Progressive rollout (10% → 50% → 100%)
 *   - Kill-switch on incidents without a redeploy
 *
 * For now this is env-var-driven (cheap, instant, no extra infra). When we
 * cross ~10k DAU, swap the implementation for PostHog or LaunchDarkly
 * without touching any callsite — only `isFeatureEnabled` changes.
 *
 * Naming: NEXT_PUBLIC_FEATURE_<NAME>=true|false. Prefix is exposed to the
 * browser bundle (Next.js convention) so client components can read it.
 *
 * Defaults: OFF. A missing env var means the feature stays hidden in prod.
 */

export type FeatureFlag =
  | 'HERITAGE'        // Family heritage capture module (cultural items, oral history)
  | 'WISDOM_NOTES_V2' // Standalone wisdom_notes entity (vs the post_type='wisdom' MVP)
  | 'R2_STORAGE';     // Cloudflare R2 backend (vs current Supabase Storage)

const FLAG_ENV: Record<FeatureFlag, string> = {
  HERITAGE:         'NEXT_PUBLIC_FEATURE_HERITAGE',
  WISDOM_NOTES_V2:  'NEXT_PUBLIC_FEATURE_WISDOM_NOTES_V2',
  R2_STORAGE:       'NEXT_PUBLIC_FEATURE_R2_STORAGE',
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // process.env reads at build time for NEXT_PUBLIC_*. Falsy values
  // ('' / 'false' / undefined) → OFF. Only the literal 'true' enables.
  // This keeps accidental enables (e.g. typos like '1' or 'yes') from
  // turning a feature on by mistake.
  const envName = FLAG_ENV[flag];
  return process.env[envName] === 'true';
}

/**
 * Server-only variant. Use this in API routes, server components, edge
 * functions where reading a non-public env var is appropriate (e.g. for
 * gating an internal-only endpoint).
 */
export function isServerFeatureEnabled(flag: FeatureFlag): boolean {
  // Currently identical to the client check, but kept as a separate fn so
  // we can route certain flags through a server-only env var (no
  // NEXT_PUBLIC_ prefix) when their state shouldn't ship to the browser.
  return isFeatureEnabled(flag);
}
