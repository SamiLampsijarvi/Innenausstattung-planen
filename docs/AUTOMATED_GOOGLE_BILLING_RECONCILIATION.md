# Automatischer Google-Billing-Abgleich (lokal, ausgeschaltet)

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
- Der Zugang nutzt ein kurzlebiges Application-Default-Token von `gcloud`.
  Dauerhafte Dienstkontoschlüssel sind ausgeschlossen.

## Noch nicht aktiviert

Vor der Aktivierung sind eine erneute Betreiberfreigabe und diese Google-
Schritte nötig, da sie Kosten oder zusätzliche Leserechte verursachen können:

1. Standardisierten Cloud-Billing-Export in ein BigQuery-Dataset einrichten.
2. Ein separates, ausschließlich lesendes Konto nur für Dataset und
   BigQuery-Abfragen berechtigen; keine Vertex- oder Billing-Adminrolle.
3. Eine konservative BigQuery-Bytegrenze festlegen und die monatlichen
   BigQuery-Kosten prüfen.
4. Die Exporttabelle, Region, Projektkennung und Grenze ausschließlich in
   `.env.local` hinterlegen. Keine Zugangsdaten oder Abrechnungskennungen nach
   Git einchecken.
5. Erst nach einem sichtbaren, eindeutig zuordenbaren Exporteintrag die
   wiederkehrende lokale Prüfung mit `--apply` aktivieren.

Google exportiert Billing-Daten zeitversetzt. Der automatische Abgleich ist
deshalb kein Echtzeitbeleg und ersetzt weder das Projekt-Spend-Cap noch die
3-Euro-Grenze in Raumly. Der gegenwärtig ungeklärte Altbestand wird nicht von
dieser Automatisierung übernommen und bleibt bis zu einer eindeutigen
manuellen Klärung gesperrt.
