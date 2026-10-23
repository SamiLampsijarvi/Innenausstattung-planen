# Kontrollierte Bildtestserie – Vorbereitung

## Produktziel und Grenzen

Raumly soll zum Start sowohl leere als auch bereits eingerichtete Zimmer umgestalten. Möbel, Licht und Dekoration dürfen sich ändern. Fenster, Türen, Wände, Perspektive und Bildausschnitt müssen erhalten bleiben. Ein automatisch abgelehntes Bild darf nicht als reguläres Ergebnis erscheinen. Ein Bildversuch wird niemals automatisch wiederholt.

Die zehn Fälle in [der Vorlage](templates/controlled-image-series.example.json) sind **Beispiele**, keine Freigabe realer Fotos, Budgets oder Bildaufrufe. Vor einer tatsächlichen Serie werden Stil und Einrichtungsbudget je Fall bewusst bestätigt. Die Auswertung verlangt bei zehn Fällen fünf leere und fünf möblierte Eingaben. Nutzerfotos und Bildresultate gehören nur in den geschützten, kurzlebigen Testablauf, nicht in diese JSON-Datei oder Git.

## Ablauf je Fall

1. Vor dem ersten Fall den aktuellen Rechnungsstand und die lokale Supabase-Buchhaltung lesen. Ein Serienrahmen von zehn mal 30 Cent verlangt 300 Cent **freie** Reservierung. Der vorhandene Pool zählt frühere Reservierungen mit. Die rein lesende Prüfung am 23. Oktober 2026 meldete 30 Cent Rest und einen verworfenen Versuch vom 18. Oktober mit Provider-Quittung, aber ohne abgeschlossenen Billing-Abgleich. Diese Vorbereitung ändert weder den Pool noch Google-Grenzen.
2. Für jeden Fall Raumzustand, Stil, Einrichtungsbudget und Einwilligung für **genau einen** Versuch prüfen. Der vorhandene Button startet nach eigenem Klick höchstens einen Anbieteraufruf. Die Datenbank reserviert vorher 30 Cent, verhindert parallele Versuche und verlangt einen Billing-Abgleich zwischen regulären Versuchen.
3. Nach dem Versuch den automatischen Architekturfilter und die menschliche Prüfung dokumentieren. Nur ein automatisch und menschlich akzeptiertes Ergebnis darf als nutzbar gezählt werden. Eine Ablehnung, ein unklarer Ausgang oder fehlender Kostenbeleg stoppt die Serie, bis der Fall geklärt ist. Es gibt keine automatische Wiederholung.
4. Den nächsten Fall erst nach bestätigter Buchhaltung und neuem Klick beginnen. Wegen der verzögerten Google-Abrechnung kann dies länger als einen Tag dauern; diese Vorlage beseitigt die Wartezeit nicht.
5. Nach spätestens zehn Fällen die Gesamtzahl, leere und möblierte Fälle, nutzbare Bilder, Dauer und abgerechnete Kosten vergleichen. Ein guter Einzelversuch oder ein grüner Offline-Test beweist keine garantierte Qualität. Bekannte Fehlentscheidungen von `structure-v4` bleiben offen.

## Lokale, kostenlose Auswertung

Vorlage nach `private-evaluation/controlled-series.json` kopieren und nur dort ausfüllen. `private-evaluation/` ist in `.gitignore`. Der Befehl `pnpm evaluate:series private-evaluation/controlled-series.json` liest nur diese Datei und erzeugt einen Bericht auf der Konsole. Er startet weder Vertex noch BigQuery und schreibt keine Buchhaltung. Er kann **keinen** Bildversuch freigeben; maßgeblich ist immer die serverseitige Supabase-Sperre.

Jeder Eintrag unter `attempts` enthält genau einen `caseId` aus `cases` und die Felder `status` (`passed`, `rejected`, `failed`, `unknown`), `consent` (`true`), `automaticGate` (`passed`, `rejected`, `unavailable`), `humanReview` (`accepted`, `rejected`, `pending`), `displayed` (Boolean), `durationMs` (Zahl oder `null`), `actualCents` (bestätigter Betrag oder `null`) und `scores` (entweder `null` oder drei Werte von 1 bis 5 für `style`, `furniture`, `usefulness`). Unbekannte Kosten bleiben `null`, niemals geschätzte 0 Cent. Namen, Fotos, Dateipfade, Tokens und personenbezogene Angaben sind in diesem Format nicht erlaubt.

Diese Version ist absichtlich nur die kostenlose Planungs- und Auswertungsschicht. Ein zehnfacher Live-Test erfordert zuerst den belegten Abgleich des offenen Falls, danach eine separate Entscheidung zum **lokalen** Gesamtbudget und gegebenenfalls eine kontrollierte Änderung der Datenbankgrenze. Das Google-Kostenlimit und die 30-Cent-Grenze pro Versuch bleiben unverändert. Die bestehende tägliche Billing-Prüfung liest höchstens 10 MiB; sie ist kein Echtzeitbeleg. Ein Pull Request wird nur nach gesonderter Freigabe erstellt.
