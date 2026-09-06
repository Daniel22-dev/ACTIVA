# ACTIVA 0.5.22 – architektura

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
9. PWA a úplná offline dokumentace.
