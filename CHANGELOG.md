## 0.5.27 — 2026-09-12

- Tooling-only opravné kolo po nezávislém auditu 0.5.26: ACT-N16 a ACT-N17.
- SW checker zachovává identitu Cache Storage i přes `self` a zachytí dynamický i `Reflect` přístup.
- Network-failure scénář odmítá vyrobenou úspěšnou odpověď; fail-closed vyžaduje chybu/rejection nebo explicitně neúspěšnou odpověď.
- Dokumentován integrační kontrakt `.ghrab-access-gate` mezi ACTIVA a centrálním app-guardem.
- Aplikační, pedagogická, datová a AI logika beze změny proti 0.5.26 kromě synchronizace verze/cache identifikátoru.

## 0.5.26 — 2026-09-12

- Opravné kolo po nezávislém auditu 0.5.25: ACT-N11 až ACT-N15.
- Denial UX je sjednocen na hlavní stránce i v manuálu a zůstává fail-closed.
- SW checker ověřuje dosažitelný Cache Storage přístup v úplném modulovém scope a skutečný efekt cleanupu `activate`.
- AI-boundary verifier pokrývá celý textově spustitelný projektový povrch; evidence manifest celý `security/` scope s explicitní výjimkou interní evidence.
- Pedagogická a AI logika beze změny.

## 0.5.23 - 2026-09-11

## 0.5.25 — 2026-09-12
- GARP 2.5.1 corrective round after independent Claude review: ACT-N1 through ACT-N6 remediation.
- Added fail-closed visible access fallback, hygienic Pages artifact, deterministic school payload ZIP, and canonical GARP tooling hardening for SW path normalization/cache fallback and AI-boundary vendor/qa drift.


- GARP 2.5.1 SHIELD-PREP hardening: service-worker security-critical network-only/no-store, release-integrity tooling, AI-boundary drift controls, recursive secret/leak scanning and CI gates.

## 0.5.22 – Platform 1.1.2 suite browser QA delayed-replay fix

- Opraven skutečný CI FAIL z ACTIVA 0.5.21 v povinném Chromium suite-session testu.
- Delayed-open scénář nyní zapisuje syntetická persistence data přes samostatný storage-only seed a nesahá na `window.ACTIVA` v suite coordinatoru, kde child runtime z principu neexistuje.
- Přidána fail-fast invariantní kontrola, že storage-only seed není závislý na ACTIVA runtime ani formuláři child aplikace.
- Produkční suite-session cleanup, acknowledgement a referenční GHRAB Platform 1.1.2 zůstávají funkčně beze změny; 0.5.21 již v GitHub Chromiu prokázala PASS open-child scénáře.

## 0.5.20 – 2026-09-05


## 0.5.21 – Platform 1.1.2 CI hardening

- Opraveno pořadí odemykání chráněného app.js v browser QA harnessu; test nyní věrně zachovává defer pořadí Platforma → child aplikace.
- Suite browser QA fail-closed kontroluje zablokovaný lifecycle a při timeoutu vypisuje diagnostiku.
- P5 runtime QA používá stejné pořadí a blokuje release při suiteBlocked.
- Performance budgety nebyly zvýšeny; školní logo bylo zmenšeno z 384×384 na 192×192 px.

- Migrace na přesnou referenční GHRAB Platform 1.1.2 pro koordinovanou ecosystem release wave.
- Integrace `ghrab-suite-session-v1`: cross-context signal, delayed-open replay, per-tab fence, Browser Back/Forward ochrana a fail-closed acknowledgement po dokončeném cleanupu.
- PC-01 opravil data manifest podle skutečných writerů: pracovní projekt, lokální knihovna/fallback, historie, credentials, migrační full backup, Studio handoff a lifecycle/security state.
- End-work cleanup již nemaže celý namespace naslepo; zachovává neobsahové nastavení, Cache Storage, suite tombstone/ack state a migration marker.
- Persistence/autosave jsou během suite cleanupu zablokovány, aby stale karta nemohla po ukončení relace vrátit stará data.
- Přidán skutečný browser test suite-session včetně open-child, delayed replay, multi-tab, Back/Forward, fail-closed a povinné negative control mutace.
- Kandidát není automaticky produkční GREEN; E-01 zůstává ekosystémově otevřené do dokončení celé release wave.

## 0.5.19 – 2026-09-03

- Opraveny HIGH regrese N-11 a N-12 z mimořádné kontroly 0.5.18.
- Privacy používá dvouúrovňový model: kontextové PII = `danger` a blokace; holé 9–10místné číselné hodnoty = `warn` s výslovným potvrzením učitele před AI egress.
- Obnovena detekce holého RČ bez lomítka a českých pevných/mobilních čísel alespoň jako varování; diagnostika je vždy rediguje.
- Doplněny varianty labelů bez diakritiky a hranice krátkých označení `id`/`rc`, aby nevznikaly falešné zásahy ve slovech typu Pyramid/Covid/Madrid/Marc.
- `endActivaWork` maže vlastní data nezávisle na stavu sdílených platformních klíčů; neparsovatelný cizí handoff zůstane zachován a je oznámen, ale neblokuje smazání projektu, knihovny, historie ani API klíče.
- Property korpusy byly převedeny z konkrétních auditních příkladů na třídy vstupů a doplněny nové negative controls.

## 0.5.18 – 2026-09-02

- Zúžena číselná privacy heuristika tak, aby legitimní matematické/fyzikální hodnoty nebyly blokovány bez PII kontextu; přidána pozitivní i negativní regresní sada.
- Property evidence je svázána s verzí a SHA-256 tree snapshotem relevantních zdrojů/build artefaktů; samostatný běh security gate odmítne stale report.
- Ukončení práce nyní validuje sdílené handoff/event záznamy před první mutací a u poškozených dat selže atomicky a fail-closed.
- Diagnostická redakce sjednocena s novými kontextovými numerickými pravidly.
- Performance budget vědomě upraven na distBytes 855000 / precacheBytes 765000 kvůli explicitně přidanému security/evidence kódu a minimální rezervě 0.5.17.

## 0.5.17

- GARP 2.3 opravné kolo po nezávislé Claude kontrole.
- AI trust boundary nyní uzavírá všechna uživatelsky/importem ovládaná textová pole do jednoho nedůvěryhodného JSON bloku a odstraňuje podvržené boundary markery.
- Privacy preflight a diagnostická redakce sdílejí jednu sadu detektorů a pokrývají metadata projektu včetně rodného čísla / dlouhého identifikátoru.
- „Ukončit práci“ maže cílené handoff packety a události ACTIVA, zachovává cizí aplikace a při blokované IndexedDB končí fail-closed před částečným mazáním.
- Data manifest, CSP/HSTS, service-worker bypass a workflow permissions byly srovnány se skutečnou implementací.
- Produkční legacy-AI test switch byl odstraněn; privacy attestation se odvozuje od skutečného preflightu.
- Doplněny property-based GARP kontroly nad sestaveným promptem, privacy preflightem, retention cestou, CSP a distribuovaným buildem včetně skutečných negative controls v disposable kopiích.
- Samostatný HTML export dostal restriktivní nonce CSP jako defense-in-depth.

## 0.5.15 — 2026-08-31

- Opraveno AI Core metadata `serverReady`: živý manifest nyní správně deklaruje technickou server-ready kompatibilitu aplikace.
- Stav fyzického školního serveru zůstává oddělený a pravdivě nepřipojený (`prepared-not-connected`).
- Aktualizována buildová a GARP regresní brána proti návratu chybné hodnoty.
- Pedagogické funkce a datové formáty se nemění.

## 0.5.14 — 2026-08-27

- Hotfix synchronizuje `sharedAccessVersion` s aktuální podepsanou konfigurací AI Studia, aby se aplikace po bezpečnostní rotaci nezamykala kvůli `configuration-version-mismatch`.
- Pedagogické funkce a datové formáty se nemění.

## 0.5.13 — CI hotfix browserového reporter testu (2026-08-27)

- Opraven GitHub Actions `certify`: před browserovou regresí error reporteru se nyní instaluje připnutý Playwright Chromium 1.61.1 a nastavuje `CHROMIUM_PATH`.
- Odstraněna závislost testu na systémovém Chrome GitHub runneru, který v běhu 89572799978 neotevřel DevTools endpoint a způsobil timeout.
- Release gate není změkčena; browserová část zůstává blokující.
- Patch verze synchronizována na 0.5.13.

## 0.5.12 — GARP opravný kandidát po Claude kole 1 (2026-08-27)

- Opraveno pravidlo privacy brány pro označená česká jména: prefixy jako `Žák:`, `Jméno:`, `Student:` a `Matka:` jsou nyní vyhodnocovány bez ohledu na velikost prvního písmene.
- Doplněna regresní sada přímo nad produkčním regulárním výrazem včetně případů s velkým počátečním písmenem.
- Doplněny adversariální protipříklady pro projektovou a knihovní importní normalizaci (schema, whitelist typů, limity, prototype pollution a vynucení osobní viditelnosti).
- Opraven whitelist importovaných typů aktivit a předmětových balíčků tak, aby zděděné klíče objektu (`__proto__`, `constructor`, `toString`) nebyly považovány za povolené hodnoty.

## 0.5.11 — GARP bezpečnostní kandidát (2026-08-27)

- Opraveno fail-closed rozlišení školního AI profilu a zákaz lokálního AI klíče v nepřipojeném school-server režimu.
- Z produkční CSP odstraněno `unsafe-inline` pro spustitelný JavaScript; hlavní aplikace i access bootstrap jsou externí skripty.
- Zpřísněny importy, integrita externích DOCX/PDF parserů, diagnostika, PWA runtime konfigurace a GitHub Actions.
- School-server profil nyní pravdivě hlásí „prepared-not-connected“.
- Doplněna regresní GARP bezpečnostní release brána.

## 0.5.10 — sjednocení reportéru (2026-08-13)

- Reportér používá dvoukrokové vytvoření a skutečné stažení diagnostického ZIPu; Gmail je dostupný až po kliknutí na stažení.
- Rozhraní i e-mail vyžadují ruční přiložení ZIPu a pomocné video je bezpečně skryté uvnitř reportéru i při scrollování.
- Regresní sada fyzicky ověřuje stažený ZIP, jeho snímky a diagnostiku, jednu instanci reportéru, motivy, mobilní zobrazení a klávesnici.
- Úplný manuál je na úzkých displejích omezen na šířku viewportu; vodorovná navigace zůstává posuvná bez přetečení stránky.
- Tvorba aktivit ani uložené materiály nebyly změněny; PWA cache je `ghrab-activity-builder-v0.5.10`.

## 0.5.9 — P5 (2026-08-05)


## 0.5.9 — P5 R2

- P5 R2 runtime audit se skripty a odemčeným UI.
- Blokující exact axe kontrola je součástí CI.


- Předprodukční akceptace bez povinného školního serveru.
- Nulové otevřené automatické a11y nálezy jsou podmínkou P5 brány.
- Přidán aktualizovaný release-acceptance kontrakt a odložený GitHub upload.

# Changelog

## 0.5.7 — P4 FINAL (2026-08-04)

- Finální certifikace, čisté buildy, přístupnost, výkon, bezpečnost a release evidence.
- Přidána povinná `qa:p4:ci` brána.

## 0.5.6 - 2026-08-04 (P3)

- Platforma 1.1.0, pristupnost, performance budgety a modularizace P3.

## 0.5.5 — P2: sjednocení platformy GHRAB (2026-08-04)

- jeden kanonický školní logotyp a jednotná autorská patička;
- GHRAB Platform 1.0.0: motiv, storage namespace s vratnou migrací, Studio Bridge 2.0 a artifact envelope v1;
- jednotný název PWA cache `ghrab-activity-builder-v0.5.5` a řízená aktualizace;
- platformní konformitní test je součástí buildu a CI.


## 0.5.4 — P1 (2026-08-04)

- Produkční bezpečnost, serverový profil, datové manifesty a jednotná observability vrstva.
- GHRAB AI Core 1.0.0 a přepínání direct-gemini / school-gateway.

# Changelog

## 0.5.3 — 2026-08-04

- Etapa P0: stabilní PWA id, odolnější instalace service workeru, plné obnovení chráněných skriptů a server-ready deployment kontrakt.
## 0.5.2 — 2026-08-03

- zavedena jediná lokální instance společného reportéru;
- aplikační adaptér odpovídá skutečnému světlému redakčnímu vzhledu;
- doplněny workflow konceptu, screenshotů, ZIP/Gmail, PWA cache a centrální návod;
- hlavní funkce sestavování aktivit ani uživatelská data nebyly změněny.

## 0.5.16
- GARP 2.3 security hardening: end-work deletion + AI prompt trust boundary.

- Performance budget: `precacheBytes` byl po bezpečnostním hardeningu vědomě upraven z 755 000 na 760 000 B; skutečný build zůstává pod limitem.
