# ACTIVA 0.5.16 – GARP 2.3 security candidate

- Přidána skutečná klientská funkce „Ukončit práci a smazat lokální data“ pro rozpracovaný projekt, osobní knihovnu (IndexedDB + fallback), historii relace a lokální/relanční aplikační klíče.
- Funkce mazání je fail-closed při blokované IndexedDB a nemaže exportované soubory mimo prohlížeč.
- Zesílena AI trust boundary: importovaný/uživatelský zdroj je v prompt assembly explicitně označen jako nedůvěryhodná data a system/instruction vrstva zakazuje řídit se instrukcemi uvnitř zdroje.
- Rozšířen GARP regresní audit o kontrolu retention/deletion a AI trust boundary.
- Bez změny pedagogického workflow, formátů aktivit nebo sdílené vendorované platformní vrstvy.
