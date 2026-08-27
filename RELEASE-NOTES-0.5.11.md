# ACTIVA 0.5.11 – GARP bezpečnostní kandidát

Datum: 27. 8. 2026

- školní AI profil nyní fail-closed rozlišuje serverless a nepřipojený school-server režim a v něm nepovolí lokální poskytovatelský klíč;
- produkční spustitelný JavaScript byl vyveden z inline skriptů, CSP již pro `script-src` nepoužívá `unsafe-inline` ani `unsafe-eval`;
- DOCX/PDF helpery jsou verzovaně připnuté a kontrolované integritou, PDF worker je před spuštěním ověřen SHA-512;
- importy projektů, knihoven a sdílecích kódů mají velikostní a strukturální limity a normalizaci nedůvěryhodných dat;
- diagnostika odstraňuje citlivé části URL a rediguje běžné tokeny, klíče, e-maily a telefonní čísla;
- service worker neukládá runtime deployment profily do běžné aplikační cache;
- school-server konfigurace pravdivě deklaruje připravený, ale nepřipojený backend;
- GitHub Actions jsou připnuté na konkrétní commity a práva pro Pages jsou omezena na deploy job;
- doplněna GARP bezpečnostní regresní brána pro release kandidáty.

Tato verze je kandidát pro první nezávislou kontrolu Claude a není potvrzením, že externí centrální access guard AI Studia prošel auditem v tomto repozitáři.
