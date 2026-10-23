# Phase 15 – möblierte Eingaben gegen Architekturänderungen prüfen

## Ziel und Prüfmethode

Raumly soll später ein bereits möbliertes Wohnzimmer umgestalten können. Möbel, Licht und Dekoration dürfen sich ändern; Türen, Fenster, Wände, Bildausschnitt und Perspektive müssen erhalten bleiben. Diese Nachprüfung bewertet die damalige automatische Sperre `structure-v3` **offline**. Sie erzeugt kein Vertex-Bild und verändert weder Kostenlimits, Datenbank oder normalen Nutzerablauf.

Die am 19. Oktober dokumentierten synthetischen und öffentlichen Fälle waren der Entwicklungsbestand. Vor einer Filteränderung wurden zwei weitere [Pexels-Räume](https://www.pexels.com/license/) als getrennter Rückhaltebestand gewählt und zunächst nicht zur Anpassung von Regeln benutzt. Erst nach dem Ergebnis der sechs bisherigen Räume liefen die neuen Bilder R07 und R08 einmalig als Schlussprüfung. Alle acht Originalbilder und Quellenprotokolle bleiben unter `private-evaluation/room-fidelity-calibration/` außerhalb von Git; die JPEGs wurden ohne übernommene Metadaten gespeichert. Es wurden keine privaten Nutzerfotos verarbeitet.

| Kennung | Öffentliche Quelle | Urheber laut Quellseite | Rolle |
| --- | --- | --- | --- |
| R07 | [Pexels 7031603](https://www.pexels.com/photo/spacious-empty-room-with-white-walls-7031603/) | Max Vakhtbovych | zurückgehaltener Raum mit zwei Fenstern |
| R08 | [Pexels 18559639](https://www.pexels.com/photo/a-empty-room-with-white-walls-and-carpet-18559639/) | Stephen Leonardi | zurückgehaltener Raum mit Wandverkleidung |

`node scripts/prepare-public-room-fidelity-corpus.mjs --confirm-download-holdout` ruft nur diese beiden Dateien ab und überschreibt keinen Bestand. Die vorhandenen sechs Räume werden unverändert mit `--confirm-download` vorbereitet. Vor einer Veröffentlichung oder anderen Nutzung ist die Lizenz erneut zu prüfen.

Die erlaubte Testvariante beginnt jeweils mit einer künstlichen Möblierung und endet mit entferntem Testmöbel, moderater Lichtänderung und neuer Wanddekoration bei unverändertem Raum. Die verbotene Testvariante ergänzt ein kleines Fenster an der Wand. Zusätzlich müssen weiterhin Zuschnitt, Perspektivverschiebung und neue Tür abgelehnt werden; isolierte Lichtänderung und Testmöblierung sollen bestehen. Diese Overlays sind bewusst einfache technische Proben, keine fotorealistischen KI-Ergebnisse.

## Ergebnis vom 20. Oktober 2026

| Raum | Möblierung entfernt + Licht + Dekor | Neues Fenster | Andere Basisfälle |
| --- | --- | --- | --- |
| R01 | fälschlich abgelehnt | abgelehnt | bestanden |
| R02 | fälschlich abgelehnt | abgelehnt | bestanden |
| R03 | fälschlich abgelehnt | abgelehnt | bestanden |
| R04 | angenommen | **fälschlich angenommen** | bestanden |
| R05 | fälschlich abgelehnt | abgelehnt | bestanden |
| R06 | fälschlich abgelehnt | **fälschlich angenommen** | bestanden |
| R07, zurückgehalten | angenommen | **fälschlich angenommen** | bestanden |
| R08, zurückgehalten | fälschlich abgelehnt | abgelehnt | bestanden |

Damit nimmt der Filter nur 2 von 8 erlaubten kombinierten Umgestaltungen an und verwirft nur 5 von 8 erfundenen kleinen Fenstern. Alle geprüften Zuschnitte, Perspektivverschiebungen und neuen Türen wurden abgelehnt; Licht und einfache Testmöblierung bestanden. Die synthetischen Fehlablehnungen aus Phase 14 bleiben bestehen. Die bekannten Fehlfälle stehen ausdrücklich als `test.fail` in den Offline-Tests. Ein grüner Testlauf zählt diese erwarteten Fehler als dokumentierte Lücken, **nicht** als bestandene Produktqualität.

Die Ursache einer riskanten Pauschalkorrektur ist messbar: Auf R06 hat das zusätzliche Fenster eine Wandänderungsrate von `0,012`, die erlaubte kombinierte Umgestaltung aber `0,023`. Eine höhere Toleranz für die erlaubte Umgestaltung würde das Fenster nicht stoppen; es wird schon jetzt durchgelassen. Auf R04 bestehen beide Fälle. Der bisherige Kanten- und Helligkeitsvergleich kennt den Unterschied zwischen Dekoration und neuem Bauteil nicht zuverlässig. Der Rückhaltebestand bestätigt das Problem an einem weiteren Raum (R07), der nicht zum Ableiten der bisherigen Regeln verwendet wurde.

## Entscheidung für diesen Arbeitsstand

Die vereinbarten Kriterien für eine Freigabe möblierter Eingaben sind **nicht erfüllt**. Die spätere lokale Nachbesserung `structure-v4` ergänzt ausschließlich ein enges Signal für ein neu eingefügtes Fensterkreuz im Wandbereich: R06 wird damit verworfen, ohne die separat geprüfte Wanddekoration zu sperren. R04 bleibt ein durchgelassenes kleines Fenster; die kombinierten erlaubten Umgestaltungen bleiben überwiegend Fehlablehnungen. Die automatische Sperre, menschliche Prüfung und Kostenregeln bleiben unverändert. Ein realistisches Vorher-Nachher-Paar mit unveränderter Architektur ist weiterhin nötig, bevor eine Freigabe möblierter Eingaben behauptet werden kann. Der private Bildversuch vom 18. Oktober ist kein dauerhaft verfügbares Testpaar: Testfotos und Ergebnisse werden nach höchstens 24 Stunden gelöscht; Bildschirmansichten ersetzen keinen Pixelvergleich.

Für einen folgenden Produktabschnitt kommen eine eigenständige Erkennung fester Bauteile oder eine ausdrücklich freigegebene menschliche Prüfung unsicherer Kandidaten vor deren Anzeige in Betracht. Beide Wege ändern Umfang und Sicherheitsablauf und benötigen einen eigenen Plan und Nutzerentscheidung. Ein bloßes Verschieben der fünf numerischen Grenzwerte ist durch diese Daten widerlegt.

## Wiederholen und Betriebsstand

- `pnpm test:structure` prüft die synthetischen Fälle ohne Webserver.
- `pnpm test:room-fidelity-calibration` prüft R01–R06 mit lokalen, nicht versionierten Bildern.
- `pnpm test:room-fidelity-holdout` prüft R07 und R08 getrennt. Wenn diese Dateien fehlen, werden die betreffenden Tests ausdrücklich übersprungen; ein grünes CI-Ergebnis allein beweist ihre Ausführung nicht.
- Alle drei Befehle starten keinen Anbieter und keine Datenbankanfrage. Desktop und Mobil führen denselben serverseitigen Bildvergleich als Regressionslauf aus.

Die rein lesende Testbuchhaltung meldete am 20. Oktober weiterhin 18 Cent tatsächliche Kosten, 210 Cent Reservierungen, 30 Cent rechnerisch verbleibend und keinen aktiven Versuch. Der verworfene Versuch vom 18. Oktober hat eine Provider-Quittung, aber noch keinen zugeordneten Billing-Betrag. Diese Zahlen sind keine Freigabe eines neuen Versuchs. Es wurde weder eine BigQuery-Abfrage noch ein Vertex-Aufruf gestartet.
