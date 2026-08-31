# ACTIVA 0.5.15 — AI Core server-ready metadata hotfix

Datum: 31. 8. 2026

- Opraven rozpor mezi živým `studio-manifest.json` a centrální AI readiness evidencí.
- `aiCore.serverReady` nyní vyjadřuje technickou připravenost aplikace pro GHRAB AI Core a je nastaven na `true`.
- Skutečné připojení školního serveru se nadále vykazuje odděleně a zůstává pravdivě `prepared-not-connected` / `schoolServerConnected: false`.
- Build a GARP regresní kontrola nově vyžadují správnou server-ready deklaraci, aby se chyba nevrátila.
- Bez změny pedagogických funkcí, ukládání dat a současného direct-gemini provozu.
## CI hotfix R2
- Zkrácena pouze dokumentační poznámka v offline manuálu, aby P5 performance gate znovu splnil limit `precacheBytes` (749897 / 750000 B).

