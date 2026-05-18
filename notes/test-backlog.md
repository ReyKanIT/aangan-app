# Aangan Test Backlog

> Owner: Testing agent (standing). Updated whenever a test is deferred,
> deleted, or marked flaky.
>
> Format: one bullet per item. Prefix with the tier (`[T1]`, `[T3]` etc.),
> then the file/flow, then a one-line rationale + intended fix.

## Open

- **[T3] `.maestro/family-tree-renders.yaml` — `testID="kulvriksh-zoom-in"` not yet plumbed.**
  The flow's last assertion is gated on `optional: true` until the
  KulvrikshTreeView zoom-in button gets a `testID`. When the design agent
  adds the testID, drop the `optional: true` and re-run.
- **[T3] Maestro CLI install assumed to live on dev machines.**
  Phase 4 (CI) needs a hosted runner image that has Maestro pre-installed,
  or an `actions/setup-maestro` step. Open question: do we run T3 on every
  PR (cost) or only on `pre-release` tags (faster CI, later catch)?
- **[T1] PanchangWidget — animation / expand-collapse not covered.**
  computeSpecialToday is now tested in isolation, but the wrapping
  Animated.View height interpolation has no test. Manual smoke (T4) only.
  Add when a regression demands it.
- **[T1] Store tests (postStore, familyStore, eventStore, messageStore) —
  parallel agent owns these.**
  Don't duplicate. Reconcile after their first commit lands.
- **[T1] AddMemberModal name-first form — structural lockdown only.**
  The v0_16_1_lockdown test asserts source strings. A render test that
  actually drives the modal would catch a regression where the field is
  present in source but disabled / hidden via style. Defer until the
  modal is touched again.
- **[T0/T1] expo-file-system API drift in utils/uploadFile.ts.**
  Pre-existing tsc errors are filtered out of the gate per TESTING.md §T0.
  Replace the filter with an actual fix when the bucket pipeline is next
  touched.
- **[doc] AANGAN_REGRESSION_SUITE.xlsx not regenerated [3:42pm - 17May26].**
  The generator at `scripts/build_aangan_regression_xlsx.py` was extended
  with the Phase-2 / Phase-3 rows (PanchangWidget tests, husky hook,
  Maestro flow), but Bash was unavailable to execute it during the testing
  agent's first deliverable. Action: run
  `python3 scripts/build_aangan_regression_xlsx.py` from the repo root to
  refresh the xlsx. Zero-formula-error check expected to pass — same
  patterns as the previous generator.
- **[ops] `aangan_rn/scripts/post-build-smoke.sh` lacks +x bit [10:42pm - 17May26].**
  The script was authored via the Write tool, which does not preserve the
  executable bit. `chmod +x` and `git update-index --chmod=+x` were both
  blocked by the agent sandbox. Workaround documented inline + in
  TESTING.md: invoke via `bash aangan_rn/scripts/post-build-smoke.sh ...`.
  Action when Kumar next touches a shell: run
  `chmod +x aangan_rn/scripts/post-build-smoke.sh && git update-index --chmod=+x aangan_rn/scripts/post-build-smoke.sh`
  so the +x bit is committed and CI doesn't need the `bash …` prefix.
- **[T3] Maestro CLI not installed on this host [10:42pm - 17May26].**
  `which maestro` returns nothing. JDK 17 is on PATH so the install is
  unblocked, but `curl -Ls "https://get.maestro.mobile.dev" | bash` was
  blocked by the agent sandbox. Action: run that one-liner once in a
  permissioned terminal, then `export PATH=$PATH:$HOME/.maestro/bin` in
  ~/.zshrc. After that, `bash aangan_rn/scripts/post-build-smoke.sh
  /path/to/Aangan.app` should run green against the booted iPhone 17 Pro.

## Closed

- ~~**[T1] PanchangWidget specialToday tests**~~ — landed [3:42pm - 17May26]
  with 9 unit tests in `src/__tests__/components/PanchangWidget.test.tsx`
  + the pure helper `computeSpecialToday` extracted into
  `services/panchangService.ts`.
- ~~**[CI] Husky pre-commit hook (tsc + jest + check:critical-rn)**~~ —
  landed [3:42pm - 17May26]. See `aangan_rn/.husky/pre-commit` +
  `aangan_rn/scripts/pre-commit.sh`.
- ~~**[T3] .maestro/ directory + README + family-tree-renders.yaml**~~ —
  landed [3:42pm - 17May26].
- ~~**[T3] `.maestro/signin-phone.yaml` + `scripts/post-build-smoke.sh`**~~ —
  landed [10:42pm - 17May26]. Reviewer-bypass phone OTP flow
  (`9876543210`/`123456`) that handles both fresh-state and cached-session
  start paths (signs out via Settings before driving the OTP screen).
  Post-build smoke harness installs a `.app` via `xcrun simctl install`,
  cold-launches it, then runs `maestro test` with JUnit output for CI.
  Per CTO M5 anchor — the prerequisite leaf for every other Maestro flow.
