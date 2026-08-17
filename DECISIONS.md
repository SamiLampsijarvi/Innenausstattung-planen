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
- **Folge:** Weitere Raumtypen bleiben außerhalb des ersten vollständigen MVP und werden erst nach der Validierung des Wohnzimmer-Ablaufs priorisiert.

### D-006: Navigationsstruktur des MVP

- **Status:** Bestätigt
- **Entscheidung:** Die Website verwendet eine zweistufige Navigation nach der vom Nutzer bereitgestellten Handskizze. Sie umfasst Sprache und Standort, Homepage, Zimmer, Produkte, Suche, Preisgestaltung, Anmeldung, Favoriten und Services.
- **MVP-Grenze:** Nur die Homepage und die Wohnzimmerplanung sind aktiv. Noch nicht umgesetzte Bereiche werden eindeutig als „Bald verfügbar“ gekennzeichnet; nicht entschiedene Preise werden nicht angezeigt.

### D-007: Datenschutzfreundliche Standortbestimmung

- **Status:** Bestätigt
- **Entscheidung:** Die Standortabfrage erfolgt ausschließlich nach einem bewussten Klick des Nutzers. Als Alternative steht die manuelle Eingabe einer deutschen Postleitzahl zur Verfügung.
- **Datenschutz:** Der ungefähre Standort wird nur vorübergehend in der laufenden Browsersitzung verwendet, nicht dauerhaft gespeichert und nicht an externe Dienste übertragen. Eine Ablehnung schränkt die Nutzung der Website nicht ein.
- **Technische Grenze:** Die automatische Browser-Standortabfrage benötigt im regulären Betrieb eine sichere HTTPS-Verbindung; für lokale Tests ist ein geeigneter lokaler Webserver erforderlich.

## Vorläufig

### D-008: Arbeitsname

- **Status:** Vorläufig, nicht bestätigt
- **Entscheidung:** Der aktuelle Prototyp verwendet den Namen „Raumly“.
- **Hinweis:** Der Nutzer kann den Namen später ersetzen.

### D-009: Technische Grundlage des ersten Prototyps

- **Status:** Vorläufig
- **Entscheidung:** Der erste MVP besteht aus HTML, CSS und JavaScript ohne externe Anwendungsabhängigkeiten.
- **Begründung:** Dadurch ist er unmittelbar lokal ausführbar und eignet sich zur frühen Validierung.

## Offene Entscheidungen

- Markenname und visuelle Identität
- Geschäftsmodell und Preisgestaltung
- Produktionsfähiger Technologie-Stack
- KI-Anbieter und Generierungsverfahren
- Erste Händler- und Produktdatenquellen
