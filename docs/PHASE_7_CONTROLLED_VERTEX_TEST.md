# Phase 7 – kontrollierter Vertex-Test

## Freigabestand

Die Zustimmung vom 31.08.2026 erlaubt Implementierung und Offline-Prüfung. Sie erlaubt weder Google-Projekt-/Abrechnungseinrichtung noch echte Fotoübertragung, Veröffentlichung oder Änderungen an der verbundenen Supabase-Datenbank. Die beiden serverseitigen Schalter bleiben standardmäßig `false`; die Datenbankkampagne beginnt ebenfalls gesperrt und ohne geprüften Preis.

Die anschließende ausdrückliche Beauftragung umfasst die isolierte Supabase-Integrationsprüfung und das Speichern des Entwicklungsbranches auf GitHub. Dafür wird der bestehende Ubuntu-Testjob des öffentlichen Repositories verwendet; kein neues Supabase-Cloudprojekt und keine Google-Ausführung. Eine Übernahme nach `main` oder Migration des verbundenen Entwicklungsprojekts gehört nicht zu diesem Prüfabschnitt.

Der GitHub-main-Stand wurde lesend als `b9cdb8f161477c9e45fc1d4108f2e76420619093` bestätigt. Umsetzung im Branch `codex/phase-7-controlled-vertex-test`; vorhandene Änderungen an `next-env.d.ts` und `supabase/.temp/` gehören nicht zum Commit.

## Funktionsumfang

- `/internal/image-test`: kleine separate Oberfläche ohne Einbau in Navigation oder normalen Planungsablauf. Anmeldung erfolgt über den bisherigen Kontozugang. Zugriff auf Daten nur für serverseitig zugelassene Testkonten.
- `/api/internal/image-test`: Server überprüft das Anmeldetoken mit Supabase. Ein Client kann weder Eigentümer-ID, Reservierungsbetrag noch Anbieter bestimmen. Mutationen erfordern außerdem denselben Ursprung. Antworten sind nicht cachebar.
- `consent_events`: bestehende getrennte Ereignisse für `ai_processing`, Textversion `vertex-test-v1`. Originalfoto-Speicherung ist keine KI-Zustimmung. Einwilligung allein schaltet Google nicht ein.
- Ein Betreiber muss das Testkonto zulassen. Das Konto bestätigt einzelne vorhandene Originalfotos. Inhalt wird serverseitig gehasht, Stil und Budget aus dem eigenen Projekt übernommen und eingefroren. Auch identische Dateien aus anderen Konten eröffnen keine zusätzlichen Versuche. Umbenennung oder neue Foto-ID ändert den Inhalt nicht.
- Die vorhandene anbieteraustauschbare Schnittstelle bleibt bestehen. Vertex wird nur serverseitig aufgerufen, mit genau einem SDK-Versuch, einem Kandidaten, 1K und maximal 2048 Ausgabetokens. Keine Suchwerkzeuge, zusätzlichen Dienste oder automatische Warteschlange.

## Dauerhafte Buchhaltung und Fehler

`image_test_campaign` enthält genau eine Kampagne: höchstens fünf Zulassungen, 300 Cent Reservierungen, geprüfter Anfragehöchstbetrag, befristete Freigabe, laufender Versuch und Abrechnungsstand. Kein monatliches Zurücksetzen und keine Anlage weiterer Kampagnen durch Nutzer.

Eine Datenbanktransaktion sperrt die Kampagnenzeile, prüft Foto, Eigentum, Einwilligung, Abrechnung und Grenzen, bucht einen Versuch und reserviert Geld. Sie schaltet die Kampagne im selben Schritt wieder aus. Die Auftrags-ID ist eindeutig. Ein Fehler nach einer möglicherweise erfolgreichen Buchung wird niemals automatisch wiederholt.

Unmittelbar vor dem Versand wird die Freigabe erneut geprüft. Nach 120 Sekunden beendet der Aufrufer das Warten auch dann, wenn ein Anbieter das Abbruchsignal ignoriert. Das beweist keinen Abbruch bei Google: Der Versuch bleibt ungeklärt, Geld bleibt reserviert, und die globale Sperre bleibt gesetzt. Späte Antworten werden nicht nachträglich gespeichert. Auch Speicherfehler führen nie zu einer zweiten Generierung.

Einwilligungsprüfung und Google-Netzwerkaufruf können nicht zu einer gemeinsamen atomaren Transaktion zusammengefasst werden: Bei einem Widerruf genau während des Versands ist ein Zurückholen nicht garantiert. Die Oberfläche erklärt das; der Server prüft vor Versand und vor Ergebnisspeicherung, ob die Freigabe noch gilt.

## Kosten: keine absolute Garantie

300 Cent sind die technische Grenze innerhalb dieses Testpfads. Sie sind keine Garantie über die gesamte Google-Rechnung, andere Zugänge oder manuelle Modellaufrufe. 5 Euro bleiben das gewünschte Gesamtbudget; die Differenz von 2 Euro ist ein Puffer. Die frühere pauschale 10-Cent-Rückgabe wurde durch getrennte Reservierung, unbekannte tatsächliche Kosten und Token-Verbrauch ersetzt.

Vor Aktivierung muss eine konservative Anfrageobergrenze belegt werden: Eingabebild, begrenzter Prompt, maximal 2048 Ausgabetokens einschließlich relevanter Text-/Bild-/Denkanteile, Auflösung, Währung, Steuern und eventuelle Zusatzkosten. Bei Unsicherheit bleibt der Test aus. Ein reiner Preis pro Ausgabebild genügt nicht. Gebühren und Modellverfügbarkeit am tatsächlichen Testtag erneut prüfen.

Google-Budgetwarnungen und verfügbare Spend Caps sind nur zusätzliche Schutzmaßnahmen: Ihre Durchsetzung kann verzögert sein, und Überschreitungen können abgerechnet werden. Keine Zusage, dass 3 Euro oder ein bestimmter Spend Cap den 5-Euro-Wunsch absolut garantiert.

## Speicherung und Löschung

Maximal zehn Ergebnisse mit je höchstens 10 MiB werden als Base64 ausschließlich in einer privaten Datenbanktabelle gespeichert. Das vereinfacht für diesen kleinen Test die transaktionale Löschung, kostet aber mehr Datenbankspeicher als ein Objekt-Bucket und ist keine Architektur für größeren Bildbetrieb. Vor Aktivierung muss der freie Supabase-Speicher geprüft werden.

Ergebnisse sind spätestens nach 29 Tagen und 23 Stunden nicht mehr abrufbar; ein stündlicher Datenbankjob entfernt sie physisch. Damit besteht eine Stunde Reserve zur 30-Tage-Frist. Ein funktionierender Zeitplan und seine Überwachung sind zwingende Voraussetzungen. Ein Widerruf von KI- oder Fotoeinwilligung löscht Ergebnisse sofort in derselben Datenbanktransaktion und entwertet Fotozulassungen. Kontingente werden nie erstattet.

Originalfoto-/endgültige Projekt-/Kontolöschung entfernt zugehörige Ergebnisse über Fremdschlüssel. Papierkorb und ausstehende Kontolöschung sperren weiteren Zugriff. Beim Löschen eines zugelassenen Originalfotos schließt sich die einmalige Kampagne; anschließend wird der Fingerabdruck entfernt. Ohne Fingerabdruck lässt sich erneutes Hochladen nicht zuverlässig erkennen – deshalb bleibt diese Kampagne geschlossen. Ergebnis-Einzellöschung allein schließt die Kampagne nicht.

Nach endgültiger Kontolöschung bleiben nur die notwendigen nicht personenbezogenen Zähler und technischen Versuchsdaten; Nutzerverweise, Foto-Fingerabdruck und Anbieterantwortkennung/Verbrauchsdetails werden entfernt. Keine Bilddaten, vollständigen Anbieterantworten, Prompts oder Zugangsdaten in Logs, Git oder Testberichten. Datenbanksicherungen müssen weiterhin D-017 entsprechen.

## Spätere Google-Schritte – jetzt nicht ausführen

1. Konkrete neutrale Wohnzimmerfotos ohne Personen, Dokumente, sensible Details oder Standort-/EXIF-Metadaten auswählen und Nutzungsrechte nachweisen. Die Anwendung entfernt Metadaten derzeit nicht selbst; vor Zulassung bereinigte Dateien verwenden. Ein Foto des Nutzers persönlich ist nicht erforderlich.
2. Datenschutztext, Verantwortlichenangaben, Google-Vertrag, globale Verarbeitung und konkrete Google-Speicherfristen dokumentieren und prüfen. Keine EU-only- oder Zero-Retention-Zusage. Bei Änderungen am Text eine neue Version verwenden und erneut zustimmen lassen.
3. Nach separater Freigabe dediziertes Cloud-Testprojekt anlegen/auswählen, Abrechnung verbinden, Vertex-AI-API aktivieren. Keine anderen gebührenpflichtigen Dienste, manuellen Modellaufrufe oder gemeinsamen Produktionszugänge.
4. Dienstkonto mit möglichst engen Rechten einrichten. Für lokale Ausführung ADC, vorzugsweise Dienstkonto-Impersonation, ohne heruntergeladenen dauerhaften Schlüssel. Betreiber-Abrechnungsrechte nicht dem Anwendungsdienstkonto geben. Das offizielle SDK nutzt weiterhin `aiplatform.googleapis.com`.
5. Modell `gemini-3.1-flash-image`, `global`, 1K und Tokenlimit mit aktuellen Modell-/Preisdokumenten und dem konkret verfügbaren Konto abgleichen. Keine stillschweigende Modelländerung. Konservativen Reservierungsbetrag und Preisnachweis festhalten.
6. Zusätzlichen Google-Spend-Cap unter dem gewünschten Gesamtbudget einstellen, sofern im konkreten Projekt verfügbar und geeignet; Budgetwarnungen ergänzen. Verfügbarkeit, Mindestbetrag, Geltungsbereich und Verzögerung dokumentieren. Ist der Schutz ungeklärt, keine Aktivierung.
7. Erst nach gesonderter Supabase-Freigabe Migration einspielen, Zugriffe und echten Löschzeitplan prüfen. Nur das benannte Testkonto in `image_test_members` aufnehmen. Servergeheimnis lokal außerhalb Git setzen; beide KI-Schalter bleiben zunächst aus.
8. Für die getrennte Einwilligung und Fotozulassung darf ausschließlich `RAUMLY_IMAGE_TEST_ENABLED=true` gesetzt werden. `RAUMLY_IMAGE_TEST_ORIGIN` muss exakt die freigegebene Browseradresse ohne abschließenden Schrägstrich enthalten, beispielsweise `http://localhost:3000`. Die Prüfung vertraut weder veränderlichen Host-Headern noch der von Next.js intern umgeschriebenen Anfrageadresse. `RAUMLY_IMAGE_AI_ENABLED` bleibt aus. Im internen Bereich Foto und Planungswerte kontrollieren.
9. Konkrete Ausführungsfreigabe für Foto, Anbieter, Daten, Preisobergrenze und Budget einholen. Erst danach KI-Schalter setzen und Kampagne mit Preisnachweis und kurzer Frist für einen Versuch freigeben. Die Oberfläche kann selbst weder Kampagnenfreigabe noch Kosten erhöhen.
10. Nach dem einzelnen Versuch KI-Schalter wieder auf `false`. Google Billing vollständig abwarten; die Rechnung kann auch länger als einen Tag verzögert sein. Gesamtkosten und Abgleichzeit in der Kampagne erfassen. Erst dann nach Sichtung erneut freigeben. Unklare laufende Aufträge nie bloß nach einer Wartezeit entsperren.

Betreiberänderungen an Mitgliedern, Kostenprüfung, Kampagnenfreigabe, Abgleich oder Abschluss erfolgen über kontrollierte Datenbankadministration, nicht die Nutzeroberfläche. Dabei nie `reserved_cents`, `photo_count`, Foto-Versuchszähler oder Auftrags-IDs zurücksetzen. Beim Abschluss `enabled=false` und `closed_at` setzen. Bei ungeklärten Aufträgen muss der tatsächliche Anbieterzustand nachgewiesen sein, bevor `active_attempt` entfernt werden darf. Die Server-Schalter allein sind kein Ersatz für die Datenbanksperren.

## Prüfnachweise und noch offene Abnahme

Lokaler Abschluss am 31.08.2026: Produktions-Build einschließlich TypeScript erfolgreich, ESLint erfolgreich, 16 PostgreSQL-Testfälle erfolgreich und 52 Playwright-Prüfungen auf Desktop/Mobil erfolgreich. Gesperrte Ansicht und authentifizierte Ansicht mit künstlichen Daten wurden visuell geprüft. Beim letzten Windows-Testlauf musste der ausschließlich für Playwright gestartete Next-Testserver nach Testende manuell beendet werden; danach meldete Playwright Exitcode 0 und 52 bestandene Tests. Kein externer KI-Aufruf und keine Migration gegen das verbundene Supabase-Projekt.

**Ergänzende isolierte Abnahme vom 31.08.2026:** Auf GitHub sind für Commit `334f78d` beide Prüfjobs erfolgreich: 65 pgTAP-Prüfungen im vollständigen Supabase-Stack, acht echte Integrationstests, 16 PGlite-Prüfungen, Build/TypeScript, ESLint und nun 54 Playwright-Prüfungen. Der erste Integrationslauf deckte eine falsche Herkunftsprüfung auf: Die intern von Next.js verwendete Adresse entsprach nicht immer der Browseradresse. Die Korrektur verwendet eine ausdrücklich konfigurierte vertrauenswürdige Testadresse und zusätzliche Regressionstests. [Vollständiger erfolgreicher Prüflauf](https://github.com/SamiLampsijarvi/Innenausstattung-planen/actions/runs/33377597023).

Der reale Löschjob wurde am 31.08.2026 um 09:29 UTC erfolgreich protokolliert; das Testbild war danach physisch entfernt. Beide echten Parallelverbindungen wurden über unterschiedliche PostgreSQL-Prozesskennungen und nachgewiesenes Warten auf die Datenbanksperre geprüft. Widerruf vor dem Ergebnisabschluss verwirft das Bild; Widerruf nach begonnenem Speichern entfernt es anschließend. In beiden Fällen bleiben Reservierungen erhalten. Auch Authentifizierung, fremde Datenzugriffe, privater Upload/Download, HTTP-Fotozulassung, Serverneustart und Ergebnislöschung wurden ohne Google-Anfrage geprüft.

- `pnpm test:db`: PostgreSQL-Regeln mit PGlite, echten Phase-5-Einwilligungsfunktionen und minimalen Bestands-Tabellen. Prüft fremde Zugriffe, Inhaltsänderung, fünf Fotos, zwei Versuche, Reservierungen, doppelte Aufträge, Widerruf, späte Antworten, Ablauf/Löschung und Wiederanlauf aus gespeichertem Datenbankzustand.
- `pnpm test:integration`: echte Supabase-Auth-, Storage-, HTTP- und PostgreSQL-Integration auf dem kurzlebigen GitHub-Testrechner. Erfordert ausdrücklich `RAUMLY_ISOLATED_SUPABASE=1`, GitHub Actions und die lokalen Standardports. Zugangsdaten werden nur aus `supabase status` im Speicher übernommen, in GitHub maskiert und nicht als Artefakt gespeichert. Dieser Test darf nicht gegen das verbundene Entwicklungsprojekt ausgeführt werden.
- Der Test legt ausschließlich künstliche Konten und ein neutrales Ein-Pixel-Bild an. Er prüft verschiedene echte PostgreSQL-Verbindungen einschließlich nachgewiesenem Warten auf die Datenbanksperre, beide konkurrierenden Widerruf-/Speicherreihenfolgen, den Wiederanlauf des HTTP-Servers, Ergebnisabruf und -löschung. Für den Nachweis des echten Löschjobs wird nur im wegwerfbaren Stack dessen Zeitplan kurz auf jede Minute gesetzt und danach wiederhergestellt; Erfolg erfordert einen protokollierten erfolgreichen `pg_cron`-Lauf und physisch entfernte Ergebnisse.
- PGlite verarbeitet überlappende Anfragen serialisiert. Die ergänzenden echten Mehrverbindungstests wurden deshalb im vollständigen Supabase-Stack auf GitHub ausgeführt und bestanden: höchstens eine erfolgreiche Buchung bei Konkurrenz und nach Widerruf keine Ergebnisfreigabe.
- `supabase test db`: pgTAP-Prüfung im vollständigen isolierten Supabase-Stack samt Zeitplanregistrierung, erfolgreich auf GitHub. Auf dem Windows-Entwicklungsrechner ist dieser Stack weiterhin nicht installiert. Keine Ausführung gegen das verbundene Projekt erfolgt.
- `pnpm test:e2e`: normale Desktop-/Mobilabläufe, separater Testbereich mit künstlicher Sitzung und abgefangenen Antworten, ausgeschalteter Endpunkt, Fehler-, Abbruch- und SDK-Konfigurationsprüfungen. Testserver verwendet ausschließlich Platzhalterzugänge und ausgeschaltete KI; ein bereits laufender Server wird bewusst nicht übernommen.
- `pnpm build` und `pnpm lint`: Build/Typen und statische Prüfung.
- Vor echtem Versand weiterhin offen: gesondert freigegebene Übernahme der Migration in das verbundene Entwicklungsprojekt einschließlich dortigem Rechte-/Löschjobnachweis und laufender Überwachung; danach Google-Zugang, Preisobergrenze, Datenschutz und gesonderte Ausführungsfreigabe. Der isolierte Test ersetzt diese projektbezogene Betriebsabnahme nicht. Kein Erfolg einer echten Bildgenerierung behauptet.

## Späterer Qualitätsbericht

Pro Versuch nur eine interne Kennung, Status, Laufzeit, Reservierung, Billing-Abgleich und die fünf Bewertungen (1–5) dokumentieren: Raumtreue, Stiltreue, Realismus, Nutzbarkeit und Fehlerfreiheit. Brauchbar bedeutet Raumtreue und Nutzbarkeit jeweils mindestens 3. Kosten pro brauchbarem Ergebnis nur bei geklärter Abrechnung und mindestens einem brauchbaren Ergebnis berechnen. Fünf Fotos reichen nicht für eine endgültige Anbieterentscheidung.

## Primärquellen

- [Google-Modellbeschreibung](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-1-flash-image)
- [Google-Preise](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Spend Caps und Verzögerung](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- [Google-Datenverarbeitung](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance)
- [Google-Authentifizierung](https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/authentication)
- [Lokale PostgreSQL-Testlaufzeit](https://pglite.dev/docs/)
