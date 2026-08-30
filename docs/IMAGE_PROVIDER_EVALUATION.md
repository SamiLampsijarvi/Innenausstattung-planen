# Kontrollierter Vergleich der Bild-KI-Anbieter

## Zweck

Vor einer endgültigen Anbieterwahl werden Google Vertex AI und OpenAI mit denselben freigegebenen Testfällen verglichen. Dieser Vergleich aktiviert noch keine Bild-KI im normalen Raumly-Ablauf und verursacht ohne eine spätere ausdrückliche Freigabe keine API-Kosten.

## Sicherheitsgrenzen

- Ausschließlich Testfotos verwenden, für deren KI-Verarbeitung eine nachweisbare Erlaubnis vorliegt. Für den ersten Vergleich werden bevorzugt unpersönliche Referenzbilder verwendet.
- Keine API-Schlüssel im Browser, Quellcode, Git oder Testbericht speichern. Spätere Schlüssel liegen ausschließlich serverseitig in einem Secret-Manager.
- Die externe Generierung bleibt standardmäßig technisch ausgeschaltet.
- Jeder Auftrag benötigt eine eigene KI-Einwilligung, einen ausdrücklich freigegebenen Anbieter und ein Kostenlimit.
- Pro Anbieter gelten höchstens zwei automatische Versuche und insgesamt höchstens zwei Minuten je Versuch. Ein dritter Versuch darf nur bewusst gestartet werden.
- Vor echten Nutzern sind Auftragsverarbeitung, Verarbeitungsregion, Speicherfristen, Löschung und Datenschutzhinweise juristisch zu prüfen.

## Vergleichsbestand

Der erste aussagekräftige Vergleich verwendet 20 bis 30 Wohnzimmerbilder mit unterschiedlichen Lichtverhältnissen, Perspektiven, Raumgrößen und Einrichtungsdichten. Beide Anbieter erhalten je Bild dieselbe Stil- und Budgetvorgabe. Anbietername und Reihenfolge werden bei der menschlichen Bewertung verborgen.

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

