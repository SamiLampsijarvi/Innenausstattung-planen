# Phase 12A: Lokale Pilotoberfläche

## Ziel

Raumly erhält eine lokal vorbereitete Informationsseite für eine spätere Prüfung durch Affiliate-Netzwerke und Händler. Sie beschreibt das Zielprodukt für leere Wohnzimmer, ist aber weder eine Produkteinführung noch eine Freigabe des Planers.

## Betriebsarten

- Ohne `RAUMLY_PUBLIC_PILOT_MODE=true` bleibt der bisherige lokale Planer unter `/` unverändert verfügbar.
- Mit `RAUMLY_PUBLIC_PILOT_MODE=true` zeigt `/` ausschließlich die Pilotseite.
- `/impressum`, `/datenschutz` und `/affiliate-hinweis` enthalten lokale Vorlagen beziehungsweise transparente Hinweise.
- `/internal/*` und `/api/internal/*` antworten im Pilotmodus mit 404. Die bestehenden zusätzlichen Bild-KI-Sperren bleiben unabhängig davon aktiv.
- `robots.txt` verbietet im Pilotmodus die Aufnahme aller Seiten durch Suchmaschinen.

## Bewusste Grenzen

- Keine Veröffentlichung, Domain oder Hostingauswahl
- Keine Awin-Anmeldung oder Zahlung
- Keine echten Händler- oder Produktdaten
- Keine aktiven Affiliate- oder Kauf-Links
- Keine Bild-KI und keine Übertragung von Fotos
- Keine Analyse-, Marketing- oder externen Medienanbieter
- Keine erfundenen rechtlichen oder geschäftlichen Angaben

## Prüfung vor einer späteren Veröffentlichung

Vor dem Hosting müssen Betreiberangaben, ladungsfähige Anschrift, Kontaktangaben, gegebenenfalls Register- und Steuerangaben, Hostingdaten, tatsächliche Protokollierung, Rechtsgrundlagen und Speicherfristen ergänzt und fachlich geprüft werden. Hostinganbieter, Region, Domain, Kosten und Suchmaschinenstatus benötigen eine gesonderte Entscheidung.

## Abnahmekriterien

- Pilotseite und Rechteseiten funktionieren in Desktop- und Mobilgröße.
- Der Pilotmodus enthält keine Anmeldung, Datei-Auswahl oder Kaufmöglichkeit.
- Interne Oberfläche und interne API sind im Pilotmodus nicht erreichbar.
- `robots.txt` liefert im Pilotmodus `Disallow: /`.
- Der normale lokale Planer besteht seine bisherigen Regressionstests.
- Lint und Produktions-Build sind erfolgreich.
