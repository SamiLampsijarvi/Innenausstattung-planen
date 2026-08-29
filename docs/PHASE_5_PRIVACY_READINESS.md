# Phase 5 – Datenschutz- und Sicherheitsnachweis

## Status und Grenze

Dieses Dokument beschreibt den technischen und organisatorischen Entwicklungsstand von Raumly. Es ist eine Arbeitsgrundlage für eine spätere juristische Prüfung und keine Rechtsberatung oder fertige Datenschutzerklärung.

Vor einem Test mit weiteren Personen oder einer Veröffentlichung müssen der rechtlich Verantwortliche, dessen ladungsfähige Anschrift, eine Datenschutz-Kontaktadresse und die endgültigen Rechtstexte von einer qualifizierten Stelle geprüft und ergänzt werden.

## Datenübersicht und Zweck

| Daten | Zweck | Speicherort | Lebensdauer |
| --- | --- | --- | --- |
| E-Mail und Authentifizierungskennung | Konto, Anmeldung, Wiederherstellung | Supabase Auth, Region Frankfurt | Bis zur endgültigen Kontolöschung |
| Achtstellige Kontonummer | Interne, datensparsame Kontozuordnung | Supabase-Datenbank | Bis zur endgültigen Kontolöschung |
| Projektname, Stil, PLZ, Budget, Möbelangaben, Notizen und Testentwürfe | Vom Nutzer gewünschte Raumplanung | Supabase-Datenbank oder vor Anmeldung lokal im Browser | Konto: bis zur Löschung; Gast: lokal bis zur Übernahme oder manuellen Löschung |
| Originale Raumfotos und Dateiname | Private Raumplanung | Privater Supabase-Storage in Frankfurt | Bis zur Einzellöschung, zum Widerruf der Foto-Einwilligung oder zur endgültigen Konto-/Projektlöschung |
| Einwilligungsereignisse | Nachweis von Erteilung und Widerruf | Supabase-Datenbank | Bis zur endgültigen Kontolöschung |
| Löschantrag und Versandstatus | 14-tägiger Widerruf, sichere Verarbeitung und Benachrichtigung | Supabase-Datenbank; E-Mail-Adresse und Nachricht zusätzlich bei Resend | Löschauftrag bis Abschluss/Widerruf; Anbieterfristen gesondert prüfen |
| Gast-Übernahmemarker | Übernahme genau des beim Registrieren geöffneten Projekts | Lokaler Browser-Speicher | Höchstens sieben Tage oder bis Erfolg/Fehlerbereinigung |

Die fachliche Rechtsgrundlage ist vor Veröffentlichung juristisch festzulegen. Technische Arbeitsannahme: Kontoverwaltung und gewünschte Projektspeicherung dienen der Vertragserfüllung; die Speicherung privater Raumfotos erfolgt im bestätigten Produktablauf erst nach einer gesondert protokollierten Einwilligung. Eine spätere KI-Verarbeitung benötigt eine eigene, getrennte Freigabe und gehört nicht zu Phase 5.

## Datenschutz durch Technik

- Projekte, Fotometadaten, Kontonummern und Einwilligungsnachweise verwenden Datenbank-Zugriffsregeln pro Nutzer-ID.
- Raumfotos liegen in einem nicht öffentlichen Bucket. Der Speicherpfad beginnt mit der Nutzer-ID und verweist auf ein eigenes, aktives Projekt.
- Neue Fotos werden auf Datenbank- und Speicherebene abgewiesen, solange keine aktive Foto-Einwilligung vorliegt.
- Ein Widerruf wird dauerhaft protokolliert, sperrt neue Uploads und entfernt vorhandene Fotos sowie Metadaten mit einer serverseitig authentifizierten Funktion.
- Ein Gastprojekt wird erst nach erfolgreicher Anmeldung übertragen. Die lokale Kopie wird erst nach bestätigter Speicherung entfernt; erneute Aufrufe bleiben durch dieselbe Projekt-ID sicher wiederholbar.
- Projektlöschung besitzt 30 Tage Wiederherstellungsfrist. Kontolöschung besitzt 14 Tage Widerrufsfrist. Automatisierte Dienste verarbeiten erst fällige Löschungen.
- Lösch- und E-Mail-Dienste verwenden getrennte Geheimnisse beziehungsweise eine angemeldete Nutzersitzung. Geheimnisse stehen nicht im Repository.
- E-Mails enthalten keine Fotos, Projektnamen, Postleitzahlen, Budgets oder Planungsnotizen.

## Betroffenenrechte – interner Ablauf vor Veröffentlichung

Anfragen auf Auskunft, Berichtigung, Einschränkung, Datenübertragbarkeit oder Löschung werden über die noch einzutragende Datenschutz-Kontaktadresse entgegengenommen. Vor Herausgabe wird die Identität angemessen geprüft. Die Bearbeitung wird dokumentiert und erfolgt grundsätzlich innerhalb eines Monats.

Da nach bestätigter MVP-Entscheidung noch kein automatischer Datenexport angeboten wird, muss eine berechtigte Anfrage manuell in einem üblichen, maschinenlesbaren Format beantwortet werden. Die Zusammenstellung umfasst mindestens Kontodaten, Projekte, Fotometadaten, Einwilligungsereignisse und den aktuellen Löschstatus. Passwörter, geheime Schlüssel und Daten anderer Personen werden niemals ausgegeben.

## Dienstleister und internationale Übermittlungen

- **Supabase:** Authentifizierung, Datenbank, privater Dateispeicher und serverseitige Funktionen. Projektregion: Frankfurt. DPA und aktuelle Unterauftragsverarbeiter müssen als Vertragsnachweis archiviert werden.
- **Resend:** ausschließlich transaktionale E-Mails zur Kontolöschung. Übertragen werden Empfängeradresse und datensparsame Nachricht. DPA, Standardvertragsklauseln beziehungsweise anwendbarer Transfermechanismus und Unterauftragsverarbeiter müssen vor Veröffentlichung juristisch geprüft und dokumentiert werden.
- **OpenAI:** in Phase 5 nicht verbunden. Eine Übertragung von Raumfotos an einen KI-Dienst ist nicht freigegeben.

## Sicherheitsbetrieb

- Zugriffs- und Löschregeln werden in einer lokalen Supabase-Testdatenbank automatisch mit zwei getrennten Nutzern geprüft.
- Build, Codeprüfung und Browserabläufe laufen bei jedem Pull Request und auf dem Hauptbranch.
- Eine Datenpanne wird intern dokumentiert. Besteht voraussichtlich ein Risiko für Betroffene, ist die zuständige Aufsichtsbehörde grundsätzlich unverzüglich und möglichst innerhalb von 72 Stunden zu benachrichtigen; bei hohem Risiko zusätzlich die betroffene Person.
- Zugriffsregeln, Dienstleister, Speicherfristen und Wiederherstellungsverfahren werden vor Testbetrieb und danach regelmäßig überprüft.
- Der kostenlose Supabase-Tarif erstellt keine automatischen Datenbanksicherungen. Vor Aktivierung eigener oder kostenpflichtiger Sicherungen muss nachgewiesen werden, dass endgültig gelöschte personenbezogene Daten daraus innerhalb der bestätigten 30-Tage-Frist entfernt werden.

## Offene Angaben für die juristische Schlussprüfung

- Vollständige Identität und Anschrift des Verantwortlichen
- Datenschutz-Kontaktadresse und gegebenenfalls Datenschutzbeauftragter
- Zuständige Datenschutzaufsichtsbehörde
- Bestätigung der konkreten Rechtsgrundlagen und Einwilligungstexte
- Archivierte Fassungen der Vereinbarungen zur Auftragsverarbeitung und Unterauftragsverarbeiter
- Bewertung internationaler Übermittlungen und gegebenenfalls Transfer-Folgenabschätzung
- Entscheidung, ob für die spätere KI-Fotoverarbeitung eine Datenschutz-Folgenabschätzung erforderlich ist
- Fertige Datenschutzerklärung und Anbieterkennzeichnung vor Veröffentlichung

## Offizielle Grundlagen der Bestandsaufnahme

- [DSGVO, insbesondere Art. 5, 12–20, 25, 28 und 32–35](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [EU-Kommission: Pflichten für Unternehmen und Datenschutz durch Technik](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en)
- [EU-Kommission: Rechte betroffener Personen](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en)
- [Supabase Security und GDPR-Hinweise](https://supabase.com/docs/guides/security)
- [Supabase Data Processing Addendum](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf)
- [Resend Data Processing Addendum](https://resend.com/legal/dpa)
