# ACTIVA 0.5.12 – GARP kandidát pro Claude, kolo 2

Datum: 27. 8. 2026

- Claudeův nález A1 z prvního kola byl potvrzen: detektor označeného celého jména používal case-sensitive prefix a míjel běžné české zápisy s velkým počátečním písmenem.
- Pravidlo nyní používá příznaky `gi`; blokuje mimo jiné `Žák: Petr Svoboda`, `Jméno: Petr Svoboda`, `Student: Petr Svoboda` a `Matka: Jana Nováková`.
- Do GARP regresní brány byly přidány testy přesně nad produkčním pravidlem, aby se chyba nemohla vrátit pouhou změnou testovací kopie regulárního výrazu.
- Byla doplněna adversariální importní kontrola nad produkčními normalizačními funkcemi: neplatné schéma, nepovolené typy, počty a délky, `__proto__`/nepovolená pole a knihovní `forcePersonal`.
- Tato kontrola odhalila a opravila whitelist bypass přes zděděné klíče JavaScript objektů (`__proto__`, `constructor`, `toString`) u typů aktivit a předmětového balíčku.
- Ostatní opravy z 0.5.11 zůstávají beze změny; nejde o rozšíření funkcí ani změnu pedagogického workflow.

Tato verze je kandidát pro druhou nezávislou kontrolu Claude.
