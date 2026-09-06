# ACTIVA 0.5.21

Patch kandidát pro GHRAB Platform 1.1.2 ecosystem release wave po nezávislém CI ověření 0.5.20.

- opraven browser QA harness suite-session testu: odemčený `app.js` zachovává `defer` pořadí vůči Platformě 1.1.2;
- startup browser test nově fail-closed ověřuje, že suite lifecycle není zablokovaný, a při timeoutu ukládá diagnostiku;
- stejná oprava pořadí je v P5 runtime QA a runtime gate detekuje `suiteBlocked`;
- performance budget nebyl zvýšen; školní logo bylo bezeztrátově z hlediska použití zmenšeno z 384×384 na 192×192 px, aby se odstranil zbytečný payload;
- produkční suite-session cleanup a vendor Platforma 1.1.2 zůstávají funkčně beze změny oproti 0.5.20.

Release status se neurčuje tímto dokumentem; rozhoduje kompletní GARP/release gate a nezávislé browser ověření.
