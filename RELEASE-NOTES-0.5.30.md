# ACTIVA 0.5.30 — PWA update UX hotfix

Datum: 2026-09-27

## Oprava

- Opravena registrace service workeru v chráněném bootstrapu ACTIVA.
- Hlavní skript ACTIVA se spouští až po asynchronním ověření přístupu; původní kód teprve poté čekal na `window.load`. Pokud už událost proběhla, service worker se v dané relaci vůbec neregistroval a okamžitá kontrola nové verze se nespustila.
- Registrace nyní probíhá ihned po inicializaci aplikace, stejně jako v ostatních aplikacích ekosystému.
- GHRAB Platform 1.1.2 tak může standardně zachytit čekající service worker a zobrazit dialog **Je dostupná nová verze** s volbami **Aktualizovat / Později**.
- Doplněn regresní test pro tento bootstrap scénář.

## Technický dopad

- Verze aplikace a release metadata jsou synchronizována na `0.5.30`.
- Pedagogická logika, datový model, generovací workflow a AI transport se nemění.
- Aktivní bezpečnostní autoritou zůstává GARP 2.7 r2/G-02; GARP 2.5.1/N5 zůstává regresní vrstvou.
- Školní server zůstává ve stavu `DEFERRED / NOT_TESTED`.
