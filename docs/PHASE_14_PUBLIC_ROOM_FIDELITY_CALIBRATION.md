# Phase 14 – lokale Raumtreue-Kalibrierung mit öffentlichen Testbildern

## Zweck und Grenze

Dieser rein lokale Arbeitsschritt kalibriert die bestehende automatische Strukturprüfung vor einem weiteren kostenpflichtigen Bildversuch. Er erzeugt keine Bilder mit Vertex, überträgt keine Fotos an einen Anbieter, verändert weder den normalen Planungsablauf noch die Testbuchhaltung.

Die Bilder sind lediglich ein technischer Prüfbestand. Sie sind keine Produktbilder, werden nicht veröffentlicht, nicht an Google übertragen und können echte, später freiwillig hochgeladene Wohnzimmerfotos nicht vollständig repräsentieren.

## Lokaler, nicht versionierter Bestand

Der Bestand liegt ausschließlich unter `private-evaluation/room-fidelity-calibration/` und wird durch `.gitignore` von Git ausgeschlossen. Jede Datei wird ohne übernommene EXIF-/Standortmetadaten als JPEG abgelegt. Das zugehörige Quellenprotokoll liegt lokal daneben; sein Inhalt wird nicht in Git eingecheckt.

Der einmalige Abruf ist bewusst nur über `pnpm prepare:room-fidelity-calibration --confirm-download` möglich. Der Befehl ruft ausschließlich die sechs unten benannten Pexels-Dateien ab, speichert keine unveränderte Quelldatei und kennt weder Vertex noch Supabase noch Zugangsdaten.

| Kennung | Quelle | Urheber laut Quellseite | Architektur-Schwerpunkt |
| --- | --- | --- | --- |
| R01 | [Pexels 5353938](https://www.pexels.com/photo/empty-living-room-with-wooden-floor-and-green-walls-5353938/) | Curtis Adams | große Fenster, Holzboden, Wandflächen |
| R02 | [Pexels 6835103](https://www.pexels.com/photo/empty-living-room-6835103/) | Curtis Adams | weiter Raum, Boden, Deckenlinien |
| R03 | [Pexels 7027844](https://www.pexels.com/photo/an-empty-living-room-with-hardwood-flooring-7027844/) | Curtis Adams | Fenster, Decke, Blickrichtung |
| R04 | [Pexels 15062100](https://www.pexels.com/photo/empty-living-room-with-with-walls-15062100/) | Curtis Adams | Kamin, Wände, Boden |
| R05 | [Pexels 34764063](https://www.pexels.com/photo/bright-and-spacious-empty-living-room-interior-34764063/) | Peter Vang | neutrale Wand, Teppich, Fenster |
| R06 | [Pexels 34764078](https://www.pexels.com/photo/spacious-empty-living-room-with-carpet-flooring-34764078/) | Peter Vang | Tür, Fenster, Teppich, Perspektive |

Bei jedem Abruf werden die Quellseite, Urheberangabe, Abrufdatum und die [Pexels-Lizenz](https://www.pexels.com/license/) lokal protokolliert. Vor einer Veröffentlichung, Weitergabe oder einer Nutzung außerhalb dieses Tests ist die Lizenz erneut zu prüfen. Personen, sichtbare private Unterlagen sowie erkennbare Marken oder Kunstwerke sind aus dem Bestand ausgeschlossen.

## Prüflauf

`pnpm test:room-fidelity-calibration` arbeitet ausschließlich mit den lokalen Dateien. Für jedes Bild erzeugt es drei technische Vergleichsversionen:

1. Eine moderate Licht-/Farbänderung bei unveränderter Geometrie muss bestehen.
2. Ein nachträglicher Zuschnitt mit Rückskalierung muss verworfen werden.
3. Eine perspektivische Verschiebung muss verworfen werden.
4. Eine kleine Testmöblierung im Bodenbereich muss bestehen.
5. Eine zusätzliche türähnliche Fläche im Wandbereich muss verworfen werden.

Die Prüfung misst Seitenverhältnis, Erhalt starker Kanten, Richtungen und räumliche Verteilung von Raumlinien. Das ist ein konservativer Vorfilter, keine Garantie für jede semantische Architekturänderung. Ein späterer echter Kandidat benötigt weiterhin die automatische Prüfung und die verpflichtende menschliche Prüfung.

## Abnahme vor einem Vertex-Versuch

- Alle sechs Licht- und Möbelvarianten bestehen.
- Alle sechs Zuschnitt-, Perspektiv- und Türvarianten werden verworfen.
- Kein Bild befindet sich in Git, Supabase oder Vertex; der normale Produktablauf bleibt unverändert.
- Bei einer Fehlklassifikation werden Schwellen oder Vergleichslogik erst lokal nachgebessert und der vollständige Lauf wiederholt.
- Erst danach wird ein möglicher einzelner Vertex-Versuch mit Foto-, Datenschutz- und Kostenfreigabe erneut zur Entscheidung vorgelegt.

## Lokale Abnahme am 7. September 2026

Der erste Lauf zeigte, dass vier Zuschnittvarianten die ursprüngliche, nur tolerant suchende Kantenprüfung fälschlich bestanden. Deshalb wurde `structure-v2` um den positionsgenauen Kantenerhalt ergänzt. Der zweite Lauf zeigte anschließend, dass eine künstlich ergänzte Tür noch durchgelassen wurde. `structure-v3` verwirft deshalb zusätzlich größere neue Bildflächen im Wandbereich. Der wiederholte vollständige Lauf bestand: alle sechs Licht- und Möbelvarianten wurden akzeptiert; alle sechs Zuschnitt-, Perspektiv- und Türvarianten abgelehnt. Dabei gab es keine Vertex- oder Supabase-Anfrage und keine Änderung der Testbuchhaltung.

## Nachprüfung am 19. Oktober 2026: möblierte Eingabe

Der Bildversuch vom 18. Oktober mit einem bereits möblierten Wohnzimmer lieferte einen visuell überzeugenden Japandi-Kandidaten, wurde jedoch von `structure-v3` verworfen. Die zuvor nur lesend erfassten Werte waren: allgemeiner Kantenerhalt `0,949`, positionsgenauer Kantenerhalt `0,685` bei Mindestwert `0,82`, Richtungsähnlichkeit `0,974`, regionale Ähnlichkeit `0,960` und Wandänderungsrate `0,302` bei Höchstwert `0,015`. Das Seitenverhältnis lag innerhalb der Grenze. Diese Zahlen belegen die beiden auslösenden Regeln, aber ohne einen als architektursicher markierten Bildvergleich nicht, ob der Kandidat tatsächlich unveränderte feste Bauteile zeigt. Original und Kandidat bleiben außerhalb von Git.

Die zusätzliche Offline-Prüfung verwendet zwei Arten von Testfällen:

- Ein vollständig künstliches Zimmer zeigt reproduzierbar Fehlablehnungen, wenn vorhandene Möbel entfernt und Wanddekoration ergänzt werden. Diese drei Fälle sind in `tests/e2e/structural-fidelity.spec.ts` als **erwartete Fehler** gekennzeichnet, damit die Lücke sichtbar bleibt und eine spätere Korrektur ausdrücklich geprüft werden muss. Eine neu erfundene Tür wird weiterhin verworfen.
- Am öffentlichen Foto R06 bestehen eine kleine Wanddekoration und das Entfernen eines Testmöbels jeweils einzeln. Die Kombination aus Möbelentfernung, Lichtänderung und Wanddekoration wird abgelehnt und ist als erwarteter Fehler dokumentiert. Alle sechs öffentlichen Fotos verwerfen weiterhin Zuschnitt, Perspektivverschiebung und eine zusätzliche Tür.

Der Befund widerlegt eine einfache Erklärung wie „jede Wanddekoration wird verworfen“: Entscheidend ist die Kombination mehrerer sichtbarer Änderungen. Die aktuelle Prüfung zählt auch Möbelkanten als mögliche feste Raumkanten und misst großflächige Helligkeitsunterschiede im oberen Bildbereich als Wandänderung. Ein bloßes Herabsetzen der Grenzwerte könnte zusätzliche Türen oder veränderte Perspektiven durchlassen. Deshalb bleiben Version, Grenzwerte, automatische Sperre und menschliche Prüfung unverändert. Die neuen Tests sind Diagnose und Regressionsschutz, keine Freigabe möblierter Räume für den Produktbetrieb.

## Nachbesserung am 23. Oktober 2026: Fensterteilung als zusätzliches Warnsignal

`structure-v4` prüft im oberen Bildbereich zusätzlich, ob neue starke horizontale und vertikale Kanten über mindestens sechs Analysepunkte in vier Richtungen zusammenlaufen. Das ist typisch für die Mittelteilung eines neu erzeugten Fensters, aber nicht für den getesteten Bildrahmen mit Kreisdekoration. Der vollständige lokale Lauf R01–R06 besteht danach weiterhin; die zuvor durchgelassene Fenster-Variante auf R06 wird nun verworfen. R04 bleibt bewusst als erwarteter Fehler markiert. R07 und R08 waren auf diesem Rechner nicht vorhanden und konnten deshalb nicht als Rückhalteprüfung ausgeführt werden. Diese Änderung verbessert eine eng belegte Sicherheitslücke, ist aber keine Freigabe für möblierte Räume.

Für eine spätere Korrektur werden weitere rechtmäßig nutzbare, lokal markierte Vorher-Nachher-Paare benötigt, die Dekoration und Möbelaustausch **sowie** echte Änderungen an Türen, Fenstern und Blickrichtung enthalten. Erst wenn dieselbe Regel die erlaubten Fälle annimmt und die Architekturfehler weiter ablehnt, wird eine Änderung des Produktfilters vorgeschlagen. `pnpm test:structure` läuft ohne Webserver; `pnpm test:room-fidelity-calibration` verwendet den weiterhin nicht versionierten öffentlichen Fotobestand. Beide Befehle starten keinen Anbieter.

Die lesende Buchhaltungsprüfung vom 19. Oktober meldete den verworfenen Versuch mit Provider-Quittung weiterhin als nicht abgerechnet: 18 Cent tatsächlich erfasst, 210 Cent reserviert, 30 Cent rechnerisch verbleibend, kein aktiver Versuch. Dieser Stand ist keine Kostenfreigabe. In dieser Nachprüfung wurde keine neue BigQuery-Abfrage und kein Vertex-Versuch gestartet.
