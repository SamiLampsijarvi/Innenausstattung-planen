# Phase 9 – Raumtreue und Ergebnisqualität

## Verbindliches Ziel

Ein Inspirationsbild darf nur dann als brauchbar gelten, wenn sichtbare Türen, Fenster, Durchgänge, Wände, Boden und Perspektive des Ausgangsfotos erhalten bleiben. Möbel, Farben, Textilien und Dekoration dürfen sich im Rahmen des gewählten Stils und Budgets ändern. Ein erfundenes Architekturelement – etwa eine zusätzliche Tür – ist ein Ablehnungsgrund.

## Kostenfreier erster Abschnitt

1. Den Bildauftrag als kontrollierte Raum-Bearbeitung formulieren: feste Baumerkmale bleiben unverändert; bei Unsicherheit darf das Modell kein neues Baumerkmal erfinden.
2. Für jedes Testfoto ein Raumtreue-Profil erfassen: Anzahl sichtbarer Türen, Fenster und Durchgänge sowie die bestätigte Blickrichtung.
3. Jedes erzeugte Testbild erhält den Zustand `Prüfung ausstehend`. Es darf nicht als brauchbare Inspiration in den normalen Ablauf gelangen.
4. Eine verpflichtende menschliche Prüfung vergleicht Original und Ergebnis anhand von Türen, Fenstern, Durchgängen, Wänden, Boden und Perspektive. Bei einem Fehler wird das Ergebnis verworfen; Reservierung und Versuch bleiben nachvollziehbar bestehen.
5. Die Auswertung unterscheidet erfolgreiche Generierung von akzeptierter Raumtreue. Ein technisch erfolgreiches, aber strukturell falsches Bild zählt nicht als brauchbar.

## Spätere, gesondert freizugebende Automatisierung

Eine automatische Bildprüfung kann nur ein Vorfilter sein, keine absolute Garantie. Sie würde mindestens einen weiteren Modellaufruf oder einen zusätzlichen Computer-Vision-Dienst benötigen und damit weitere Fotoübertragung, Kosten und Datenschutzprüfung auslösen. Sie wird in diesem Abschnitt nicht aktiviert.

## Prüfkriterien

- Ohne Raumtreue-Profil ist kein Bildauftrag möglich.
- Ohne bestätigte menschliche Prüfung ist kein Ergebnis als brauchbar markiert oder im normalen Ablauf sichtbar.
- Eine erkannte oder gemeldete erfundene/fehlende Tür, ein Fenster, Durchgang, eine Wand, ein anderer Boden oder eine veränderte Perspektive verwirft das Ergebnis.
- Der normale Planungsablauf und die bestehenden Phase-7-/Phase-8-Kosten- und Einwilligungsgrenzen bleiben unverändert.
- Mindestens 20 vorab festgelegte Testfälle werden vor einer Produktentscheidung bewertet; das ist eine Qualitätsmessung, keine Garantie über alle künftigen Räume.

## Risiken und Entscheidung

Bildmodelle können trotz genauer Anweisungen Architekturdetails verändern. Die verlässliche Schutzmaßnahme der ersten Ausbaustufe ist daher die Sperre bis zur menschlichen Prüfung. Google dokumentiert Bildgenerierung und Bildbearbeitung, aber keine Garantie für unveränderte Raumgeometrie; Raumly darf eine solche Garantie nicht behaupten. [Google-Dokumentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/image-generation?hl=fr)

Die Umsetzung erfolgt auf einem eigenen Branch, ohne neue Bildaufrufe. Eine spätere automatische Prüfschicht benötigt eine neue, konkrete Kosten- und Datenschutzfreigabe.
