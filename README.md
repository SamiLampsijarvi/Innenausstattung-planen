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
- Möbel mit klar gekennzeichneten Testdaten simulieren und über eine kompakte Auswahl einzeln bearbeiten, korrigieren, entfernen oder ergänzen
- Freiwillige Vorgaben und Kommentare je Möbelstück sowie eine allgemeine Raumnotiz lokal speichern
- Bis zu drei klar gekennzeichnete lokale Testentwürfe erstellen, untereinander anzeigen, öffnen, löschen und vergleichen
- Konto mit E-Mail-Bestätigung anlegen, anmelden und abmelden
- Private Zuhause-Projekte und Raumfotos in Supabase speichern und nach einer erneuten Anmeldung laden
- Passwort-Wiederherstellung starten
- Projekte 30 Tage im Papierkorb aufbewahren, wiederherstellen und anschließend automatisiert endgültig löschen
- Kontolöschung mit 14-tägiger Widerrufsfrist beantragen und widerrufen

## Bewusste MVP-Grenzen

- Benachrichtigungs-E-Mails für Kontolöschungen sind technisch vorbereitet, aber noch nicht mit einem E-Mail-Anbieter verbunden oder veröffentlicht
- Der verwendete kostenlose Supabase-Tarif erstellt keine automatischen Datenbanksicherungen; vor einer öffentlichen Veröffentlichung wird ein passendes Sicherungs- und Löschkonzept benötigt
- Gastprojekte bleiben lokal; die automatische Übernahme eines Gastprojekts in ein Konto ist noch offen
- Noch keine echte KI-Möbelerkennung oder Bildgenerierung; die angezeigten Möbel sind ausdrücklich Testdaten
- Testentwürfe enthalten vorbereitete Konzepte und Farbpaletten, aber noch keine erzeugten Raumbilder
- Manuelle KI-Versuche lieferten überzeugende Inspirationsbilder, bewahrten vorhandene Möbel, Raumdetails und Budgets aber nicht zuverlässig exakt; zukünftige KI-Bilder sind daher keine maßgenaue Planung oder Kostengarantie
- Noch keine Live-Produktpreise oder Händlerverfügbarkeit
- Noch keine Bezahlung

## Empfohlene nächste Phasen

1. Den vorbereiteten E-Mail-Versand nach gesonderter Freigabe mit einem Anbieter verbinden und im Entwicklungsprojekt prüfen.
2. Den offenen API-Teil des KI-Machbarkeitstests mit Einwilligung und festem Kostenlimit durchführen.
3. KI-Bildbearbeitung als klar gekennzeichnete Inspiration mit Moderation, Fehlerbehandlung und Kostenlimit anbinden.
4. Bestätigte Zielgruppe, Planungsablauf und KI-Ergebnisse später mit Testnutzern validieren.
5. Zunächst 2–3 Händler-/Affiliate-Feeds für ein einziges Land integrieren.
6. Mit Testnutzern Qualität, Kaufabsicht und Zahlungsbereitschaft messen.

## Wichtigste Produktentscheidung

Die globale Händlersuche ist kein einzelnes Feature, sondern ein eigenes Datenprodukt. Für den Start sollte Raumly ein Land und wenige Händler unterstützen. Erst wenn Produktabgleich, Preisaktualität und Conversion funktionieren, wird auf weitere Länder skaliert.
