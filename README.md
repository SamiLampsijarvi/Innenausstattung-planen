# Raumly – KI-gestützte Raumplanung

Raumly ist ein erster interaktiver MVP für eine Innenausstattungs-Plattform. Nutzer wählen Raum, Stil, Fotos, Budget und Einkaufsland. Daraus soll später ein KI-generiertes Raumkonzept mit regional verfügbaren Produktvorschlägen entstehen.

Der erste MVP richtet sich an deutschsprachige Mieter und Wohnungseigentümer, die ein Wohnzimmer innerhalb eines festen Budgets neu einrichten möchten. Deutschland ist das erste unterstützte Einkaufsland.

Das Wohnzimmer ist der erste MVP-Raum. Langfristig soll Raumly alle Räume eines Zuhauses planen und mehrere Wohnungen oder Häuser unter „Meine Projekte“ verwalten können.

## Projektdokumentation

- `PRD.md`: bestätigte Produktanforderungen und MVP-Grenzen
- `TECHNICAL_PLAN.md`: bestätigte technische Richtung, Risiken, Tests und Entwicklungsphasen
- `DECISIONS.md`: dauerhafte Produkt- und Architekturentscheidungen
- `AGENTS.md`: verbindliche Regeln für die Arbeit am Projekt

## Lokal starten

Die aktuelle Anwendung basiert auf Next.js und TypeScript. Nach der Installation der Abhängigkeiten startet `pnpm dev` den lokalen Entwicklungsserver. Der frühere Stand bleibt im Ordner `prototype` als Referenz erhalten.

## Prüfen

- `pnpm build`: Produktions-Build und TypeScript-Prüfung
- `pnpm lint`: statische Codeprüfung
- `pnpm test:e2e`: vollständiger Planungsablauf in Desktop- und Mobilgröße

Bei Pull Requests nach `main` und Änderungen an `main` führt GitHub Actions diese Prüfungen automatisch aus. Ein Playwright-Bericht wird nur bei einem Fehler für sieben Tage als GitHub-Artefakt gespeichert.

## Was bereits funktioniert

- Responsive Landingpage
- Geführter lokaler Planungsablauf
- Wohnzimmerplanung mit 9 Designstilen
- Responsive Navigation nach der bestätigten Seitenskizze
- Lokale Bildvorschau für bis zu fünf Fotos
- Budgetregler von 100 bis 10.000 Euro
- Deutsche Postleitzahleingabe ohne vollständige Adresse
- Lokale Zusammenfassung des Planungsbriefings ohne Übertragung oder Speicherung
- Mehrere lokal gespeicherte Zuhause-Projekte anlegen, öffnen, umbenennen und löschen
- Stil, Postleitzahl und Budget versioniert im Browser speichern und nach einem Neuladen weiterbearbeiten

## Bewusste MVP-Grenzen

- Noch keine Benutzerkonten oder externe Datenspeicherung
- Noch keine dauerhafte Fotospeicherung; Bilder müssen nach einem Neuladen erneut ausgewählt werden
- Noch keine echte KI-Bildgenerierung
- Noch keine Live-Produktpreise oder Händlerverfügbarkeit
- Noch keine Bezahlung

## Empfohlene nächste Phasen

1. Bestätigte Zielgruppe und Deutschland als Startmarkt mit Testnutzern validieren.
2. Planung mit lokalen Testdaten um Projekte, Möbelentscheidungen und Entwurfsgrenzen erweitern.
3. Backend, Datenbank, sichere Foto-Uploads und Anmeldung ergänzen.
4. KI-Bildbearbeitung mit Einwilligung, Moderation und Kostenlimit anbinden.
5. Zunächst 2–3 Händler-/Affiliate-Feeds für ein einziges Land integrieren.
6. Mit Testnutzern Qualität, Kaufabsicht und Zahlungsbereitschaft messen.

## Wichtigste Produktentscheidung

Die globale Händlersuche ist kein einzelnes Feature, sondern ein eigenes Datenprodukt. Für den Start sollte Raumly ein Land und wenige Händler unterstützen. Erst wenn Produktabgleich, Preisaktualität und Conversion funktionieren, wird auf weitere Länder skaliert.
