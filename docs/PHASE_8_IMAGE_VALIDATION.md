# Phase 8 – Inspirationsbilder bis zur Produktentscheidung

## Auftrag und aktueller Stand

Der Nutzer hat am 31.08.2026 die zuvor erläuterte Gesamtphase beauftragt, mit Rückfrage vor Kosten. Diese Phase erweitert den älteren Abschnitt „Zwei interne Testpersonen“ um die zuvor fehlende echte KI-Erprobung und den Anbieterentscheid. Ausgangspunkt ist GitHub-main `36b91f4` nach Phase 7. Google bleibt ausgeschaltet. Dieser Stand erledigt die kostenfreie Vorbereitung und die nachfolgende Kostenbremse, nicht die gesamte Phase 8.

Kostenfreier Umfang: aktuelle Anbieterunterlagen prüfen, die Eingabegrenze korrigieren, Testfälle und Bewertungsregeln vorbereiten, eine lokale Auswertung mit Tests bereitstellen und alles auf dem eigenen Branch speichern. Anschließend wurde mit Nutzerfreigabe ein separates Google-Testprojekt mit verknüpfter Abrechnung angelegt und eine monatliche Vertex-AI-Ausgabenobergrenze von 4 € eingerichtet. Sie gilt nur für dieses Projekt und Vertex AI, pausiert den Dienst bei Erreichen und benachrichtigt bei 50 %, 80 % und 100 %. Google weist weiterhin auf mögliche Verzögerungen und geringfügige Überschreitungen bei bereits laufenden Anfragen hin; die 4 € lassen deshalb Puffer zum 5-€-Ziel. Die Agent Platform API ist aktiviert. Ein dediziertes, aktives Dienstkonto besitzt ausschließlich die von Google für diesen Zugriff vorgesehene Rolle `roles/aiplatform.user` und hat keinen herunterladbaren Schlüssel. Es gibt keine Testmitglieder oder echten Fotoübertragungen. Die lokale Application-Default-Anmeldung übernimmt ausschließlich dieses Dienstkonto; ihre kurzlebige Tokenausgabe wurde ohne Modellaufruf erfolgreich geprüft. Die beiden Raumly-Schalter bleiben aus, sodass keine externe Bildanfrage möglich ist. Der normale Planungsablauf bleibt unverändert. Die vorhandenen 5-Foto-/2-Versuche-/300-Cent-Grenzen werden nicht zurückgesetzt oder erweitert.

## Arbeitsabschnitte und Abschlussbedingungen

| Abschnitt | Ergebnis | Voraussetzung |
| --- | --- | --- |
| Vorbereitung | Bewertungsbogen, Testprofile, belegte Anbieterinformationen, getestete Schutzkorrektur | Kostenfrei umgesetzt |
| Erster echter Vertex-Versuch | Ein Bild mit Laufzeit, Bewertung und geklärter Abrechnung | Kostenfreigabe, geeigneter Zugang, geprüfte Bedingungen und konkret zugelassenes Foto |
| Kleiner Pilot | Höchstens fünf Fotos, zwei bewusste Versuche je Foto | Nach jedem Versuch abschalten, abrechnen und nächste Ausführung bewusst freigeben |
| Anbieterbewertung | Gleiche 20–30 Fälle für beide Anbieter, Bewertung ohne Anbieternamen | Separater Testumfang und Budget; der kleine Pilot erlaubt keine endgültige Wahl |
| Interner Produktablauf | Sichere Einwilligung, Warten/Fehler, privates Ergebnis und Löschung | Überzeugende Qualität und Freigabe der Produktintegration |
| Zwei interne Testpersonen | Beide verstehen den Ablauf und finden je mindestens ein Bild realistisch und stilgerecht | Datenschutzprüfung und Freigabe des geschlossenen Nutzertests |
| Abschluss | Dokumentiertes Weiterführen, Nachbessern oder Stoppen | Daten, Kosten und Einschränkungen nachvollziehbar; keine öffentliche Veröffentlichung |

Die breitere Integration wird erst nach ausreichender Bildqualität gebaut. Eine negative Produktentscheidung ist ein zulässiges Ergebnis. Öffentliches Hosting, Händlerdaten und Bezahlung gehören nicht zu dieser Phase.

## Aktuelle Anbieterprüfung vom 31.08.2026

Das konfigurierte Modell bleibt `gemini-3.1-flash-image`, global, 1K, ein Kandidat, maximal 2048 Ausgabetokens und keine automatischen Wiederholungen. Google nennt für Inline-Eingabebilder 7 MB. Der Testpfad verwendet deshalb konservativ höchstens 7.000.000 Bytes; die Prüfung greift bei Fotozulassung, vor der Reservierung und zusätzlich im Adapter vor dem Aufruf. Normale Fotoablage und Ergebnisgrenze bleiben unverändert. [Modellquelle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image).

Die aktuelle Standardpreisliste nennt 0,50 USD je Million Eingabetokens, 3 USD je Million Text-/Denkausgabetokens und 60 USD je Million Bildausgabetokens. Ein 1K-Ausgabebild verwendet laut Dokumentation 1120 Bildtokens: rechnerisch 0,0672 USD, zuzüglich Eingabe und weiterer Ausgaben. Das ist weder ein verbindlicher Endpreis noch die freizugebende Anfrageobergrenze. Euro-SKUs, Steuern, Eingabe-/Ausgabetokenumfang und mögliche Zusatzkosten müssen zum konkreten Abrechnungskonto geprüft werden. [Preisquelle](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

Google Spend Caps sind eine zusätzliche Schutzmaßnahme für einzelne Projekte und Dienste. Sie werden nicht sofort durchgesetzt; laufende Anfragen und Überschreitungen können berechnet werden. Die Prüfung belegt deshalb keine absolute 5-Euro-Garantie. Verfügbarkeit und Einstellung im konkreten Konto wurden nicht geprüft. [Spend-Cap-Quelle](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).

Googles Datenverarbeitungsunterlagen unterscheiden Training, Missbrauchsprüfung, Protokollierung und weitere Funktionen. Kein Training ohne entsprechende Erlaubnis bedeutet nicht automatisch keine Speicherung. Wir geben keine pauschale EU-only- oder Zero-Retention-Zusage. Konkreter Vertrag, verantwortliche Stelle, anwendbare Speicherfristen und geeigneter Einwilligungstext bleiben vor echter Verarbeitung zu klären. Diese technische Bestandsaufnahme ist keine juristische Freigabe. [Datenverarbeitungsquelle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention).

## Praktische Vorbereitung des ersten Versuchs

1. Nach Kostenfreigabe ein dediziertes Google-Testprojekt und dessen Abrechnung prüfen/einrichten. Keine weiteren kostenpflichtigen Dienste oder öffentliche Bereitstellung. Keine Probeaufrufe außerhalb der Testbuchhaltung.
2. Modellzugang, aktuellen Europreis und konservative Anfrageobergrenze nachweisen. 300 Cent bleiben die gesamte interne Reservierungsgrenze, 500 Cent das gewünschte Gesamtkostenbudget. Einen konkreten Reservierungsbetrag nicht aus dem reinen Bildpreis ableiten; bei ungeklärter Obergrenze ausgeschaltet lassen.
3. Eng begrenzten Serverzugang ohne dauerhaft heruntergeladenen Dienstkontoschlüssel vorbereiten. Die Supabase-Serverkonfiguration bleibt lokal außerhalb Git. Vorhandene Abschaltmechanismen und `supabase/checks/phase7_acceptance.sql` prüfen.
4. Nur ein benanntes Testkonto zulassen. Ein neutrales Wohnzimmerfoto mit geklärten Rechten und bereinigten Metadaten auswählen. Ein persönliches Foto des Nutzers ist nicht erforderlich; derzeit wurde kein echtes Foto ausgewählt oder zugelassen.
5. Die getrennte KI-Einwilligung im vorhandenen Testbereich erteilen und das konkrete Foto zulassen. Ein allgemeiner Entwicklungsauftrag ersetzt diese Zustimmung nicht. Stil und Budget vor dem Versuch kontrollieren.
6. Für genau einen Versuch den geprüften Preis und die kurze Freigabefrist hinterlegen. Nach Übernahme der Betreiber-Migration kann dies lokal und ohne Dashboard-Anmeldung mit `pnpm arm:image-test --confirm` geschehen: Der Befehl aktiviert nur die serverseitige Buchhaltung für zehn Minuten mit 30 Cent Reservierung, während die externe KI ausgeschaltet bleiben muss. Nach dem Versuch externe KI wieder ausschalten, Ergebnis bewerten und Google-Abrechnung abwarten. Ein unbekannter Ausgang bleibt gesperrt; keine Rücksetzung der Reservierungen.

Der Google-Zugang ist eingerichtet und ohne Modellaufruf geprüft. Vor dem ersten echten Versuch fehlen weiterhin ein geeignetes, konkret freigegebenes Foto, die getrennte KI-Einwilligung sowie die Prüfung von Preis und Reservierung für genau diesen Versuch. Es wurden keine Kosten ausgelöst. Diese fehlenden Voraussetzungen können nicht durch Softwaretests ersetzt werden.

## Testprofile und Bewertung

Die folgenden Profile sind Auswahlhilfen, keine vorhandenen Fotos und keine zusätzlichen Produktanforderungen. Vor Beginn werden konkrete Fälle festgelegt; schlechte Ergebnisse werden nicht nachträglich aus dem Bestand entfernt.

| Kennung | Vorgeschlagenes Wohnzimmerprofil | Schwerpunkt |
| --- | --- | --- |
| F01 | Heller, übersichtlicher Raum | Ausgangsqualität und Stil |
| F02 | Kleiner oder schmaler Raum | Geometrie und Platzverhältnisse |
| F03 | Wenig Licht oder Gegenlicht | Bildqualität bei schwieriger Beleuchtung |
| F04 | Viele vorhandene Möbel | Raumtreue und störende Bildfehler |
| F05 | Ungewöhnlicher Blickwinkel | Perspektive, Fenster und Türen |

Jedes erfolgreiche Ergebnis erhält fünf ganzzahlige Bewertungen von 1 bis 5: `room` (Raumtreue), `style` (Stiltreue), `realism` (Realismus), `usefulness` (Nutzbarkeit), `accuracy` (Fehlerfreiheit). 1 bedeutet unbrauchbar, 3 ausreichend mit erkennbaren Einschränkungen, 5 sehr überzeugend. Brauchbar verlangt mindestens 3 bei Raumtreue und Nutzbarkeit. Raumtreue und Nutzbarkeit zählen im Qualitätsmittel doppelt; die übrigen Werte einfach.

Fehlversuche zählen bei der Brauchbarkeitsquote mit. Unbekannter Ausgang oder fehlende Bewertung verhindert eine abschließende Quote. Abgerechnete Fehlversuche zählen zu den Kosten pro brauchbarem Ergebnis. Zusätzlich wird die Quote der ersten Versuche separat gezeigt, damit Wiederholungen den Vergleich nicht verdecken. Der Qualitätsmittelwert bezieht sich nur auf bewertete Bilder und wird entsprechend bezeichnet.

## Lokale Auswertung ohne Bilder oder Anbieteraufrufe

Die leere Vorlage `docs/templates/image-evaluation.example.json` nach `private-evaluation/pilot.json` kopieren. Dieser Ordner ist von Git ausgeschlossen. Die Datei enthält keine Fotos, Originaldateinamen, Kontonummern, E-Mails, Zugangsdaten oder Anbieterantworten. Die Zuordnung der anonymen Fallkennungen zu echten Aufträgen bleibt getrennt in geschützter Betreiberverwaltung; auch pseudonyme Auswertungsdaten nicht veröffentlichen und nach der Auswertung entsprechend dem Löschkonzept entfernen.

Ein einzelner Datensatz in `attempts` sieht so aus (nur Formbeispiel, kein echter Versuch):

```json
{"caseId":"F01","variant":"A","attempt":1,"status":"succeeded","durationMs":1500,"actualCents":null,"scores":{"room":3,"style":4,"realism":4,"usefulness":3,"accuracy":4}}
```

Aufruf: `pnpm evaluate:images private-evaluation/pilot.json`. Nur lokale JSON-Daten werden gelesen; Ausgabe erfolgt im Terminal, ohne Dateien zu speichern. `pnpm evaluate:images docs/templates/image-evaluation.example.json` demonstriert den noch leeren Stand. Reale Berichte nicht in GitHub-Issues, CI-Protokolle oder Chat kopieren.

`actualCents` bleibt bis zum Abgleich `null`, niemals geschätzt null Euro. Nach geklärter Abrechnung sind auch Bruchteile eines Cents zulässig. `durationMs` darf bei unbekannter Laufzeit `null` sein. `status` ist `succeeded`, `failed` oder `unknown`; fehlgeschlagene/ungeklärte Versuche erhalten keine Bildbewertung. `scores` darf bei noch fehlender Bewertung `null` sein. Alle begonnenen Versuche müssen erfasst werden, einschließlich abgebrochener. Ein zweiter Versuch ohne dokumentierten ersten wird abgewiesen. Das Werkzeug überprüft die Eingabe, kann aber keine ausgelassenen echten Aufträge erkennen: vor der Bewertung mit der serverseitigen Buchhaltung abgleichen.

Im Pilot ist eine anonyme Variante A oder B erlaubt. Beim späteren Vergleich werden dieselben vorab festgelegten 20–30 Fallkennungen für A und B verwendet. Anbieterzuordnung, Modellversion, identische Stil-/Budgetvorgaben und zufällige Präsentationsreihenfolge hält der Betreiber getrennt von den Bewertungen fest. Das Werkzeug erzeugt selbst keine Bilder und organisiert keine automatische Verblindung.

`readyForHumanComparison` ist nur eine Vollständigkeitsprüfung: vollständige Fallabdeckung, geklärte Ergebnisse, Bewertungen und Kosten innerhalb des eingetragenen Budgets sowie dokumentierte Datenschutzprüfung. Es ist keine Anbieterwahl. `qualityThresholdCandidates` zeigt ausschließlich die 80-Prozent-Schwelle. Auch beim Erreichen dieser Schwelle bleibt ein Pilot ungeeignet für eine endgültige Wahl. Kein Feld dieser lokalen Datei kann die echte Kampagne aktivieren, deren Grenzen erhöhen oder eine Freigabe ersetzen.

## Prüfungen und Grenzen des Zwischenstands

- `pnpm test:evaluation`: Bewertung, Gewichtung, Fehlversuche, unbekannte Kosten, fehlende Angaben, Vergleichsabdeckung, Schema und vertrauliche Fehlermeldungen.
- `pnpm test:e2e`: bestehende Desktop-/Mobilabläufe plus neue Eingabegrenzen vor Buchung und Anbieteraufruf.
- `pnpm test:db`, isoliertes `pnpm test:integration`, Build und Lint bleiben unverändert Bestandteil der GitHub-Abnahme.
- Keine echte API-Qualität oder Abrechnung gemessen, keine abgeschlossene Datenschutzprüfung und kein Nutzertest behauptet. Kein OpenAI-Adapter und keine breite Produktintegration vor den dafür vereinbarten Voraussetzungen.
