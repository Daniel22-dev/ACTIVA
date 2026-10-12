# ACTIVA P2.2 — Canonical build equivalence (shadow evidence)

Status: **observational only**, no artifact reuse and no change to certification admission.

## Goal
Prove whether the P5 and independent axe jobs, both triggered for the **same PR merge commit SHA**, generate identical \`dist/\` bytes when \`GHRAB_BUILD_TIME\` is bound to the same git commit timestamp. This is prerequisite evidence, **not** proof that one test can replace the other.

## What runs
- P5 continues to build and certify independently, capturing \`qa-results/ci-canonical.json\` as in P0.
- axe continues to run its own \`npm ci\`, \`npm run build\`, browser installation, and blocking axe runtime test. It now uses the same source timestamp and emits its **own** canonical inventory/digest and source SHA.
- The new read-only \`scripts/ci-canonical-equivalence.mjs\` compares inventories only. It does **not** drive any GitHub Actions promotion or deploy decision.
- \`npm run test:p2:canonical-equivalence\` includes negative fixtures for stale SHA, changed timestamps, tampering, corrupt inventory and missing critical files.

## Reproduce
1. Wait for independent PR P5 and axe jobs to finish GREEN on the same PR merge SHA.
2. Download each run's artifact ZIP and extract the \`qa-results/ci-canonical.json\` from each **separately**.
3. Compare with \`node scripts/ci-canonical-equivalence.mjs /tmp/p5/ci-canonical.json /tmp/axe/ci-canonical.json\`.
4. Require \`OBSERVATIONAL_MATCH_ONLY\`; record exact run IDs, artifact IDs, and hashes. A mismatch is a blocker for cross-job build sharing, not a reason to relax tests.
5. Re-run at least five times across cold/warm runners and compare digest stability before considering a trusted shared build.

## Guardrails for future P2.3
A future release-admission aggregator must bind exact git SHA, immutable artifact digest, release stage, run IDs and GitHub status provenance for P5/axe/QA/GARP. It must reject PR/push mismatch, stale or superseded candidate, missing evidence, fork/untrusted provenance, expired artifacts and mismatched toolchain or policies. Protect independent status checks; do not use one job's canonical digest to infer that another independent test actually ran. Do not disable the deploy's own P5/QA/GARP checks until independent equivalent assurance has passed dedicated negative/race/rollback testing and review.

Rollback: remove the axe timestamp/canonical evidence step and this shadow comparator. No runtime or release routing changes were made by this P2.2 PR.
