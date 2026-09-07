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

Die Prüfung misst Seitenverhältnis, Erhalt starker Kanten, Richtungen und räumliche Verteilung von Raumlinien. Das ist ein konservativer Vorfilter, keine Garantie für jede semantische Architekturänderung. Ein späterer echter Kandidat benötigt weiterhin die automatische Prüfung und die verpflichtende menschliche Prüfung.

## Abnahme vor einem Vertex-Versuch

- Alle sechs Lichtvarianten bestehen.
- Alle sechs Zuschnitt- und Perspektivvarianten werden verworfen.
- Kein Bild befindet sich in Git, Supabase oder Vertex; der normale Produktablauf bleibt unverändert.
- Bei einer Fehlklassifikation werden Schwellen oder Vergleichslogik erst lokal nachgebessert und der vollständige Lauf wiederholt.
- Erst danach wird ein möglicher einzelner Vertex-Versuch mit Foto-, Datenschutz- und Kostenfreigabe erneut zur Entscheidung vorgelegt.

## Lokale Abnahme am 7. September 2026

Der erste Lauf zeigte, dass vier Zuschnittvarianten die ursprüngliche, nur tolerant suchende Kantenprüfung fälschlich bestanden. Deshalb wurde `structure-v2` um den positionsgenauen Kantenerhalt ergänzt. Der wiederholte vollständige Lauf bestand: alle sechs Lichtvarianten wurden akzeptiert, alle sechs Zuschnitt- und alle sechs Perspektivvarianten abgelehnt. Dabei gab es keine Vertex- oder Supabase-Anfrage und keine Änderung der Testbuchhaltung.
