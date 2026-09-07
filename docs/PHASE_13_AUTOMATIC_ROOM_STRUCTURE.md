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
- Der Billing-Abgleich vom 3. September 2026 weist 0,06 Euro bisherigen Vertex-Verbrauch und wegen des Testguthabens 0,00 Euro zahlbaren Betrag aus. Die vorsorgliche interne Reservierung bleibt bei 0,60 Euro.
- Vor einem weiteren Vertex-Versuch müssen Preis, Datenschutz, das konkrete Foto und genau ein neuer Versuch erneut freigegeben werden.
- Der normale Planungsablauf bleibt unverändert; der Mechanismus ist nur an `/internal/image-test` angeschlossen.
- Keine automatische Wiederholung und kein zusätzlicher externer Prüfaufruf.

## Technische Abnahme

- Farbänderungen bei identischer Struktur können bestehen.
- Verschobene Perspektivlinien und ein geänderter Bildausschnitt werden abgelehnt.
- Ergebnisse ohne bestandenen Prüfbericht werden nicht gespeichert.
- Automatische Ablehnung löscht keine Buchhaltung und gibt kein Kontingent zurück.
- Menschliche Annahme bleibt zusätzlich erforderlich.
- Build, Lint, Datenbanktests sowie Desktop- und Mobiltests bestehen.

## Betriebsabnahme am 3. September 2026

Die Migrationen `202609030001_expired_image_test_arm.sql` und `202609030002_automatic_room_structure_gate.sql` sind im Supabase-Projekt vorhanden. Die Abfrage bestätigt beide neuen Prüffelder, die Abschlussberechtigung nur für den Server sowie einen ausgeschalteten Test ohne aktiven Versuch. Es wurde dabei kein Foto an Vertex übertragen und keine Bildgenerierung gestartet.
