# Product Requirements Document (PRD)

## Dokumentstatus

- **Produkt:** Raumly (vorläufiger Arbeitsname)
- **Status:** Vom Nutzer bestätigt
- **Erster Markt:** Deutschland
- **Erster MVP-Raum:** Wohnzimmer
- **Langfristiges Ziel:** Planung aller Räume eines Zuhauses

## 1. Produktziel

Raumly ist eine KI-gestützte Einrichtungsplattform. Nutzer laden Fotos eines Raumes hoch, wählen einen Designstil, kennzeichnen vorhandene Möbel und geben ein Budget an. Raumly erstellt realistische Einrichtungsvorschläge, Farbpaletten und Einkaufslisten mit passenden Möbeln.

Langfristig können Nutzer mehrere Wohnungen oder Häuser als Projekte verwalten und alle Räume eines Zuhauses stilistisch, farblich und finanziell aufeinander abstimmen. Der erste MVP beginnt bewusst mit dem Wohnzimmer.

## 2. Zielgruppe und Markt

- deutschsprachige Mieter und Wohnungseigentümer
- Menschen, die Räume innerhalb eines festen Budgets neu einrichten möchten
- Deutschland als erster Einkaufsmarkt

## 3. Kernablauf

1. Raum und Designstil wählen.
2. Postleitzahl des zu planenden Zuhauses angeben.
3. Ein oder mehrere Fotos aus verschiedenen Blickwinkeln hochladen.
4. Der Verarbeitung der Fotos durch den KI-Dienst ausdrücklich zustimmen.
5. Vorhandene Möbel automatisch erkennen lassen.
6. Erkennung korrigieren und Möbel als „behalten“, „ersetzen“ oder „ergänzen“ kennzeichnen.
7. Freie Hinweise ergänzen, zum Beispiel „keine schwarzen Möbel“.
8. Budget festlegen.
9. Einrichtungsentwurf erstellen lassen.
10. Zimmerbild, Farbpalette und später Einkaufsliste mit Händlerlinks ansehen.

## 4. Nutzung ohne Konto

- Ein Nutzer kann einmal ohne Anmeldung einen erfolgreich angezeigten Entwurf erstellen.
- Die verbrauchte Gastnutzung wird über eine einfache Markierung im verwendeten Browser erkannt.
- Diese Erkennung darf im MVP durch gelöschte Browserdaten, privaten Modus oder einen anderen Browser umgangen werden. Eine strengere Geräteerkennung ist aus Datenschutzgründen nicht vorgesehen.
- Gastdaten bleiben während der Browsersitzung erhalten.
- Beim erkannten Schließen des gesamten Browsers werden Gastdaten gelöscht.
- Falls das Schließen technisch nicht erkannt wird, werden Gastdaten spätestens 24 Stunden nach der letzten Nutzung gelöscht.
- Registriert sich ein Gast während der Planung, wird das aktuelle Gastprojekt in das neue Konto übernommen.

## 5. Benutzerkonto

Pflichtangaben und Funktionen:

- E-Mail-Adresse
- selbst gewähltes Passwort
- E-Mail-Bestätigung
- Funktion „Passwort vergessen“
- automatisch erzeugte, eindeutige achtstellige Kontonummer zur internen Zuordnung
- wiederholte Anmeldung mit E-Mail-Adresse und Passwort
- Möglichkeit des Browsers oder Passwortmanagers, das Passwort zu speichern

Raumly speichert Passwörter niemals lesbar. Name, Geburtsdatum, Telefonnummer und vollständige Wohnadresse sind im MVP ausgeschlossen.

Eine Postleitzahl kann freiwillig im Konto gespeichert werden. Sie wird nur nach einem bewussten Klick auf „Gespeicherte Postleitzahl verwenden“ in ein Zuhause-Projekt übernommen und bleibt dort änderbar.

## 6. Projekte und Räume

- Registrierte Nutzer können mehrere Wohnungen oder Häuser unter „Meine Projekte“ speichern.
- Projekte und Räume können eigene Namen erhalten.
- Projekte können später geöffnet und weiterbearbeitet werden.
- Jedes Zuhause besitzt eine eigene Postleitzahl.
- Der erste MVP unterstützt Wohnzimmer; weitere Raumtypen folgen später.
- Mehrere Räume eines Zuhauses sollen später automatisch in Stil und Farben abgestimmt werden.

## 7. Fotos und Möbelerkennung

- Pro Raum dürfen mehrere Originalfotos aus unterschiedlichen Blickwinkeln hochgeladen werden.
- Die KI erkennt zentrale Möbel zuverlässig.
- Nutzer können Erkennungsfehler korrigieren.
- Kleine Erkennungsfehler sind zulässig, wenn sie leicht korrigierbar sind.
- Nutzer entscheiden je Möbelstück: behalten, ersetzen oder ergänzen.
- Registrierte Nutzer können Originalfotos bis zur eigenen Löschung speichern.
- Vor dem Upload wird empfohlen, Menschen, Dokumente, Adressen und andere private Inhalte nicht mitzufotografieren.
- Raummaße werden im ersten MVP nicht abgefragt.
- Deshalb muss deutlich darauf hingewiesen werden, Möbelmaße und räumliche Passform vor einem Kauf selbst zu prüfen.

## 8. Entwürfe

- Ein Gast erhält einen Entwurf.
- Ein registrierter Nutzer kann bis zu drei Entwürfe pro Raum speichern.
- Jeder gespeicherte Entwurf zählt zu dieser Grenze.
- Vor einem vierten Entwurf muss ein vorhandener Entwurf gelöscht werden.
- Entwürfe können verglichen und einzeln gelöscht werden.
- Ändert der Nutzer Stil oder Budget, bleiben alte Entwürfe erhalten.
- Entwürfe müssen sich sichtbar unterscheiden und dem gewählten Designstil treu bleiben.
- Jeder Entwurf wird klar als KI-Visualisierung gekennzeichnet.
- Grobe Bildfehler können gemeldet werden.

## 9. Budget

Das Budget ist eine harte Grenze und darf nicht überschritten werden.

- **Preisansicht A:** Summe der Möbelpreise
- **Preisansicht B:** Summe aus Möbelpreisen und Lieferkosten
- Ein Zuhause kann ein gemeinsames Gesamtbudget besitzen.
- Jeder Raum kann zusätzlich ein vom Nutzer festgelegtes Teilbudget besitzen.
- Der Nutzer verteilt das Gesamtbudget selbst auf die Räume.
- Produkte außerhalb des zutreffenden Budgets werden nicht empfohlen.

## 10. Ergebnisse

Jeder vollständige Entwurf enthält:

- realistisches neues Zimmerbild
- Farbpalette und Farbvorschläge
- später eine Einkaufsliste
- später direkte Händlerlinks

## 11. Produkt- und Händleranforderungen

Konkrete Händler und Datenquellen werden später ausgewählt. Der MVP darf mit einer begrenzten Händlerauswahl starten. Langfristig sollen geeignete Händler in ganz Deutschland berücksichtigt werden.

Benötigte Produktdaten:

- Produktname, Kategorie und Bild
- Farbe, Material, Stil und Maße
- Händler und direkter Produktlink
- Möbelpreis, Lieferkosten und Gesamtpreis
- Verfügbarkeit und Liefergebiet
- Zeitpunkt der letzten Prüfung
- verfügbare Alternative, sofern vorhanden

Regeln:

- Preis- und Verfügbarkeitsdaten dürfen höchstens 24 Stunden alt sein.
- Geschätzte Lieferkosten werden deutlich gekennzeichnet.
- Lieferkosten können von Postleitzahl, Warenkorb, Lieferart und Händlerbedingungen abhängen.
- Produkte ohne bekannte Maße werden nicht empfohlen.
- Nicht verfügbare Produkte dürfen als Inspiration erscheinen und bleiben beim Händler aufrufbar.
- Wenn möglich, wird mindestens eine verfügbare Alternative gezeigt.
- Ersatzprodukte sollen insbesondere in Aussehen, Farbe und Preis ähnlich sein.
- Bezahlte oder provisionsfähige Angebote werden deutlich gekennzeichnet.
- Nutzer werden darauf hingewiesen, Preis und Verfügbarkeit beim Händler erneut zu prüfen.

Nach Anwendung der harten Budgetgrenze werden Produkte sortiert nach:

1. Verfügbarkeit
2. Übereinstimmung mit dem Designstil
3. passendem Aussehen und passender Farbe
4. Gesamtpreis

## 12. Speicherung und Löschung

- Originalfotos und Entwürfe können unabhängig voneinander gelöscht werden.
- Wird ein Originalfoto gelöscht, dürfen daraus erzeugte Entwürfe erhalten bleiben.
- Beim Löschen eines Raumes werden dessen Fotos, Möbelangaben und Entwürfe gelöscht.
- Beim Löschen eines Projekts wird nur dieses Projekt mit seinen Räumen gelöscht.
- Gelöschte Projekte können 30 Tage aus einem Papierkorb wiederhergestellt werden.
- Vor endgültiger Löschung wird deutlich nachgefragt.
- Eine Kontolöschung kann 14 Tage rückgängig gemacht werden.
- Danach werden Konto und zugehörige Daten endgültig gelöscht.
- Daten in technischen Sicherheitskopien werden spätestens nach 30 Tagen entfernt.
- Zeitpunkt von Einwilligung und Widerruf zur Foto- und KI-Verarbeitung wird gespeichert.
- Projekte bleiben im MVP ausschließlich privat.
- Eine automatische Download-Funktion für persönliche Daten ist im MVP nicht vorgesehen. Gesetzliche Datenauskunft muss zunächst manuell ermöglicht werden.

## 13. Fehler- und Kostenregeln

- Ein KI-Versuch darf höchstens zwei Minuten ohne Ergebnis laufen.
- Nach dem ersten Fehlschlag startet ein zweiter Versuch automatisch.
- Scheitert auch dieser, kann der Nutzer einen dritten und letzten Versuch bewusst starten.
- Nach dem dritten Fehlschlag erscheint eine endgültige, verständliche Fehlermeldung.
- Jeder Versuch zählt zum Kostenlimit.
- Für die erste Entwicklungs- und Testphase gilt ein hartes KI-Kostenlimit von 20 Euro pro Monat.
- Nach Erreichen des Limits werden keine weiteren KI-Aufträge gestartet. Eine Erhöhung benötigt die Zustimmung des Nutzers.
- Bei Ausfall externer Dienste werden Aufträge sicher angehalten und keine unvollständigen Ergebnisse erzeugt.

## 14. Erfolgskriterien

Gemessen werden später:

- abgeschlossene Planungsabläufe
- Kontoerstellungen
- erzeugte Entwürfe
- Klicks auf Händlerlinks
- nachweisbare Käufe, sofern technisch möglich
- Zahlungsbereitschaft für mögliche spätere Angebote

## 15. Bewusste MVP-Grenzen

- zunächst nur Wohnzimmer
- keine Raummaße
- zunächst kostenlos
- konkrete Händleranbindung später
- Kaufmessung und Provisionsmodell später
- keine Projektfreigabe an andere Personen
- keine automatische Datendownload-Funktion
- keine Veröffentlichung ohne gesonderte Zustimmung

## 16. Bewusst offene Entscheidungen

- endgültiger Markenname und visuelle Identität
- konkrete Händler und Produktdatenquellen
- technische Kaufmessung
- späteres Geschäfts- und Provisionsmodell
- Veröffentlichungsort und Zeitpunkt
- weitere Raumtypen und deren Reihenfolge
- spätere Anzahl von Testpersonen vor einer Veröffentlichung

