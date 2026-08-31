# Kontrollierter Vergleich der Bild-KI-Anbieter

## Zweck

Vor einer endgültigen Anbieterwahl werden Google Vertex AI und OpenAI mit denselben freigegebenen Testfällen verglichen. Dieser Vergleich aktiviert noch keine Bild-KI im normalen Raumly-Ablauf und verursacht ohne eine spätere ausdrückliche Freigabe keine API-Kosten.

## Sicherheitsgrenzen

- Ausschließlich Testfotos verwenden, für deren KI-Verarbeitung eine nachweisbare Erlaubnis vorliegt. Für den ersten Vergleich werden bevorzugt unpersönliche Referenzbilder verwendet.
- Keine API-Schlüssel im Browser, Quellcode, Git oder Testbericht speichern. Spätere Schlüssel liegen ausschließlich serverseitig in einem Secret-Manager.
- Die externe Generierung bleibt standardmäßig technisch ausgeschaltet.
- Jeder Auftrag benötigt eine eigene KI-Einwilligung, einen ausdrücklich freigegebenen Anbieter und ein Kostenlimit.
- Für den separaten Phase-7-Test gelten höchstens zwei bewusst einzeln gestartete Versuche je Foto und zwei Minuten je Versuch. Automatische Wiederholungen und ein dritter Versuch sind ausgeschlossen. Die ältere allgemeine Produktregel gilt nicht für diesen Test.
- Vor echten Nutzern sind Auftragsverarbeitung, Verarbeitungsregion, Speicherfristen, Löschung und Datenschutzhinweise juristisch zu prüfen.

## Vergleichsbestand

Der spätere aussagekräftige Vergleich sieht 20 bis 30 Wohnzimmerbilder mit unterschiedlichen Lichtverhältnissen, Perspektiven, Raumgrößen und Einrichtungsdichten vor; er ist noch nicht freigegeben. Beide Anbieter sollen je Bild dieselbe Stil- und Budgetvorgabe erhalten. Anbietername und Reihenfolge werden bei der menschlichen Bewertung verborgen. Phase 7 bereitet ausschließlich einen begrenzten Vertex-Test mit maximal fünf Fotos vor und liefert keine endgültige Anbieterentscheidung.

## Bewertung je Ergebnis

Jedes Kriterium wird von 1 (unbrauchbar) bis 5 (sehr gut) bewertet:

1. **Raumtreue:** Fenster, Türen, Wände, Boden und Perspektive bleiben plausibel.
2. **Stiltreue:** Der ausgewählte Designstil ist klar und stimmig umgesetzt.
3. **Bildrealismus:** Möbel, Licht, Schatten und Proportionen wirken glaubwürdig.
4. **Nutzbarkeit:** Das Ergebnis eignet sich tatsächlich als Inspiration für den Nutzer.
5. **Fehlerfreiheit:** Keine auffälligen Doppelungen, schwebenden Möbel oder verzerrten Flächen.

Zusätzlich werden Laufzeit, Fehlversuche, Sicherheitsblockaden und tatsächliche Kosten je **brauchbarem** Ergebnis erfasst. Ein Ergebnis gilt nur dann als brauchbar, wenn Raumtreue und Nutzbarkeit jeweils mindestens 3 Punkte erreichen.

## Entscheidungskriterium

Ein Anbieter wird erst empfohlen, wenn er:

- mindestens 80 Prozent brauchbare Ergebnisse erreicht,
- keinen ungeklärten Datenschutz- oder Vertragsmangel besitzt,
- innerhalb des zuvor freigegebenen Monats- und Auftragslimits bleibt,
- und im gewichteten Gesamtergebnis nicht schlechter als die Alternative ist.

Raumtreue und Nutzbarkeit zählen jeweils doppelt. Bei nahezu gleicher Qualität gewinnt der Anbieter mit den besseren Datenschutzbedingungen und den niedrigeren Kosten je brauchbarem Ergebnis. Die Entscheidung wird anschließend in `DECISIONS.md` dokumentiert.

## Noch nicht freigegeben

- Anbieter-Konto oder Abrechnung einrichten
- API-Schlüssel hinterlegen
- Fotos an Google, OpenAI oder einen anderen KI-Anbieter übertragen
- Bild-KI im normalen Nutzerablauf aktivieren
- Veröffentlichung für echte Nutzer

## Freigegebene Vertex-Testvorbereitung

- Das offizielle Google Gen AI SDK ist serverseitig und auf Version 2 festgelegt.
- Der Vertex-Adapter verwendet `gemini-3.1-flash-image`, 1K-Ausgabe und Application Default Credentials; ein API-Schlüssel wird weder im Browser noch im Repository vorgesehen.
- Die externe Ausführung bleibt über `RAUMLY_IMAGE_AI_ENABLED=false` ausgeschaltet.
- Die dauerhafte Testbuchhaltung begrenzt die einmalige Kampagne auf fünf Fotos, zwei Versuche je Foto und nach der ergänzenden Bestätigung insgesamt 300 Cent reserviertes Budget. Die Differenz zum gewünschten 5-Euro-Gesamtbudget ist keine garantierte Absicherung gegen Google-Abrechnungsabweichungen.
- Die endgültigen tatsächlichen Kosten werden später mit Google Cloud Billing abgeglichen, weil Vertex sie nicht unmittelbar in der Bildantwort meldet.
- Jede Reservierung schaltet die Kampagne wieder aus. Der nächste Versuch verlangt einen dokumentierten späteren Abrechnungsabgleich und erneute Freigabe.
- Technische Umsetzung, Sicherheitsnachweise, Grenzen und die späteren Google-Schritte: `docs/PHASE_7_CONTROLLED_VERTEX_TEST.md`.

