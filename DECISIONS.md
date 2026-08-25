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

- **Status:** Bestätigt, noch nicht umgesetzt
- **Entscheidung:** Supabase ist als Grundlage für Authentifizierung, relationale Daten und private Fotoablage vorgesehen.
- **Vorbehalt:** Region, Datenschutzbedingungen, Kosten und Löschmöglichkeiten werden vor der Einrichtung erneut geprüft. Externe Einrichtung oder Kosten benötigen Zustimmung.

### D-012: KI-Machbarkeitstest

- **Status:** Bestätigt, noch nicht umgesetzt
- **Entscheidung:** OpenAI wird als erster Kandidat für einen begrenzten Test von Möbelerkennung und realistischer Bildbearbeitung verwendet.
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
- **Sicherheitskopien:** spätestens 30 Tage nach endgültiger Löschung bereinigen.
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

## Offene Entscheidungen

- Markenname und visuelle Identität
- Geschäftsmodell und Preisgestaltung
- Erste Händler- und Produktdatenquellen
- Kaufmessung und Provisionslogik
- Hostinganbieter und Veröffentlichungszeitpunkt
- endgültige KI-Anbieterauswahl nach dem Machbarkeitstest
- konkrete Supabase-Region und Tarif
