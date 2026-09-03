# ACTIVA 0.5.17 — GARP 2.3 opravný kandidát

Tato verze vznikla v opravném kole po nezávislé kontrole kandidáta 0.5.16. Je určena k **druhé nezávislé Claude kontrole**, nikoli jako finální release pro reálná studentská data.

## Bezpečnost a soukromí

- Všechna textová pole ovládaná uživatelem/importem (`subject`, `grade`, `topic`, `goal`, `mode`, `sourceText`) jsou serializována uvnitř jediného nedůvěryhodného JSON bloku.
- Boundary markery jsou z uživatelských hodnot odstraněny před sestavením promptu.
- Privacy preflight kontroluje všech šest AI vstupních polí a sdílí detekční pravidla s diagnostickou redakcí.
- Diagnostika rediguje e-mail, telefon, rodné číslo / dlouhý identifikátor, označené celé jméno a adresu.
- Ukončení práce odstraňuje cílené Studio handoff packety a vlastní pilot events, ale zachovává data cizích aplikací.
- Manifest retence a mazání nyní odpovídá serverless implementaci.
- Meta CSP se při buildu generuje z `security-headers.json`; školní serverový profil obsahuje HSTS.
- Produkční legacy-AI testovací přepínač byl odstraněn a AI privacy metadata již nejsou bezpodmínečně deklarována jako splněná.
- GitHub Actions používají `npm ci --ignore-scripts`; zápisová práva synchronizačního workflow jsou job-scoped.
- Standalone HTML export má nonce CSP.

## Důkazní změny

- Nová GARP property gate testuje skutečný sestavený prompt, privacy detekci, retention/handoff a release konfiguraci.
- Negative controls probíhají na disposable kopiích a musí prokazatelně shodit chráněnou vlastnost.
- Secret scan zahrnuje distribuovaný `dist` a QA výstupy.
- Pairwise/combinatorial kontrola je výslovně označena jako validace konfigurací, ne jako browser/runtime execution evidence.

## Omezení

Browserové lifecycle/SIM testy, guard E2E, live-model AIR kampaň a organizační RT-16 attestation mohou zůstat podle dostupnosti prostředí `NOT TESTED`. Do uzavření druhého nezávislého kola platí: **pouze syntetická data**.

- Performance budget: `precacheBytes` byl po bezpečnostním hardeningu vědomě upraven z 755 000 na 760 000 B; skutečný build zůstává pod limitem.
