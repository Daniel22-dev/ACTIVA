# ACTIVA 0.5.23 — GARP 2.5.1 SHIELD-PREP

Bezpečnostní hardening bez změny pedagogického workflow aplikace.

- Service worker nově směruje bezpečnostně kritické runtime, deployment, auth, platform a release-integrity cesty výhradně přes `network-only` s `cache: no-store`; tyto autoritativní soubory se neukládají do offline cache.
- School-server build odděluje runtime deployment od interních testovacích artefaktů.
- Přidána lokální kopie aktuálního kanonického GARP 2.5.1 toolingu, source/deployment secret scan, kontrola GitHub Actions pinů, CycloneDX 1.7 SBOM a AI-boundary fingerprint/drift gate.
- Přidány SHIELD-PREP bezpečnostní podklady, release-integrity/provenance/evidence workflow a negativní kontroly.
- GitHub Actions používají fixovaný runner `ubuntu-24.04` a Node `22.16.0`; existující externí actions zůstávají připnuté na plný commit SHA.

Tato verze je kandidát pro nezávislou Prompt E kontrolu. Není tím potvrzen SHIELD-LIVE ani produkční školní server.
