# Technischer Bauplan für Raumly

## Dokumentstatus

- **Status:** Technische Richtung mit dem Nutzer schrittweise abgestimmt
- **Umsetzung:** Phasen 1 bis 3 sowie Phase 4A und 4B abgeschlossen; Phase 4C technisch umgesetzt und automatisiert geprüft, visuelle Nutzerfreigabe offen
- **Veröffentlichung:** Nicht freigegeben

## 1. Bestätigte technische Grundlage

### Next.js und TypeScript

Next.js wird als Grundlage der Webanwendung verwendet. TypeScript wird für die Programmlogik eingesetzt, um Datenformen und viele Fehler bereits während der Entwicklung zu erkennen.

Der bestehende HTML-/CSS-/JavaScript-Prototyp bleibt die visuelle und funktionale Referenz. Die Übertragung erfolgt kontrolliert und schrittweise; funktionierendes Verhalten soll erhalten bleiben.

### Supabase

Supabase ist als gemeinsame Grundlage vorgesehen für:

- Benutzerkonten und Anmeldung
- E-Mail-Bestätigung und Passwort-Wiederherstellung
- relationale Projektdaten
- private Speicherung von Originalfotos und Entwürfen
- Zugriffsregeln, damit Nutzer nur eigene Daten sehen
- Löschabläufe

Vor einer Einrichtung werden Region, Datenschutzbedingungen, Kosten und Löschmöglichkeiten erneut geprüft. Es wurde noch kein Supabase-Projekt freigegeben oder angelegt.

### KI-Anbindung

OpenAI wird als erster Kandidat für einen begrenzten Machbarkeitstest verwendet. Geprüft werden Möbelerkennung, Erhalt des ursprünglichen Raums, Stiltreue, Bildrealismus, Kosten und Laufzeit.

Die Anwendung erhält eine eigene interne KI-Schnittstelle, damit der Anbieter später gewechselt werden kann. OpenAI ist damit ein bestätigter Testkandidat, aber noch keine unumkehrbare Anbieterbindung.

### Interne Warteliste

Länger dauernde KI-Aufträge werden zunächst über eine einfache interne Warteliste organisiert. Jeder Auftrag besitzt einen nachvollziehbaren Zustand, zum Beispiel:

- wartet
- wird verarbeitet
- fertig
- fehlgeschlagen
- gelöscht

Ein zusätzlicher Warteschlangendienst wird erst eingeführt, wenn die interne Lösung nachweislich nicht ausreicht.

### Tests und Fehlerüberwachung

- **Vitest:** einzelne Regeln und Berechnungen
- **Playwright:** vollständige Abläufe auf Desktop und Mobilgerät
- **KI-Testbestand:** freigegebene Zimmerfotos mit menschlicher Qualitätsbewertung
- **Sentry:** erst vor einem geschlossenen Testbetrieb zur Fehlerüberwachung; private Inhalte müssen aus Fehlerberichten entfernt werden
- **GitHub Actions:** Build, Lint und Playwright laufen automatisch bei Pull Requests nach `main` und Änderungen an `main`; keine Veröffentlichung und keine Geheimnisse

## 2. Zusammenspiel der Systemteile

1. Next.js zeigt den Planungsablauf.
2. Der Nutzer gibt Stil, Postleitzahl, Budget und Hinweise an und lädt Fotos hoch.
3. Vor der Übertragung wird die Einwilligung zur KI-Verarbeitung eingeholt.
4. Supabase speichert die Fotos privat und ordnet sie einer Gast- oder Kontositzung zu.
5. Die KI erkennt Möbel und liefert strukturierte Vorschläge.
6. Der Nutzer korrigiert die Erkennung und legt „behalten“, „ersetzen“ oder „ergänzen“ fest.
7. Ein Auftrag wird in der internen Warteliste angelegt.
8. Die KI erzeugt den Entwurf.
9. Ergebnis, Farben und später Produktempfehlungen werden gespeichert und angezeigt.
10. Gastdaten werden beim erkannten Sitzungsende oder spätestens 24 Stunden nach letzter Nutzung gelöscht.
11. Bei einer Registrierung während der Gastplanung wird das Projekt dem neuen Konto übertragen.

## 3. Vorgesehenes Datenmodell

Die genauen Tabellen werden erst bei der Umsetzung entworfen und geprüft. Benötigte fachliche Datenbereiche sind:

- Benutzerkonto und achtstellige Kontonummer
- Einwilligungen und Widerrufe
- Gastnutzung und Ablaufzeitpunkt
- Zuhause-Projekte
- Räume
- Postleitzahlen je Projekt
- Gesamt- und Teilbudgets
- Originalfotos
- erkannte Möbel und Nutzerkorrekturen
- freie Planungshinweise
- KI-Aufträge und Versuche
- Entwürfe und Farbpaletten
- Lösch- und Wiederherstellungsstatus
- später Produkte, Händlerangebote und Lieferkostenschätzungen

Sicherheitsgrundsatz: Der Zugriff wird auf Datenbank- und Speicherebene auf den jeweiligen Nutzer beziehungsweise die temporäre Gastsitzung begrenzt.

## 4. Testkonzept

### Automatische Regeltests

- ein erfolgreicher Gastentwurf
- höchstens drei gespeicherte Entwürfe pro Raum
- korrekte Zählung und Löschung von Entwürfen
- strikte Budgetsicht A und B
- Gesamt- und Teilbudgets
- höchstens drei KI-Versuche nach der bestätigten Logik
- hartes monatliches Kostenlimit
- 24-Stunden-Regel für Gastdaten und Produktaktualität
- Löschfristen von 14 und 30 Tagen

### Integrations- und Sicherheitstests

- Anmeldung, E-Mail-Bestätigung und Passwort-Wiederherstellung
- Übernahme eines Gastprojekts in ein Konto
- private Fotoablage
- kein Zugriff auf fremde Projekte oder Fotos
- Einwilligung vor KI-Verarbeitung
- vollständige Löschabläufe
- sichere Behandlung fehlerhafter oder unerlaubter Uploads

### Browserprüfungen

Playwright prüft den vollständigen Ablauf mindestens in Desktop- und Mobilgröße: Projekt beginnen, Fotos hochladen, Möbel korrigieren, Budget setzen, Entwurf anfordern, Konto erstellen, Projekt speichern, erneut öffnen und löschen.

### KI-Qualitätsprüfung

Die erste frühe Prüfung erfolgt mit zwei echten Testpersonen und freigegebenen Fotos. Beide müssen:

- den Ablauf verstehen
- mindestens einen Entwurf als realistisch bewerten
- mindestens einen Entwurf als stilgerecht bewerten

Zentrale Möbel müssen zuverlässig erkannt werden. Kleine Fehler sind nur akzeptabel, wenn sie leicht korrigiert werden können. Die Anzahl späterer Testpersonen vor einer Veröffentlichung wird erneut entschieden.

## 5. Technische Risiken und Gegenmaßnahmen

### Ungenaue KI-Erkennung und Bildfehler

- Nutzerkorrektur vor Bilderzeugung
- Kennzeichnung als KI-Visualisierung
- Meldemöglichkeit für grobe Fehler
- eigener Qualitätstest vor Integration

### Fehlende Raummaße

- keine Garantie räumlicher Passform
- deutlicher Prüfhinweis vor Produktauswahl und Kauf
- Produkte ohne bekannte Maße werden nicht empfohlen

### Datenschutz bei Zimmerfotos

- ausdrückliche Einwilligung
- Warnung vor privaten Bildinhalten
- private Speicherung und minimale Zugriffsrechte
- dokumentierte Löschfristen
- europäische Speicherregion vor Einrichtung prüfen
- rechtliche Prüfung vor echten Nutzertests

### Kosten und Missbrauch

- hartes Limit von 20 Euro pro Monat in der ersten Entwicklungs- und Testphase
- maximal drei Versuche je Auftrag
- keine automatische Erhöhung des Limits
- weitere Gastnutzung nur nach Konto, soweit mit einfacher Browsermarkierung erkennbar

### Laufzeit und Ausfälle

- höchstens zwei Minuten pro Versuch
- nachvollziehbare Auftragszustände
- keine unvollständigen Ergebnisse bei Ausfall
- verständliche Fehlermeldungen

### Veraltete Händlerdaten

- höchstens 24 Stunden alte Preise und Verfügbarkeiten
- geschätzte Lieferkosten kennzeichnen
- erneute Prüfung beim Händler verlangen
- Händlerdatenquelle vor Anbindung auf Aktualität und Nutzungsrechte prüfen

### Anbieterabhängigkeit

- interne Schnittstellen für KI und Händlerdaten
- allgemein übertragbare Datenstrukturen
- neue kostenpflichtige Dienste nur nach Zustimmung

## 6. Schrittweiser Entwicklungsplan

### Phase 1: Dokumentation und sicherer Arbeitsstand

- PRD, Bauplan und Entscheidungen dokumentieren
- Widersprüche zu früheren Entscheidungen auflösen
- Dokumentation gemeinsam prüfen
- noch kein Anwendungscode

**Freigabekriterium:** Nutzer bestätigt die Dokumentation.

### Phase 2: Lokale technische Grundlage

- separaten Arbeitszweig oder Worktree verwenden
- Next.js und TypeScript lokal einrichten
- Vitest und Playwright einrichten
- keine Veröffentlichung

**Freigabekriterium:** lokaler Start, Build und Basistests funktionieren.

### Phase 3: Bestehenden Prototyp übertragen

- vorhandene Gestaltung und Navigation kontrolliert übernehmen
- Wohnzimmerablauf ohne echte KI nachbilden
- Desktop und Mobilgerät vergleichen

**Status:** Abgeschlossen am 25. August 2026. Der lokale Wohnzimmerablauf umfasst Designstil, bis zu fünf Bildvorschauen, deutsche Postleitzahl, Budget und ein lokales Planungsbriefing. Es erfolgt noch keine KI-Ausführung oder dauerhafte Speicherung. Ein Playwright-Regressionstest prüft den Hauptablauf in Desktop- und Mobilgröße.

**Freigabekriterium:** vorhandenes bestätigtes Verhalten bleibt erhalten.

### Phase 4: Planung mit lokalen Testdaten

- „Meine Projekte“, Zuhause und Räume
- Fotos und Möbelentscheidungen
- Stil, Hinweise, Gesamt- und Teilbudgets
- Entwurfsgrenzen und Vergleichsansicht
- noch keine echte KI oder externe Speicherung

**Teilstatus Phase 4A:** Abgeschlossen am 25. August 2026. Mehrere Zuhause-Projekte können lokal angelegt, geöffnet, umbenannt und nach Bestätigung gelöscht werden. Projektname, Wohnzimmerstil, Postleitzahl und Budget werden in einem versionierten Browserformat gespeichert. Fotos bleiben sitzungsgebunden und werden nicht dauerhaft gespeichert. Möbelentscheidungen, Entwurfsgrenzen und Vergleichsansicht bleiben offen.

**Teilstatus Phase 4B:** Abgeschlossen am 25. August 2026. Nach Auswahl eines sitzungsgebundenen Fotos kann der Nutzer eine deutlich gekennzeichnete Test-Erkennung mit sechs vorbereiteten Möbeln starten. Die Möbel werden platzsparend in einer kompakten Auswahl dargestellt; nur das ausgewählte Möbel zeigt seinen Bearbeitungsbereich. Möbel lassen sich korrigieren, entfernen, wiederherstellen und aus einem gruppierten Katalog ergänzen. Entscheidungen und Kommentare bleiben freiwillig; eine neutrale Vorgabe ist der Ausgangszustand. Möbelangaben und die allgemeine Raumnotiz werden lokal gespeichert. Vorhandene Projekte werden kontrolliert vom lokalen Datenformat Version 1 auf Version 2 migriert. Es findet weiterhin keine echte Fotoanalyse statt. Entwurfsgrenzen und Vergleichsansicht bleiben offen.

**Teilstatus Phase 4C:** Technisch umgesetzt und automatisiert geprüft am 25. August 2026; visuelle Nutzerfreigabe offen. Eine Aktion erzeugt drei eindeutig als Simulation gekennzeichnete Testentwürfe; nach einer Löschung wird nur die fehlende Variante ergänzt. Jeder Entwurf friert Stil, Budget, Postleitzahl, Möbelvorgaben, Kommentare und Raumnotiz zum Erstellungszeitpunkt ein und ergänzt eine vorbereitete Farbpalette und Konzeptbeschreibung. Entwürfe und Vergleichsergebnisse erscheinen auf Desktop und Mobil untereinander in „Ihre Planung“. Die Zusammenfassung des geöffneten Entwurfs erscheint direkt unter seiner Karte. Ein vierter Entwurf wird blockiert; einzelne Entwürfe können sofort gelöscht und unmittelbar wiederhergestellt werden. Das lokale Datenformat wird verlustfrei von Version 2 auf Version 3 migriert. Es findet weiterhin keine echte KI-Bildgenerierung statt.

**Freigabekriterium:** vollständiger Ablauf mit Testdaten besteht automatische Tests.

### Phase 5: Konten und private Speicherung

- Supabase erst nach erneuter Prüfung und Zustimmung einrichten
- Registrierung, E-Mail-Bestätigung und Passwort-Wiederherstellung
- private Fotos und Projekte
- Gastübernahme und Löschfristen
- Zugriffs- und Sicherheitstests

**Freigabekriterium:** Nutzer sehen nur eigene Daten und Löschabläufe funktionieren.

### Phase 6: Getrennter KI-Machbarkeitstest

- OpenAI-Zugang erst nach Kosten- und Datenschutzfreigabe einrichten
- freigegebene Beispielfotos verwenden
- Möbelerkennung und Bildbearbeitung messen
- Qualität, Laufzeit und Kosten auswerten

**Freigabekriterium:** vereinbarte Qualitätskriterien werden erreicht und Kosten bleiben im Limit.

### Phase 7: KI in Raumly integrieren

- interne Warteliste
- Versuchs- und Zeitlogik
- Entwurfserstellung und Farbpaletten
- Kostenkontrolle und Fehleranzeigen

**Freigabekriterium:** automatische Tests und KI-Qualitätsprüfung bestehen.

### Phase 8: Zwei interne Testpersonen

- erst nach Datenschutzprüfung und gesonderter Zustimmung
- noch keine öffentliche Veröffentlichung
- Ergebnisse dokumentieren und Produktprobleme priorisieren

**Freigabekriterium:** beide Testpersonen erfüllen die bestätigten Kriterien.

### Phase 9: Händleranbindung

- eigene Entscheidung und Planung
- Händler und Datenquellen auswählen
- Aktualität, Rechte, Preise, Verfügbarkeit und Lieferkosten prüfen
- verfügbare Alternativen und Händlerlinks integrieren

**Freigabekriterium:** Empfehlungen sind nachvollziehbar, aktuell und budgetkonform.

### Phase 10: Veröffentlichung

Nicht freigegeben. Hosting, Betrieb, Rechtstexte, Überwachung, Kosten und Veröffentlichung werden später separat geplant und benötigen ausdrückliche Zustimmung.

## 7. Bewusst offene technische Entscheidungen

- Hostinganbieter und Veröffentlichungszeitpunkt
- endgültige Auswahl und Vertragsprüfung der KI-Dienste
- konkrete Supabase-Region und Tarif
- konkrete Händler und Datenquellen
- Kaufmessung und Provisionslogik
- technische Umsetzung gesetzlicher Datenauskünfte
- Umfang der Fehlerüberwachung vor dem Testbetrieb
- Skalierung der internen Warteliste

