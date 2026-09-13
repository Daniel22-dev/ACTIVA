# ACTIVA 0.5.27 — GARP 2.5.1 tooling closure ACT-N16 / ACT-N17

- Aplikační, pedagogická, datová i AI logika zůstává proti 0.5.26 věcně beze změny; změna runtime je pouze synchronizace verze/cache identifikátoru.
- Kanonický service-worker checker uzavírá ACT-N16: behaviorální sandbox nyní zachovává identitu `self.caches`/globální Cache Storage, takže detekuje i dynamický a reflexivní přístup (`self['ca'+'ches']`, `Reflect.get(self,'caches')`).
- Kanonický checker uzavírá ACT-N17: při syntetickém síťovém selhání musí `networkOnlyNoStore` skutečně selhat fail-closed — vyhodit chybu nebo vrátit explicitně neúspěšnou odpověď. Vyrobená úspěšná `Response(200)` je FAIL.
- Kanonický selftest přidává negativní kontroly pro oba dynamické Cache Storage bypassy a manufactured-success response; explicitní 503 response je pozitivní fail-closed kontrola.
- Dokumentace výslovně zapisuje DOM kontrakt s centrálním app-guardem: UI brány, které má zůstat viditelné ve stavu `denied`, musí nést třídu `.ghrab-access-gate`.
- Produkční school-server, RI-LIVE, SHIELD-LIVE, RI-14 a live AIR tímto PREP kolem nejsou povoleny.
