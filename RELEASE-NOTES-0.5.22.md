# ACTIVA 0.5.22

CI opravný kandidát pro GHRAB Platform 1.1.2 ecosystem release wave po GitHub bězích ACTIVA 0.5.21.

- GitHub Chromium u 0.5.21 prokázalo PASS scénáře `open-child-suite-end`; produkční suite-session handler, cleanup a acknowledgement proto nebyly kvůli tomuto hotfixu změněny.
- Následující `delayed-open-replay` padal uvnitř testovacího harnessu na `TypeError: Cannot read properties of undefined (reading 'project')`, protože coordinator stránka správně nemá `window.ACTIVA`.
- Browser QA nyní odděluje `seedStorage()` (localStorage, sessionStorage, IndexedDB, handoff/events) od `seedRuntime()` (paměť a formulář otevřené child aplikace). Delayed-open scénář používá pouze storage seed a teprve poté otevírá ACTIVA, což odpovídá požadovanému scénáři „child během suite end zavřená“.
- Přidána fail-fast kontrola, že storage-only seed neobsahuje závislost na `window.ACTIVA` ani `#sourceText`.
- Platforma zůstává přesně 1.1.2 a release status nadále určuje kompletní GARP/CI gate, nikoli tento dokument.
