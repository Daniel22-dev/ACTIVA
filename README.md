# ACTIVA – Sestavovač aktivit

**Aktuální verze:** 0.5.28  
**Platforma:** GHRAB Platform 1.1.2  
**Release governance:** GARP 2.7 r2 / G-02 (legacy GARP 2.5.1/N5 regression) · P5-R2 · Safe Promotion

ACTIVA je redakční studio v ekosystému AI Studio GHRAB. Z učiva připraví tisknutelné pracovní listy, řešení, varianty A/B/C, tři úrovně diferenciace, skupinové sady, projekci bez telefonů a přenosné interaktivní HTML.

## Produkční profil

- 39 modulárních typů aktivit,
- úplný prohledávatelný manuál přímo v aplikaci,
- interní runtime testovací centrum,
- GHRAB QA 1.0.2,
- místní knihovna a zálohování,
- úložný adaptér připravený na budoucí školní server; server je v této verzi vypnutý,
- Access Guard a GHRAB Platform 1.1.2,
- GARP 2.5.1 fail-closed kontroly včetně N5 selftestu,
- exact release identity vázaná na source commit, manifest, SBOM, provenance a evidence,
- produkční GitHub Pages release pouze z chráněného `main`,
- live ověření releasu před `app-updated` dispatch do AI Studia.

## Release cesta

Kanonická cesta změny je:

`candidate → P5/axe → promotion PR → protected main → main P5 → GitHub Pages → live verification → AI Studio dispatch`

`main` je chráněný rulesetem. Přímé produkční nasazení z `candidate` není povoleno.

Aktualizace GHRAB AI Core se zakládají jako draft PR do `candidate`; po schválení pokračují stejnou Safe Promotion cestou.

## Vývoj

```bash
npm ci
npm test
npm run qa:p5:ci
npm run garp25:prep-static
npm run qa:safe-promotion
npm run qa:auto-patch-topology
```

Běžný build vzniká v `dist/`. Produkční GitHub Pages artefakt vzniká v `dist-pages/` a školní serverový profil v `dist-school-server/`; jde o generované výstupy a nepatří do zdrojového repozitáře.
