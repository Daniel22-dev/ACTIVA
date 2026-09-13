# ACTIVA – Sestavovač aktivit

**Aktuální verze:** 0.5.27  
**Platforma:** GHRAB Platform 1.1.2 · etapa P3


**Verze: 0.5.27 · platformně sjednocený bezpečnostní kandidát**

ACTIVA je originální prémiové redakční studio v ekosystému AI Studio GHRAB. Z učiva připraví tisknutelné pracovní listy, řešení, varianty A/B/C, tři úrovně diferenciace, skupinové sady, projekci bez telefonů a přenosné interaktivní HTML.

## Produkční balík 5

- 39 modulárních typů aktivit,
- originální světlý redakční design (kobalt + korál),
- úplný prohledávatelný manuál přímo v aplikaci,
- interní runtime testovací centrum,
- GHRAB QA 1.0.2,
- místní knihovna a zálohování,
- úložný adaptér připravený na budoucí školní server; server je v této verzi vypnutý,
- manifest, Access Guard a GHRAB Platform 1.1.2 pro aktuální AI Studio.

## Vývoj

```bash
npm ci
npm test
npm run test:headless
npm run qa:technical
npm run qa:security
npm run qa:pwa
npm run qa:critical
npm run qa:combinatorial
npm run qa:visual
npm run qa:report
```

Výstup pro GitHub Pages vznikne v `dist/`.
