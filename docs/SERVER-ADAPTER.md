# Budoucí připojení školního serveru

ACTIVA 0.5.4 je záměrně bezserverová. `src/js/35-persistence-adapter.js` deklaruje smlouvu pro projektové a knihovní úložiště. Budoucí serverová implementace musí řešit školní přihlášení, role, šifrovaný přenos, oddělení osobních a školních materiálů, audit bez obsahu žákovských dat, kvóty, zálohy a migraci lokálních projektů. Aktivace vyžaduje novou verzi aplikace a nesmí proběhnout pouhou změnou URL.

## DOM kontrakt centrální přístupové brány

Při budoucím serverovém nasazení zůstává Access Guard autoritativní pro povolení/odmítnutí. Pokud centrální app-guard vykresluje do `<body>` vlastní stavové UI a toto UI má být viditelné i při `data-ghrab-access="denied"`, musí jeho kořen nést třídu `.ghrab-access-gate`. ACTIVA tuto třídu explicitně vyjímá ze skrytí shellu. Bez ní je vložený prvek považován za součást chráněného obsahu a zůstane skrytý.
