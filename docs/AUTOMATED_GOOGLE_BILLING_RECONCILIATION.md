# Automatischer Google-Billing-Abgleich (lokal, kontrolliert aktiviert)

## Zweck

`pnpm reconcile:billing-export --apply` kann einen einzelnen, eindeutig
zuordenbaren lokalen Vertex-Test mit dem standardisierten Cloud-Billing-Export
in BigQuery abgleichen. Der Befehl startet niemals Vertex und kann keine neue
Kostenreservierung, keinen neuen Bildversuch und keine Änderung des 3-Euro-
Gesamtlimits auslösen.

Ohne `RAUMLY_BILLING_EXPORT_ENABLED=true` beendet sich der Befehl vor jedem
Google- oder Supabase-Netzwerkzugriff. Auch ohne `--apply` bleibt er ein
wirkungsfreier Trockenlauf.

## Sicherheitsregeln

- Nur die Cloud-Billing-Zeilen des konfigurierten Testprojekts und des
  ausdrücklich konfigurierten Dienstes werden gelesen.
- Der BigQuery-Auftrag erhält eine verpflichtende Byte-Obergrenze. Bei einer
  Überschreitung bricht Google die Abfrage ab; Raumly speichert dann nichts.
- Es wird nur in EUR und nur bis zur bereits reservierten Grenze abgerechnet:
  30 Cent für einen einzelnen abgeschlossenen Versuch, 60 Cent für einen
  ausdrücklich markierten Zweier-Batch.
- Ein unbekannter, aktiver oder mehrdeutiger Versuch wird nie automatisch
  entsperrt. Fehlende oder noch nicht exportierte Billing-Zeilen führen zu
  keiner Datenbankänderung.
- Foto-, Bild- und Providerantwortdaten werden weder abgefragt noch geloggt.
- Der Zugang nutzt ein kurzlebiges Token der lokalen `gcloud`-Anmeldung und
  impersoniert ausschließlich das lesende Billing-Konto. Dauerhafte
  Dienstkontoschlüssel sind ausgeschlossen.

## Aktivierungsstand

Vor der Aktivierung waren eine Betreiberfreigabe und diese Google-Schritte
nötig, da sie Kosten oder zusätzliche Leserechte verursachen können:

1. Standardisierten Cloud-Billing-Export in ein BigQuery-Dataset einrichten.
2. Ein separates, ausschließlich lesendes Konto nur für Dataset und
   BigQuery-Abfragen berechtigen; keine Vertex- oder Billing-Adminrolle.
3. Eine konservative BigQuery-Bytegrenze festlegen und die monatlichen
   BigQuery-Kosten prüfen.
4. Die Exporttabelle, Region, Projektkennung, Grenze und bei Bedarf den lokalen
   `gcloud`-Pfad ausschließlich in `.env.local` hinterlegen. Keine
   Zugangsdaten oder Abrechnungskennungen nach Git einchecken.
5. Erst nach einem sichtbaren, eindeutig zuordenbaren Exporteintrag die
   wiederkehrende lokale Prüfung mit `--apply` aktivieren.

Diese Voraussetzungen sind am 7. Oktober 2026 erfüllt: Die tägliche
Exporttabelle ist vorhanden, der Dienstname `Vertex AI` wurde aus einer
Leseabfrage ermittelt und der Abgleich ist mit einer Obergrenze von 10 MiB
aktiviert. Ein fehlender oder mehrdeutiger Betrag führt weiterhin zu keiner
Änderung.

Der Dienstname wird nicht geschätzt: Erst der sichtbare Exportposten bestimmt
`RAUMLY_BILLING_EXPORT_SERVICE_DESCRIPTION`. Für die lokale Prüfung wird das
Lesekonto über kurzlebige Dienstkonto-Impersonation aus der lokalen
Betreiberanmeldung verwendet. Es besitzt keinen herunterladbaren Schlüssel und
keinen Vertex-Zugang.

Google exportiert Billing-Daten zeitversetzt. Der automatische Abgleich ist
deshalb kein Echtzeitbeleg und ersetzt weder das Projekt-Spend-Cap noch die
3-Euro-Grenze in Raumly.

## Geprüfter Betriebsstand am 7. Oktober 2026

Die rein lesende Statusprüfung meldete keinen aktiven Versuch und keine offene
Billing-Zeile. Die Testbuchhaltung weist 18 Cent tatsächliche Kosten, 180 Cent
Reservierungen und 60 Cent verbleibenden Rahmen aus. `billingCheckedAt` steht
auf dem 16. September 2026; bei einem täglichen Lauf ohne offenen Versuch
bleibt dieser Wert unverändert, weil nichts gebucht oder freigegeben wird.

Vertex bleibt ausgeschaltet. Der Abgleich selbst kann Vertex nicht starten,
keine Reservierung anlegen und die Grenze von 30 Cent pro Versuch oder 3 Euro
insgesamt nicht verändern.
