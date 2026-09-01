# Phase 10: Produktgebundene Einrichtungskonzepte

## Ziel und sicherer Zwischenstand

Raumly soll später automatisch ein Einrichtungskonzept aus tatsächlich kaufbaren Produkten im gewählten Stil und innerhalb des Gesamtbudgets erzeugen. Da derzeit weder ein autorisierter Produktfeed noch Nutzungsrechte an Händlerbildern vorliegen, verwendet dieser Arbeitsstand ausschließlich klar gekennzeichnete synthetische Testprodukte. Sie sind nicht kaufbar und dürfen nicht als Händlerangebot erscheinen.

## Umgesetzter Ablauf

Nach Stil, Foto und Budget erstellt Raumly automatisch eine Produktauswahl. Produktpreise und Versand zählen gemeinsam gegen das Budget. Zusätzlich bleiben fünf Prozent Sicherheitsreserve, mindestens 20 Euro und höchstens 100 Euro, unangetastet. Zuerst werden Sofa, Couchtisch, Teppich und Stehleuchte ausgewählt; nur danach kommen optionale Produkte hinzu. Reicht das Budget nicht für die Grundausstattung, wird das Ergebnis als unvollständig bezeichnet und nichts über das Limit hinaus ausgewählt.

Die Oberfläche zeigt eine schematische, von Raumly selbst gezeichnete Konzeptvorschau. Sie ist ausdrücklich kein KI-generiertes Raumfoto. Die Auswahl wird zusammen mit dem lokalen beziehungsweise privaten Projektstand gespeichert. Alte Projektstände werden verlustfrei auf das neue Datenformat übernommen.

## Rechte- und Kostensperre

Ein Produkt darf nur dann in eine spätere Bildgenerierung eingehen, wenn Preis, Verfügbarkeit und ausdrückliche Rechte für Anzeige und KI-Verarbeitung belegt sind. Alle aktuellen Testprodukte tragen den Status `synthetic-development-only`; dadurch bleibt die Bildgenerierung gesperrt. Dieser Arbeitsstand ruft weder Vertex AI noch einen anderen externen KI-Dienst auf, überträgt keine Fotos und erzeugt keine KI-Kosten.

## Prüfkriterien

- Produktsumme plus Versand plus Reserve überschreiten das Nutzerbudget nie.
- Nur Produkte des gewählten Stils und mit vollständigen Preisdaten werden ausgewählt.
- Ein zu kleines Budget führt zu einer ehrlichen unvollständigen Auswahl.
- Synthetische Produkte werden überall als Testprodukte bezeichnet und sind nicht verlinkt.
- Ohne belegte Bildrechte bleibt die externe Bildgenerierung technisch gesperrt.
- Der bisherige Planungs-, Konto-, Foto- und interne Vertex-Testablauf bleibt unverändert.

## Nächster freizugebender Schritt

Vor echten Produkten benötigt Raumly einen Vertrag, Datenfeed oder API-Zugang mit schriftlicher Erlaubnis für Produktdaten, Händlerbilder, Preisanzeige, Aktualisierung und gegebenenfalls KI-Verarbeitung. Erst danach werden Feed-Import, Aktualitätskontrolle, echte Links und ein separater Bildtest geplant. Kosten, Datenschutz und Bildübertragung brauchen weiterhin eine eigene Freigabe.
