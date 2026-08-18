# Arbeitsregeln für Raumly

Diese Regeln gelten für alle Arbeiten an diesem Projekt. Ziel ist, das Projekt gemeinsam mit dem Nutzer kontrolliert weiterzuentwickeln, ohne vom vereinbarten Produktziel oder von bereits getroffenen Entscheidungen abzuweichen.

## 1. Zieltreue und Anforderungen

- Keine Anforderungen, Funktionen, Zielgruppen oder Geschäftsregeln erfinden.
- Neue Ideen klar als Vorschlag kennzeichnen und nicht ohne Zustimmung als Anforderung behandeln oder umsetzen.
- Fakten, belegte Informationen, unbestätigte Annahmen und Empfehlungen sprachlich eindeutig voneinander unterscheiden. Unbestätigte Annahmen immer ausdrücklich als solche kennzeichnen.
- Wenn eine Anforderung oder Entscheidung unklar ist, nachfragen. Das gilt besonders, wenn eine Annahme das Ergebnis, den Umfang, die Kosten, die Architektur oder die Nutzererfahrung wesentlich verändern könnte.
- Kleine, leicht rückgängig zu machende Detailentscheidungen dürfen getroffen werden, müssen bei Bedeutung aber transparent genannt werden.
- Bestehende Entscheidungen in `DECISIONS.md`, `README.md`, Aufgabenbeschreibungen und vorherigen Nutzeranweisungen berücksichtigen.
- Bei widersprüchlichen Anforderungen den Widerspruch benennen und vor der Umsetzung klären.

## 2. Technische Kontinuität

- Die technische Grundlage des Projekts nicht ohne einen konkreten, dokumentierten Grund wechseln.
- Vor einem Wechsel von Framework, Sprache, Datenbank, Hosting-Plattform oder zentralem Dienst Auswirkungen, Alternativen, Migrationsaufwand und Risiken erklären und die Zustimmung des Nutzers einholen.
- Funktionierenden Code nicht unnötig umschreiben, umformatieren oder abstrahieren.
- Änderungen möglichst klein, lokal und auf die aktuelle Aufgabe begrenzt halten.
- Vorhandene Nutzeränderungen und nicht zur Aufgabe gehörende Dateien nicht überschreiben oder zurücksetzen.
- Keine unnötigen Technologien oder Abhängigkeiten einführen. Neue Produktionsabhängigkeiten nur hinzufügen, wenn sie einen klaren Nutzen haben. Größere oder kostenpflichtige Abhängigkeiten vorher abstimmen.

## 3. Planung und Zustimmung

- Für neue Funktionen gilt grundsätzlich dieser Ablauf:
  **Recherchieren → Verstehen → Plan erstellen → Zustimmung des Nutzers → Umsetzen → Testen → Überprüfen → sicheren Stand speichern.**
- Zuerst fehlende oder zeitkritische Informationen aus geeigneten, möglichst primären Quellen recherchieren.
- Vor jeder Planung den aktuellen Projektzustand, relevante Dateien, bestehende Entscheidungen und vorhandene Tests untersuchen.
- Danach einen konkreten Plan mit Ziel, Umfang, betroffenen Bereichen, Risiken und Prüfkriterien vorlegen.
- Bei relevanten Änderungen nach dem Plan auf die ausdrückliche Zustimmung des Nutzers warten. Vor dieser Zustimmung keinen Programmcode für die geplante Funktion schreiben oder ändern.
- Nach der Zustimmung nur den freigegebenen Umfang umsetzen. Erforderliche Abweichungen erneut erklären und abstimmen.
- Größere Änderungen vor der Umsetzung kurz planen. Der Plan nennt Ziel, betroffene Bereiche, Risiken und eine Prüfmöglichkeit.
- Als größere Änderung gelten insbesondere Architekturwechsel, neue externe Dienste, Authentifizierung, Bezahlung, Datenmigrationen, umfangreiche UI-Neugestaltungen und Änderungen an Datenschutz oder Sicherheitslogik.
- Bei wichtigen Produkt- oder Architekturentscheidungen vor der Umsetzung die ausdrückliche Zustimmung des Nutzers abwarten.
- Vor riskanten, destruktiven, kostenpflichtigen oder schwer rückgängig zu machenden Aktionen die ausdrückliche Zustimmung des Nutzers einholen.
- Dazu zählen insbesondere Löschen von Daten, Überschreiben größerer Arbeitsstände, Deployment in Produktion, Datenbankmigrationen mit Datenverlust-Risiko, Veröffentlichung, Käufe sowie Änderungen an externen Konten oder Diensten.
- Nicht direkt auf `main` arbeiten. Änderungen in einem eigenen Git-Branch oder bei größeren Arbeiten in einem separaten Git-Worktree durchführen. Der funktionierende Hauptbranch bleibt währenddessen unverändert.

## 4. Qualität und Tests

- Nach jeder Codeänderung angemessene Tests oder Prüfungen ausführen.
- Der Prüfumfang richtet sich nach dem Risiko: mindestens Syntax- oder Build-Prüfung; bei Verhaltensänderungen zusätzlich passende Funktions- und Regressionstests.
- Benutzeroberflächen nach relevanten Änderungen mindestens in Desktop- und Mobilgröße prüfen, sobald geeignete Browserwerkzeuge verfügbar sind.
- Fehler oder nicht ausführbare Tests offen nennen. Nie behaupten, etwas getestet zu haben, wenn es nicht getestet wurde.
- Bereits funktionierendes Verhalten bei Änderungen erhalten, sofern keine neue Anforderung ausdrücklich etwas anderes verlangt.
- Nach den Tests das Ergebnis gemeinsam mit dem Nutzer anhand der zuvor vereinbarten Prüfkriterien überprüfen.
- Einen Stand erst dann als sicher kennzeichnen oder in den Hauptbranch übernehmen, wenn die vereinbarten Prüfungen erfolgreich waren und bekannte Einschränkungen dokumentiert sind.
- Ein Git-Commit gilt als nachvollziehbarer Zwischenstand. Ein getesteter Commit auf dem geschützten Hauptbranch und optional ein Git-Tag gelten als sicherer Versionsstand.

## 5. Geheimnisse, Datenschutz und Sicherheit

- Keine Passwörter, API-Schlüssel, Tokens, Zugangsdaten oder andere Geheimnisse in Quellcode, Dokumentation, Beispieldaten, Logs oder Versionsverwaltung schreiben.
- Geheimnisse ausschließlich über geeignete Umgebungsvariablen oder einen Secret-Manager verwenden.
- Nur Platzhalternamen wie `OPENAI_API_KEY` dokumentieren, niemals echte Werte.
- Beispieldateien wie `.env.example` dürfen nur harmlose Platzhalter enthalten. Echte `.env`-Dateien müssen von der Versionsverwaltung ausgeschlossen werden.
- Vor der Verarbeitung von Nutzerfotos, Adressen oder anderen personenbezogenen Daten Datenschutz, Einwilligung, Speicherfristen und Löschmöglichkeiten berücksichtigen.

## 6. Kommunikation und Dokumentation

- Der Nutzer entscheidet, **was** das Produkt tun soll: Produktziel, Zielgruppe, Funktionen, Prioritäten, Budget und gewünschtes Nutzererlebnis.
- Der Assistent hilft zu entscheiden, **wie** diese Vorgaben technisch umgesetzt werden können, und spricht eine begründete Empfehlung aus.
- Technische Entscheidungen mit relevanten Auswirkungen auf Kosten, Sicherheit, Geschwindigkeit, Wartbarkeit, Anbieterabhängigkeit oder spätere Erweiterbarkeit vor der Umsetzung verständlich erklären.
- Wenn mehrere sinnvolle technische Wege bestehen, die wichtigsten Optionen mit ihren konkreten Vor- und Nachteilen darstellen. Eine bevorzugte Option klar als Empfehlung kennzeichnen, nicht als bereits getroffene Entscheidung.
- Erklärungen setzen keine Kenntnisse in Softwareentwicklung voraus. Fachbegriffe vermeiden oder bei der ersten Verwendung in einfacher Sprache erklären.
- Den Nutzer nicht mit unnötigen Implementierungsdetails belasten. Trotzdem transparent erklären, was geändert wird, warum es nötig ist und welche Folgen es hat.
- Bei wichtigen Entscheidungen Verständnis ermöglichen, ohne vom Nutzer zu verlangen, zuerst Softwareentwicklung zu lernen.
- Vor der Arbeit kurz das verstandene Ziel nennen, wenn der Auftrag mehrdeutig oder umfangreich ist.
- Nach Änderungen kompakt berichten: was geändert wurde, was geprüft wurde, welche Annahmen gelten und welche Punkte offen sind.
- Wichtige, dauerhafte Produkt- und Architekturentscheidungen in `DECISIONS.md` festhalten.
- Diese Regeln nicht stillschweigend ändern. Änderungen an dieser Datei benötigen die Zustimmung des Nutzers.

## 7. Priorität bei Konflikten

- Aktuelle ausdrückliche Nutzeranweisungen haben Vorrang vor älteren Projektentscheidungen, sofern der Nutzer den Konflikt kennt oder darauf hingewiesen wurde.
- Sicherheits-, Datenschutz- und Geheimnisschutzregeln bleiben unabhängig vom Zeitdruck bestehen.
- Wenn eine Aufgabe nicht regelkonform abgeschlossen werden kann, die Blockade erklären und eine sichere Alternative vorschlagen.
