# ACTIVA 0.5.19 – oprava privacy a retention regresí po mimořádné kontrole

Datum: 2026-09-03

## Důvod verze

Mimořádná nezávislá kontrola kandidáta 0.5.18 potvrdila dvě nové HIGH regrese zavlečené předchozím opravným kolem: oslabení číselné detekce PII (N-11) a možnost, aby poškozená sdílená data jiné aplikace zablokovala smazání vlastních dat ACTIVA (N-12). Verze 0.5.19 opravuje pouze tyto lokalizované regrese a související metodiku testů; ostatní bezpečnostní vrstvy 0.5.18 zůstávají zachovány.

## Privacy – dvouúrovňový model

- `danger`: jednoznačnější PII blokuje AI egress – e-mail, RČ s lomítkem, označené RČ/ID včetně variant s/bez diakritiky, telefon s `+420`/`00420` nebo explicitním označením `telefon`, `tel.`, `mobil`, `kontakt`, označené celé jméno a adresa.
- `warn`: holé 9–10místné číselné hodnoty se považují za nejednoznačné. Nejsou automaticky blokovány jako matematické/fyzikální údaje, ale před odesláním AI vyžadují výslovné potvrzení učitele, že nejde o skutečné osobní údaje.
- V diagnostice se redigují obě úrovně, takže holé RČ bez lomítka i české pevné/mobilní číslo nejsou zapisovány v otevřeném tvaru.
- Opravena podpora označení bez diakritiky (`rodne cislo`, `telefonni cislo`) a hranice krátkých labelů (`id`, `rc`), aby slova typu `Pyramid`, `Covid`, `Madrid`, `hybrid`, `solid` nebo `Marc` nebyla chybně považována za PII kontext.

## Retention / Ukončit práci

- Mazání je rozděleno na dvě nezávislé fáze.
- Fáze 1 maže vlastní data ACTIVA: IndexedDB knihovnu, aplikační local/session storage, projekt, historii a API klíč. Pokud je vlastní IndexedDB blokovaná jinou kartou, zůstává zachováno původní fail-closed chování bez částečného mazání.
- Fáze 2 provádí cílený best-effort úklid sdílených platformních handoff/event klíčů. Poškozený nebo bezcílový cizí záznam se nemaže, ale už nemůže zabránit smazání vlastních dat ACTIVA; uživatel dostane pravdivé upozornění na částečný úklid sdílené vrstvy.

## Property testy

- Privacy korpus je odvozen od třídy problému, nikoli od konkrétních příkladů auditu: počáteční číslice 0–9, 9/10místné hodnoty, různé formáty, labely s/bez diakritiky a lexikální pasti.
- Retention testy pokrývají blokovanou vlastní IndexedDB, validní sdílená data, cizí validní data a několik tříd poškozených sdílených záznamů.
- Přidány negative controls proti návratu: příliš širokého blokujícího telefonního regexu, ztrátě broad-warning detekce, ztrátě ASCII labelů a opětovnému zablokování vlastního mazání cizími sdílenými daty.

## Stav

Jde o nový kandidát po potvrzených HIGH regresích v 0.5.18. Před vydáním vyžaduje nové nezávislé ověření. Do té doby nepoužívat reálná studentská data.
