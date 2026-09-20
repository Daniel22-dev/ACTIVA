# ACTIVA 0.5.27 – architektura

ARCHITEKTURA: SERVERLESS

ACTIVA odděluje obsah aktivit, editor, tiskové renderery, projekci, knihovnu a perzistenci. `ACTIVA_PERSISTENCE` je jediná veřejná vstupní vrstva pro ukládání. Aktuální poskytovatel používá localStorage a IndexedDB s lokální zálohou. Serverová konfigurace má `enabled:false`; budoucí konektor může nahradit poskytovatele bez změny editoru.

## Vrstvy

1. registry 39 aktivit,
2. předmětové a skupinové balíčky,
3. generování a validace,
4. diferenciace a varianty,
5. tisk, řešení a projekce,
6. osobní/školní knihovna,
7. persistence adapter,
8. AI Studio bridge, Access Guard, diagnostika a telemetrie,
9. PWA cache pro aplikační a dokumentační obsah; bezpečnostně kritické ověření přístupu je vždy network-only a při nedostupnosti selže fail-closed s viditelnou záložní hláškou.

## Kontrakt Access Guard UI

ACTIVA řídí viditelnost shellu podle `html[data-ghrab-access]`. Ve stavech `checking` a `denied` zůstává aplikace fail-closed a vlastní aplikační obsah je skrytý. Centrální app-guard smí do `<body>` vložit své vysvětlující/obslužné UI; aby toto UI zůstalo ve stavu `denied` viditelné vedle lokální fallback hlášky ACTIVA, jeho kořenový prvek musí nést třídu `.ghrab-access-gate`.

Třída `.ghrab-access-gate` je integrační kontrakt mezi ACTIVA a AI Studiem, nikoli obecná CSS dekorace. Změna názvu nebo selektoru vyžaduje koordinovanou změnu obou stran a nový browserový access-gate retest. Prvek bez této třídy je ve stavu `denied` záměrně skryt spolu s aplikačním shellem.


## Release governance

ACTIVA používá durable větev `candidate` a chráněný `main`. Produkční release nevzniká z pracovní větve.

Kanonický řetězec je:

`candidate → P5/axe → promotion PR → protected main → main P5 → GitHub Pages → live release verification → app-updated dispatch`

Ruleset na `main` vyžaduje pull request a povinné kontroly `candidate-to-main`, `p5-release-gate` a `axe`, blokuje force-push i mazání a nemá bypass aktéry. Release identity používá kontrakt `ghrab-release-integrity-v2` a váže appId/verzi na source commit, artifact digest, manifest, SBOM, build provenance a security evidence manifest.

Aktualizace GHRAB AI Core vstupují přes draft PR do `candidate`, nikoli přímo do `main`.
