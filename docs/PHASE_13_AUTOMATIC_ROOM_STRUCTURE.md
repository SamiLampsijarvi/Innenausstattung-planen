# Phase 13 – automatische Raumstrukturprüfung für Gesamtbilder

## Freigegebener Umfang

Raumly soll ein vollständiges Japandi-Bild eines leeren Wohnzimmers erzeugen, ohne dass der Nutzer eine Möbelzone markiert. Die externe KI bleibt ausgeschaltet. Dieser Abschnitt implementiert ausschließlich die lokale Prüfung und löst keine Vertex-Anfrage aus.

## Technischer Ablauf

1. Vertex erzeugt später weiterhin einen vollständigen Bildkandidaten.
2. Der Kandidat wird vor jeder Speicherung serverseitig mit dem Original verglichen.
3. Die Prüfung vergleicht Seitenverhältnis, Erhalt starker Raumkanten, Richtungen der Raumlinien und deren regionale Verteilung.
4. Die Schwellen sind konservativ. Eine unlesbare oder uneindeutige Antwort wird automatisch verworfen.
5. Nur ein automatisch bestandener Kandidat wird privat gespeichert und für die bestehende menschliche Original-/Ergebnisprüfung freigegeben.
6. Ein automatisch verworfener Kandidat wird nicht gespeichert oder angezeigt. Versuch, Laufzeit, Anbieterkennung, Kostenreservierung und ein kleiner Prüfbericht bleiben nachvollziehbar.

Die Prüfung verändert oder maskiert das Bild nicht. Sie ist ein Vorfilter und keine mathematische Garantie, dass ein semantisch neues Architekturelement niemals übersehen wird. Im kontrollierten Pilot bleibt deshalb die menschliche Prüfung verpflichtend.

## Kosten- und Betriebsgrenze

- Offline-Implementierung und synthetische Tests verursachen keine KI-Kosten.
- Vor einem weiteren Vertex-Versuch müssen die derzeit 0,60 Euro Reservierung mit Google Billing abgeglichen und Preis, Datenschutz sowie genau ein neuer Versuch erneut freigegeben werden.
- Der normale Planungsablauf bleibt unverändert; der Mechanismus ist nur an `/internal/image-test` angeschlossen.
- Keine automatische Wiederholung und kein zusätzlicher externer Prüfaufruf.

## Technische Abnahme

- Farbänderungen bei identischer Struktur können bestehen.
- Verschobene Perspektivlinien und ein geänderter Bildausschnitt werden abgelehnt.
- Ergebnisse ohne bestandenen Prüfbericht werden nicht gespeichert.
- Automatische Ablehnung löscht keine Buchhaltung und gibt kein Kontingent zurück.
- Menschliche Annahme bleibt zusätzlich erforderlich.
- Build, Lint, Datenbanktests sowie Desktop- und Mobiltests bestehen.

