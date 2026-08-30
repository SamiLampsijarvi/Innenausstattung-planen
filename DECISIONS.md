# Projektentscheidungen

Hier werden bestätigte, dauerhafte Produkt- und Architekturentscheidungen festgehalten. Vorschläge und offene Fragen gelten nicht als Entscheidungen.

## Bestätigt

### D-001: Produktgrundidee

- **Status:** Bestätigt
- **Entscheidung:** Die Website unterstützt Nutzer bei der Planung ihrer Innenausstattung mithilfe von KI.
- **Kernablauf:** Raumtyp wählen, Designstil wählen, Raumfotos hochladen und Budget angeben.
- **Ergebnisziel:** Ein Einrichtungskonzept mit Möbelvorschlägen, die zum Budget passen und möglichst bei geeigneten Händlern im Land oder in der Region des Nutzers erhältlich sind.

### D-002: Budget als Kernanforderung

- **Status:** Bestätigt
- **Entscheidung:** Das Budget ist keine optionale Zusatzangabe, sondern eine zentrale Eingabe und muss bei Konzept- und Produktempfehlungen berücksichtigt werden.

### D-003: Erste Zielgruppe

- **Status:** Bestätigt
- **Entscheidung:** Der erste MVP richtet sich an deutschsprachige Mieter und Wohnungseigentümer, die einzelne Räume innerhalb eines festen Budgets neu einrichten möchten.

### D-004: Erstes unterstütztes Land

- **Status:** Bestätigt
- **Entscheidung:** Deutschland ist das erste unterstützte Einkaufsland.
- **Folge:** Die erste Produktsuche, Händlerauswahl, Preisangaben und Verfügbarkeitsprüfung werden auf den deutschen Markt begrenzt.

### D-005: Erster unterstützter Raum

- **Status:** Bestätigt
- **Entscheidung:** Der erste vollständige MVP-Ablauf wird auf die Planung eines Wohnzimmers begrenzt.
- **Langfristiges Produktziel:** Raumly soll alle Räume eines Zuhauses planen können. Das Wohnzimmer ist die Startbegrenzung des MVP, keine dauerhafte Begrenzung des Produkts.
- **Folge:** Weitere Raumtypen bleiben außerhalb des ersten vollständigen MVP und werden nach der Validierung des Wohnzimmer-Ablaufs schrittweise ergänzt.

### D-006: Navigationsstruktur des MVP

- **Status:** Bestätigt
- **Entscheidung:** Die Website verwendet eine zweistufige Navigation nach der vom Nutzer bereitgestellten Handskizze. Sie umfasst Sprache und Standort, Homepage, Zimmer, Produkte, Suche, Preisgestaltung, Anmeldung, Favoriten und Services.
- **MVP-Grenze:** Nur die Homepage und die Wohnzimmerplanung sind aktiv. Noch nicht umgesetzte Bereiche werden eindeutig als „Bald verfügbar“ gekennzeichnet; nicht entschiedene Preise werden nicht angezeigt.

### D-007: Datenschutzfreundliche Standortbestimmung

- **Status:** Bestätigt
- **Entscheidung für das Zielprodukt:** Für regionale Händler, Verfügbarkeit und Lieferkosten wird die Postleitzahl des zu planenden Zuhauses verwendet. Eine vollständige Adresse ist im Planungsablauf nicht erforderlich.
- **Kontoregel:** Eine freiwillig im Konto gespeicherte Postleitzahl wird nur nach einem bewussten Klick in ein Zuhause-Projekt übernommen und bleibt dort änderbar.
- **Prototypgrenze:** Die vorhandene automatische Browser-Standortabfrage gehört zum frühen Prototyp und ist nicht die bestätigte Standortlösung des Zielprodukts.

## Vorläufig

### D-008: Arbeitsname

- **Status:** Vorläufig, nicht bestätigt
- **Entscheidung:** Der aktuelle Prototyp verwendet den Namen „Raumly“.
- **Hinweis:** Der Nutzer kann den Namen später ersetzen.

### D-009: Technische Grundlage des ersten Prototyps

- **Status:** Vorläufig
- **Entscheidung:** Der erste MVP besteht aus HTML, CSS und JavaScript ohne externe Anwendungsabhängigkeiten.
- **Begründung:** Dadurch ist er unmittelbar lokal ausführbar und eignet sich zur frühen Validierung.

### D-010: Produktionsfähige technische Grundlage

- **Status:** Bestätigt, technische Grundlage und lokaler Planungsablauf umgesetzt
- **Entscheidung:** Das Zielprodukt wird schrittweise auf Next.js und TypeScript übertragen.
- **Kontinuität:** Der vorhandene Prototyp bleibt Referenz. Funktionierendes Verhalten wird kontrolliert übertragen und nicht unnötig neu gestaltet.
- **Betrieb:** Die Entwicklung bleibt zunächst lokal. Eine Veröffentlichung ist nicht freigegeben.

### D-011: Konten, Datenbank und Fotos

- **Status:** Bestätigt und teilweise umgesetzt
- **Entscheidung:** Supabase ist als Grundlage für Authentifizierung, relationale Daten und private Fotoablage vorgesehen.
- **Umsetzung:** Das freigegebene Entwicklungsprojekt nutzt den kostenlosen Tarif in Frankfurt. Registrierung, E-Mail-Bestätigung, Anmeldung, private Projekte und private Fotoablage sind verbunden. Eine kostenpflichtige Nutzung oder Veröffentlichung ist nicht freigegeben.

### D-012: KI-Machbarkeitstest

- **Status:** Qualitativer Bildbearbeitungstest abgeschlossen; API-Integration, Möbelerkennung, Laufzeit und API-Kosten noch nicht geprüft
- **Entscheidung:** OpenAI wird als erster Kandidat für einen begrenzten Test von Möbelerkennung und realistischer Bildbearbeitung verwendet.
- **Ergebnis vom 26. August 2026:** Manuelle Bildbearbeitungsversuche mit Wohnzimmer, Küche und Bad erzeugten überzeugende, stilgerechte Inspirationsbilder. Auch bei strengen Vorgaben wurden vorhandene Möbel, Raumdetails, Perspektiven und Budgets jedoch nicht zuverlässig exakt bewahrt.
- **Produktgrenze:** KI-Bilder werden zunächst als Inspiration behandelt. Sie sind keine maßgenaue Raumplanung, keine originalgetreue Bestandsdokumentation und keine Kostengarantie.
- **Offene Prüfung:** Vor einer Integration werden die separate API-Nutzung, Möbelerkennung, Laufzeit, Fehlerquote und tatsächlichen Kosten mit freigegebenen Testdaten geprüft.
- **Anbieterwechsel:** Die KI-Anbindung wird austauschbar gestaltet.
- **Kostenlimit:** In der ersten Entwicklungs- und Testphase höchstens 20 Euro pro Monat; keine Erhöhung ohne Zustimmung.

### D-013: Gastnutzung und Datenlebensdauer

- **Status:** Bestätigt
- **Entscheidung:** Ein Nutzer kann einmal ohne Konto einen erfolgreich angezeigten Entwurf erstellen. Eine einfache Browsermarkierung erkennt die verbrauchte Gastnutzung, darf im MVP aber umgehbar sein.
- **Löschung:** Gastdaten werden beim erkannten Schließen des gesamten Browsers oder spätestens 24 Stunden nach der letzten Nutzung gelöscht.
- **Übernahme:** Bei Registrierung während der Gastplanung wird das Projekt in das neue Konto übernommen.

### D-014: Konten und Projekte

- **Status:** Bestätigt
- **Konto:** E-Mail-Adresse und Passwort, E-Mail-Bestätigung, Passwort-Wiederherstellung und eine eindeutige achtstellige Kontonummer.
- **Datenminimierung:** Name, Geburtsdatum, Telefonnummer und vollständige Wohnadresse sind im MVP ausgeschlossen.
- **Projekte:** Registrierte Nutzer können mehrere Wohnungen oder Häuser unter „Meine Projekte“ speichern und weiterbearbeiten.

### D-015: Entwürfe, Fotos und Möbelentscheidungen

- **Status:** Bestätigt
- **Fotos:** Mehrere Originalfotos pro Raum sind möglich.
- **Möbel:** Automatische Erkennung mit Nutzerkorrektur und den Entscheidungen behalten, ersetzen oder ergänzen.
- **Entwürfe:** Ein Entwurf für Gäste, höchstens drei gespeicherte Entwürfe pro Raum für Konten. Alte Entwürfe bleiben bei Änderungen erhalten und zählen zur Grenze.
- **Raummaße:** Im ersten MVP nicht erfasst; Passform muss vor dem Kauf geprüft werden.

### D-016: Budgetlogik

- **Status:** Bestätigt
- **Harte Grenze:** Das Budget darf nicht überschritten werden.
- **Ansicht A:** Möbelpreise ohne Lieferung.
- **Ansicht B:** Möbelpreise einschließlich Lieferung.
- **Mehrere Räume:** Gemeinsames Gesamtbudget und vom Nutzer festgelegte Teilbudgets pro Raum.

### D-017: Speicherung und Löschung

- **Status:** Bestätigt
- **Einzellöschung:** Originalfotos und Entwürfe können unabhängig gelöscht werden.
- **Projektpapierkorb:** 30 Tage Wiederherstellungsfrist.
- **Kontolöschung:** 14 Tage widerrufbar, danach endgültige Löschung.
- **Sicherheitskopien:** Sofern eigene oder anbieterseitige Sicherheitskopien vorhanden sind, müssen gelöschte personenbezogene Daten darin spätestens 30 Tage nach der endgültigen Löschung bereinigt sein.
- **Einwilligungen:** Zustimmung und Widerruf zur Foto- und KI-Verarbeitung mit Zeitpunkt speichern.

### D-018: KI-Aufträge und Fehlerbehandlung

- **Status:** Bestätigt
- **Zeitlimit:** höchstens zwei Minuten je Versuch.
- **Versuche:** erster Versuch, ein automatischer zweiter Versuch und ein bewusst gestarteter dritter und letzter Versuch.
- **Ausfälle:** keine unvollständigen Ergebnisse; verständliche Fehlermeldungen.
- **Kennzeichnung:** Entwürfe als KI-Visualisierung kennzeichnen und grobe Fehler meldbar machen.

### D-019: Produktdatenregeln

- **Status:** Bestätigt, Händlerauswahl offen
- **Aktualität:** Preise und Verfügbarkeit höchstens 24 Stunden alt.
- **Lieferkosten:** Schätzungen deutlich kennzeichnen.
- **Maße:** Produkte ohne bekannte Maße nicht empfehlen.
- **Nicht verfügbar:** als Inspiration zulässig; wenn möglich verfügbare Alternative in ähnlichem Aussehen, ähnlicher Farbe und ähnlichem Preis zeigen.
- **Transparenz:** bezahlte oder provisionsfähige Angebote kennzeichnen und erneute Prüfung beim Händler verlangen.

### D-020: Teststrategie

- **Status:** Bestätigt
- **Werkzeuge:** Vitest für einzelne Regeln, Playwright für vollständige Browserabläufe.
- **Früher Nutzertest:** zwei echte Testpersonen; beide verstehen den Ablauf und bewerten mindestens einen Entwurf als realistisch und stilgerecht.
- **KI-Qualität:** zentrale Möbel zuverlässig erkennen; kleine Fehler sind nur bei einfacher Korrekturmöglichkeit zulässig.
- **Veröffentlichung:** Testpersonen oder Öffentlichkeit erst nach Datenschutzprüfung und gesonderter Zustimmung.

### D-021: Lokale Projekte in Phase 4A

- **Status:** Bestätigt und umgesetzt
- **Entscheidung:** Zuhause-Projekte werden in Phase 4A ausschließlich lokal und versioniert im Browserspeicher abgelegt.
- **Gespeichert:** Projektname, Wohnzimmerstil, deutsche Postleitzahl und Budget.
- **Fotos:** Bilddateien und Bildvorschauen werden nicht dauerhaft gespeichert und müssen nach einem Neuladen oder Browser-Neustart erneut ausgewählt werden.
- **Grenze:** Die lokale Speicherung ist ein Teststand und kein Ersatz für die später vorgesehene private Speicherung mit Konten und Supabase.

### D-022: Automatische Qualitätsprüfungen auf GitHub

- **Status:** Bestätigt und umgesetzt
- **Entscheidung:** Pull Requests nach `main` und Änderungen an `main` führen automatisch Produktions-Build, ESLint und die Playwright-Abläufe für Desktop und Mobil aus.
- **Sicherheit:** Der Workflow besitzt nur Lesezugriff auf Repository-Inhalte, verwendet keine Geheimnisse und führt kein Deployment aus.
- **Kostenbegrenzung:** Gleichartige veraltete Läufe werden abgebrochen; Playwright-Fehlerberichte werden nur bei Fehlschlägen und höchstens sieben Tage gespeichert.

### D-023: Freiwillige Möbelprüfung mit lokalen Testdaten in Phase 4B

- **Status:** Bestätigt und umgesetzt
- **Simulation:** Nach Auswahl mindestens eines Fotos in der aktuellen Browsersitzung kann eine klar als Simulation bezeichnete Erkennung mit sechs vorbereiteten Möbeln gestartet werden. Das Foto wird dabei nicht analysiert.
- **Vorgaben:** Für erkannte Möbel ist „Keine Vorgabe“ der neutrale Ausgangszustand. „Behalten“ und „Ersetzen“ sowie ein Kommentar bis 300 Zeichen sind freiwillig; der Nutzer muss nicht jedes Möbelstück bearbeiten.
- **Korrektur:** Erkannte Möbel können korrigiert werden. Bereits gewählte Vorgaben und Kommentare bleiben dabei erhalten.
- **Entfernen und Ergänzen:** Einträge können ohne Bestätigungsdialog entfernt und unmittelbar wiederhergestellt werden. Zusätzliche Möbel stammen aus einem gruppierten lokalen Katalog; für Esszimmerstühle kann eine Anzahl von eins bis sechs gewählt werden.
- **Raumnotiz:** Eine allgemeine freiwillige Raumnotiz bis 500 Zeichen wird unterstützt.
- **Darstellung:** Alle Möbel erscheinen platzsparend in einer kompakten Auswahl. Der vollständige Bearbeitungsbereich wird nur für das aktuell ausgewählte Möbel angezeigt.
- **Speicherung:** Die Möbelangaben werden im versionierten lokalen Projektformat Version 2 gespeichert. Projekte aus Version 1 werden ohne Verlust ihrer bisherigen Planungsdaten automatisch übernommen. Fotos bleiben weiterhin sitzungsgebunden.

### D-024: Lokale Testentwürfe und Vergleich in Phase 4C

- **Status:** Bestätigt, umgesetzt, automatisiert geprüft und visuell freigegeben
- **Testgrenze:** Lokale Testprojekte dürfen vor Einführung der Konten bis zu drei Testentwürfe pro Wohnzimmer speichern, damit Grenze und Vergleich geprüft werden können. Die spätere Regel bleibt ein Gastentwurf beziehungsweise höchstens drei gespeicherte Kontoentwürfe.
- **Inhalt:** Ein Testentwurf speichert den Planungsstand zum Erstellungszeitpunkt und ergänzt eine vorbereitete Farbpalette sowie Konzeptbeschreibung. Er ist ausdrücklich keine KI-Ausführung und enthält noch kein erzeugtes Raumbild.
- **Beständigkeit:** Spätere Änderungen an Stil, Budget oder Möbelangaben verändern vorhandene Entwürfe nicht.
- **Darstellung:** Entwürfe werden in der rechten Spalte „Ihre Planung“ auf Desktop und unterhalb der Planung auf Mobilgeräten immer untereinander angezeigt. Auch ausgewählte Vergleichsentwürfe stehen untereinander.
- **Erstellung und Details:** Eine Aktion erzeugt alle drei unterschiedlichen Testvarianten. Nach dem Löschen ergänzt dieselbe Aktion ausschließlich die fehlende Variante. Die Zusammenfassung eines geöffneten Entwurfs erscheint direkt unter seiner Karte; beim Öffnen eines anderen Entwurfs wird die vorherige Zusammenfassung nur eingeklappt, nicht gelöscht.
- **Grenze:** Ein vierter Testentwurf wird blockiert. Es wird kein vorhandener Entwurf automatisch überschrieben.
- **Löschen:** Einzelne Entwürfe werden sofort entfernt und können unmittelbar über „Rückgängig“ wiederhergestellt werden.
- **Speicherung:** Testentwürfe werden im lokalen Datenformat Version 3 gespeichert. Projekte aus Version 1 und 2 werden ohne Verlust ihrer bisherigen Daten übernommen.

### D-025: Sicherer Zwischenstand der Kontolöschung

- **Status:** Bestätigt und umgesetzt am 27. August 2026
- **Entscheidung:** Die frühere sofortige Kontolöschung bleibt für angemeldete Nutzer gesperrt, bis die bestätigte 14-Tage-Widerrufsfrist vollständig umgesetzt und geprüft ist.
- **Sicherheit:** Die Sperre gilt sowohl in der Oberfläche als auch als Berechtigungsentzug in Supabase. Es wurden dabei keine Konten oder Nutzerdaten gelöscht.
- **Offen:** Antrag, Widerruf, endgültige Löschung nach 14 Tagen und Bereinigung von Sicherungskopien werden in einem eigenen freigegebenen Arbeitsschritt umgesetzt.

### D-026: Papierkorb und verzögerte Kontolöschung

- **Status:** Bestätigt, umgesetzt und im Produktivprojekt geprüft am 27. August 2026
- **Projektlöschung:** Projekte bleiben nach dem Verschieben in den Papierkorb 30 Tage wiederherstellbar und werden erst danach endgültig gelöscht.
- **Kontolöschung:** Kontolöschungen bleiben 14 Tage widerrufbar. Während dieser Frist ist der normale Zugriff auf die Projektdaten gesperrt.
- **Automatisierung:** Ein täglich geplanter, durch einen eigenen geheimen Schlüssel geschützter Löschdienst verarbeitet ausschließlich fällige Löschungen.
- **Minimalrechte:** Der Löschdienst darf Projekte lesen und löschen, Fotopfade und fällige Kontolöschungen lesen sowie abgeschlossene Löschungen protokollieren. Er erhält keine darüber hinausgehenden Schreibrechte auf diese Tabellen.
- **Prüfung:** Der produktive Abschlusstest antwortete mit Status 200 und verarbeitete bei null fälligen Projekten und null fälligen Konten keine Daten.
- **Offen vor öffentlicher Veröffentlichung:** Der vorbereitete E-Mail-Versand muss noch mit einem freigegebenen Anbieter verbunden und im Entwicklungsprojekt geprüft werden. Der aktuelle kostenlose Supabase-Tarif erstellt keine automatischen Datenbanksicherungen; vor einem Tarifwechsel oder eigenen Sicherungen muss die 30-Tage-Löschregel technisch abgesichert werden.

### D-027: Benachrichtigungen zur Kontolöschung und Sicherungskopien

- **Status:** Bestätigt, verbunden, veröffentlicht und im Entwicklungsprojekt geprüft
- **Benachrichtigungen:** Löschantrag, Widerruf und eine Erinnerung sieben Tage vor der endgültigen Löschung erzeugen jeweils einen eigenen, nicht öffentlich lesbaren Versandauftrag.
- **Fehlerverhalten:** Ein vorübergehender E-Mail-Fehler darf den Löschantrag oder Widerruf nicht rückgängig machen. Fehlversuche werden begrenzt protokolliert und können erneut verarbeitet werden.
- **Datensparsamkeit:** E-Mails enthalten keine Raumfotos, Projektinhalte oder sonstigen Nutzereingaben.
- **Anbieter:** Resend versendet die datensparsamen transaktionalen Nachrichten im kostenlosen Tarif. Der eingeschränkte Schlüssel liegt ausschließlich als Supabase-Geheimnis vor. Löschantrag und Widerruf wurden im Entwicklungsprojekt erfolgreich zugestellt.
- **Sicherheitskopien:** Im kostenlosen Supabase-Tarif bestehen keine automatischen Datenbanksicherungen. Sobald ein Tarif oder ein eigener Prozess Sicherungskopien erzeugt, muss deren Bereinigung innerhalb der bestätigten 30-Tage-Frist vorab nachgewiesen werden.

### D-028: Abschluss von Phase 5 – Kontozuordnung, Gastübernahme und Foto-Einwilligung

- **Status:** Bestätigt und technisch umgesetzt; juristische Schlussprüfung vor externer Nutzung offen
- **Kontonummer:** Jedes Konto erhält automatisch eine eindeutige achtstellige Nummer. Nutzer können nur die eigene Nummer lesen und sie nicht verändern.
- **Gastübernahme:** Bei einer Registrierung wird ausschließlich das aktuell geöffnete lokale Projekt vorgemerkt. Nach erfolgreicher Anmeldung wird es sicher in das neue Konto geschrieben und erst danach aus dem lokalen Browser-Speicher entfernt. Der Vorgang ist wiederholbar, ohne ein zweites Projekt anzulegen.
- **Foto-Einwilligung:** Private Raumfotos können erst nach einer protokollierten Einwilligung hochgeladen werden. Der Widerruf wird protokolliert, sperrt weitere Uploads und löscht vorhandene private Raumfotos.
- **KI-Trennung:** Die Foto-Speichereinwilligung erlaubt keine KI-Verarbeitung. Dafür bleibt vor Phase 7 eine getrennte Einwilligung erforderlich.
- **Nachweis:** Mehrnutzer-, Kontonummer-, Einwilligungs-, Zugriffs- und Löschregeln werden automatisch geprüft. Der technische Datenschutzstand und die offenen juristischen Angaben sind in `docs/PHASE_5_PRIVACY_READINESS.md` dokumentiert.

### D-029: Kostenloser lokaler KI-Machbarkeitstest

- **Status:** Bestätigt am 30. August 2026; Umsetzung und Qualitätsprüfung laufen
- **Entscheidung:** Vor einer kostenpflichtigen Cloud-API wird die automatische Möbelerkennung mit einem austauschbaren lokalen Browser-Modell geprüft. Diese Entscheidung ersetzt für den ersten Erkennungstest den in D-012 genannten OpenAI-API-Kandidaten; OpenAI bleibt eine spätere, nicht freigegebene Option für Bildbearbeitung.
- **Kosten:** Der Test erzeugt keine API-Nutzungsgebühren und hinterlegt keinen kostenpflichtigen KI-Schlüssel. Das Erkennungsmodell wird beim ersten Start von Hugging Face geladen und anschließend im Browser zwischengespeichert.
- **Datenschutz:** Das Raumfoto wird für diesen Test nur im Browser verarbeitet. Vor der Analyse ist eine ausdrückliche, sitzungsbezogene Freigabe erforderlich. Das Foto wird nicht an Hugging Face, OpenAI, Google oder Raumly übertragen.
- **Gerätegrenze:** Der Entwicklungsrechner besitzt 16 GB Arbeitsspeicher und eine integrierte Intel-UHD-620-Grafik. Deshalb wird ein quantisiertes DETR-Modell im Prozessormodus (WASM) verwendet; große lokale Modelle sind für diesen Rechner nicht vorgesehen.
- **Qualitätsgrenze:** Der erste Test erkennt nur vom COCO-Modell unterstützte Wohnzimmerobjekte, darunter Sofa, Stuhl, Esstisch, Fernseher und Zimmerpflanze. Nutzerkorrekturen bleiben zwingender Bestandteil des Ablaufs.
- **Abbruchregel:** Ist die Erkennung auf mehreren neutralen Bildern zu langsam oder bei zentralen Möbeln unzuverlässig, wird dieser Modellweg nicht weiter ausgebaut. Dann wird erneut zwischen einem anderen lokalen Modell und einem ausdrücklich freigegebenen, kostenbegrenzten Cloud-Test entschieden.
- **Diagnose auf Zielhardware:** Auf dem Zielrechner wird bewusst der Prozessor-Modus (WASM) verwendet. Der schnellere WebGPU-Modus der integrierten Intel-Grafik lieferte bei einem realen Raumfoto fälschlich keine Treffer. Gleiche Möbelarten werden nur einmal mit dem jeweils sichersten Treffer angezeigt.
- **Sicheres Projektspeichern:** Bestehende Privatprojekte werden ausschließlich über die freigegebenen veränderbaren Felder aktualisiert. Geschützte Identitäts- und Erstellungsfelder werden nur beim erstmaligen Anlegen geschrieben und nicht durch ein allgemeines Upsert überschrieben.

### D-030: Bewertung zusätzlicher lokaler Erkennungsmodelle

- **Status:** Abgeschlossen und verworfen am 30. August 2026; die stabile DETR-Basiserkennung wurde wiederhergestellt
- **Ergebnis Grounding DINO:** Das Modell lieferte auf den freigegebenen Raumfotos deutliche Fehlklassifikationen und wurde nicht in das Produkt übernommen.
- **Ergebnis OWL-ViT:** Das Modell erkannte im technischen Vergleich zusätzliche Möbelarten. Im echten Browser auf dem Zielrechner startete es jedoch weder mit allen Begriffen noch in kleinen Vierergruppen zuverlässig. Ein Start vor dem Basismodell führte sogar zum vollständigen Ausfall der Erkennung.
- **Entscheidung:** OWL-ViT wird auf diesem Zielgerät nicht weiterverwendet. Weitere Grenzwert- oder Reihenfolgeexperimente finden nicht statt. Das bewährte quantisierte DETR-Modell bleibt die einzige automatische lokale Erkennung und unterstützt zuverlässig Sofa, allgemeinen Stuhl beziehungsweise Sessel, Esstisch, Fernseher und Zimmerpflanze.
- **Katalog:** Alle 26 Wohnzimmer-Möbelarten bleiben weiterhin manuell ergänzbar und korrigierbar. Eine automatische Erkennung aller 26 Kategorien ist mit der aktuellen lokalen Technik ausdrücklich noch nicht erreicht.
- **Kosten und Datenschutz:** Die Tests verursachten keine API-Kosten und übertrugen keine Raumfotos an einen KI-Dienst.
- **Prüfung:** Drei echte Browser-Sichttests bestätigten den reproduzierbaren Ausfall des Zusatzmodells. Die Basiserkennung blieb beim sicheren Ablauf funktionsfähig und erkannte auf dem abschließenden Foto Fernseher, Sessel und Sofa korrekt.

### D-031: Produktweg nach dem lokalen Erkennungstest

- **Status:** Bestätigt am 30. August 2026
- **Entscheidung:** Für das Testprodukt bleibt die stabile kostenlose DETR-Erkennung als freiwillige Hilfe bestehen. Fehlende oder falsche Möbel werden über den vorhandenen vollständigen Katalog vom Nutzer ergänzt beziehungsweise korrigiert.
- **Verlässliche Grundlage:** Nicht das ungeprüfte KI-Ergebnis, sondern ausschließlich die anschließend vom Nutzer bestätigte Möbelliste darf für Einrichtungsvorschläge, Budgetplanung und spätere Händlerzuordnungen verwendet werden.
- **Priorität:** Weitere lokale Erkennungsmodelle, ein eigenes Training und kostenpflichtige Cloud-KI werden vorerst nicht weiterverfolgt. Die Produktentwicklung konzentriert sich als Nächstes auf den Nutzen der bestätigten Planungsangaben.
- **Kosten und Datenschutz:** Dieser Weg erzeugt keine zusätzlichen KI-Kosten und überträgt keine Raumfotos an externe KI-Dienste.

### D-032: Vereinfachter Hauptablauf vor der Bild-KI

- **Status:** Bestätigt und umgesetzt am 30. August 2026
- **Hauptablauf:** Das Testprodukt führt durch Zimmerauswahl, Designstil, Foto und Budget. Danach werden die Angaben zusammengefasst und der spätere Inspirationsentwurf vorbereitet.
- **Möbelerkennung:** Die lokale Erkennung, Nutzerkorrektur und bisherigen Testentwürfe bleiben technisch und in gespeicherten Projektdaten erhalten, sind aber kein Bestandteil des normalen Nutzerablaufs mehr. Diese Entscheidung ersetzt insoweit die Hauptablauf-Priorität aus D-031.
- **Postleitzahl:** Die Postleitzahl bleibt als optionale Vorbereitung für spätere regionale Händlerempfehlungen erhalten und blockiert die Zusammenfassung nicht.
- **KI-Grenze:** In diesem Arbeitsabschnitt wird kein Bild extern erzeugt, kein Foto an einen KI-Anbieter übertragen und keine KI-Nutzungsgebühr verursacht. Die echte Bild-KI wird getrennt ausgewählt, kostenbegrenzt und datenschutzrechtlich freigegeben.
- **Datenkontinuität:** Konten, Projekte, Fotos, Einwilligungen, Löschregeln sowie bestehende Möbel- und Entwurfsdaten werden nicht migriert oder gelöscht.

## Offene Entscheidungen

- Markenname und visuelle Identität
- Geschäftsmodell und Preisgestaltung
- Erste Händler- und Produktdatenquellen
- Kaufmessung und Provisionslogik
- Hostinganbieter und Veröffentlichungszeitpunkt
- endgültige KI-Anbieterauswahl nach dem Machbarkeitstest
- konkrete Supabase-Region und Tarif
