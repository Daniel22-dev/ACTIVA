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
