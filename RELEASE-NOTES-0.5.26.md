# ACTIVA 0.5.26 — GARP 2.5.1 SHIELD corrective round after Claude 0.5.25

- Closes ACT-N12 and ACT-N13 denial UX consistently on the main application and protected manual while preserving fail-closed script locking.
- Reworks the canonical service-worker checker for ACT-N11: `networkOnlyNoStore` is evaluated with complete module scope on both network-success and network-failure paths, so module/object Cache Storage aliases are observed by effect, not only syntax.
- Service-worker `activate` cleanup is additionally verified behaviorally by observed deletion of stale application cache keys while preserving the current and unrelated caches.
- Expands AI-boundary drift detection for ACT-N14 from fixed roots to the complete text-capable project input surface, including `.github/scripts`, newly introduced root directories, and extensionless root files; generated outputs/evidence remain explicitly excluded.
- Expands evidence-manifest coverage for ACT-N15 to all files/subdirectories under `security/` except the independently tracked `security/evidence/` tree and the manifest itself.
- Adds positive and negative selftests for every corrective control.
- No pedagogical logic, AI prompt/provider/model, persistence model, import/export semantics, or content-generation behavior changed.
