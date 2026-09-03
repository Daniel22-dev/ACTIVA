# ACTIVA 0.5.18 – privacy availability a evidence hardening

Datum: 2026-09-02

## Opravy po nezávislé kontrole kola 2

- A-01: privacy preflight už neklasifikuje libovolnou 9–10místnou číselnou hodnotu jako telefon/rodné číslo. Telefon je detekován podle +420/00420, českého mobilního prefixu nebo explicitního kontextu (telefon/tel./mobil/kontakt); rodné číslo podle formátu se lomítkem nebo explicitního kontextu (RČ/rodné číslo/ID).
- Přidána oboustranná regresní sada: syntetické PII musí být blokováno a sedm legitimních výukových textů s dlouhými čísly musí projít.
- A-02: `qa-garp-security` už nepřebírá zabalený PASS property reportu bez ověření; kontroluje verzi a SHA-256 tree snapshot relevantních zdrojů, workflow a distribuovaných artefaktů.
- A-03: předávací protokol pro 0.5.18 se generuje až z finálního kandidátního ZIPu a uvádí skutečné finální metriky.
- A-04: před mazáním se validují sdílené handoff/event záznamy. Poškozený JSON, chybějící target nebo neplatný tvar event logu způsobí atomický fail-closed před jakoukoli mutací lokálních dat.
- Diagnostický error reporter používá stejné kontextové numerické privacy vzory jako aplikace.
- Přidán čtvrtý skutečný negative control proti návratu příliš širokého telefonního regexu.

## Performance budget

`distBytes` je vědomě zvýšen z 845 000 na 855 000 B a `precacheBytes` z 760 000 na 765 000 B. Důvod: 0.5.17 měla pouze 899 B rezervu a 0.5.18 přidává security/evidence kód; změna je explicitní, nikoli tichá.

## Stav

Jde o nový kandidát po vyčerpání automatické smyčky GARP 2.3. Jakákoli změna distribuovaného kódu po nezávislé kontrole 0.5.17 vyžaduje nové výslovné nezávislé ověření. Do jeho dokončení nepoužívat reálná studentská data.
