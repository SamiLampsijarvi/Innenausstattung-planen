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

Die aktuelle Version benötigt keine Installation. `index.html` kann direkt im Browser geöffnet werden. Komfortabler ist ein lokaler Webserver, zum Beispiel mit VS Code Live Server.

## Was bereits funktioniert

- Responsive Landingpage
- Geführter Vier-Schritte-Planer
- Wohnzimmerplanung mit 9 Designstilen
- Responsive Navigation nach der bestätigten Seitenskizze
- Lokale Bildvorschau für bis zu fünf Fotos
- Budgetregler von 100 bis 10.000 Euro
- Auswahl des Einkaufslandes
- Freiwillige, nicht gespeicherte Standorterkennung mit Postleitzahl-Alternative
- Zusammenfassung des Planungsbriefings

## Bewusste MVP-Grenzen

- Noch keine Benutzerkonten oder Datenspeicherung
- Noch keine echte KI-Bildgenerierung
- Noch keine Live-Produktpreise oder Händlerverfügbarkeit
- Noch keine Bezahlung

## Empfohlene nächste Phasen

1. Bestätigte Zielgruppe und Deutschland als Startmarkt mit Testnutzern validieren.
2. Frontend auf eine produktionsfähige App-Basis übertragen.
3. Backend, Datenbank, sichere Foto-Uploads und Anmeldung ergänzen.
4. KI-Bildbearbeitung mit Einwilligung, Moderation und Kostenlimit anbinden.
5. Zunächst 2–3 Händler-/Affiliate-Feeds für ein einziges Land integrieren.
6. Mit Testnutzern Qualität, Kaufabsicht und Zahlungsbereitschaft messen.

## Wichtigste Produktentscheidung

Die globale Händlersuche ist kein einzelnes Feature, sondern ein eigenes Datenprodukt. Für den Start sollte Raumly ein Land und wenige Händler unterstützen. Erst wenn Produktabgleich, Preisaktualität und Conversion funktionieren, wird auf weitere Länder skaliert.
