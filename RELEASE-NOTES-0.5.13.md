# ACTIVA 0.5.13 – CI hotfix po finálním GARP auditu

Datum: 27. 8. 2026

## Důvod vydání

GitHub Actions job `certify` v ACTIVA 0.5.12 skončil při browserové části regresního testu error reporteru timeoutem na Chrome DevTools endpointu `127.0.0.1:<port>/json/version`. Statická část reportéru před timeoutem prošla 57 kontrolami.

## Oprava

- hlavní `.github/workflows/deploy.yml` nyní před `npm run test:reporter` ověří připnutou verzi Playwrightu 1.61.1;
- nainstaluje připnutý Playwright Chromium včetně systémových závislostí;
- nastaví `CHROMIUM_PATH` na přesnou binárku Playwrightu;
- browserová regrese se tak neopírá o náhodně dostupný systémový Chrome runneru;
- bezpečnostní ani funkční gate nebyla oslabena ani přeskočena.

## Rozsah

Jde o CI/release konfiguraci a synchronizaci patch verze na 0.5.13. Produkční bezpečnostní opravy z 0.5.12 zůstávají beze změny.
