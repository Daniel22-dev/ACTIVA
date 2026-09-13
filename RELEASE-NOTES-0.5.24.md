# ACTIVA 0.5.24 — GARP 2.5.1 SHIELD opravné kolo po nezávislém auditu

Datum: 2026-09-12

## Opraveno
- ACT-N1: při nedostupné centrální přístupové vrstvě už uživatel nevidí prázdnou stránku; statická záložní hláška zůstává fail-closed a bezpečnostně kritické bootstrapy se nevracejí do cache.
- ACT-N2: GitHub Pages používá samostatný `dist-pages/` artefakt bez `tests/`, `test-results/` a `qa-results/`; stejný leak scanner jako pro školní profil je povinný v CI.
- ACT-N3: přidán deterministický tvůrce school payload ZIPu s pozitivní a negativní selftest kontrolou.
- ACT-N4: GARP SW checker normalizuje URL ekvivalenty kritických cest a zakazuje jakýkoli Cache API přístup uvnitř `networkOnlyNoStore`.
- ACT-N5: AI boundary drift verifier nyní pokrývá také celý `vendor/` a `qa/`.
- ACT-N6: release evidence manifest je rozšířen o auditní a bezpečnostní dokumentaci pomocí explicitních externích položek.
- Interní `offline-routes` test byl srovnán s novým bezpečnostním modelem a release manifesty už nedeklarují `internal-self-tests`, pokud testovací centrum není distribuováno.

## Beze změny
Pedagogická logika, AI provider/model, prompt assembly a vlastní generování aktivit se oproti 0.5.23 nemění.

## Stav
Toto je SHIELD-PREP opravný kandidát. School-server production, RI-LIVE, SHIELD-LIVE a práce s reálnými studentskými daty zůstávají nepovolené do dokončení LIVE kontrol.
