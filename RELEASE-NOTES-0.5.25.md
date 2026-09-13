# ACTIVA 0.5.25 — GARP 2.5.1 SHIELD corrective tooling round

- Closes Claude round-2 LOW findings ACT-N7 through ACT-N10 and strengthens ACT-N8.
- Service-worker checker now inspects reachable network-only helpers, cache aliases, all fetch no-store options, stale-cache cleanup, and case-insensitive critical paths.
- AI boundary drift coverage now includes workflows, repository-root files, security tooling, and docs.
- Evidence verification now rejects unexpected files inside declared external evidence scopes.
- Access fallback selftest is bound to the actual fallback block and includes effective negative controls.
- Explicit access denial sets `data-ghrab-access=denied` without unlocking protected scripts.
- No pedagogical logic, AI prompt/provider/model, persistence model, or content-generation behavior changed.
