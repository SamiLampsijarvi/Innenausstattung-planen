import LegalPage from "../legal-page";

export const metadata = { title: "Datenschutz – Raumly" };

export default function DatenschutzPage() {
  return <LegalPage title="Datenschutzhinweise" notice="Entwurf für den lokalen Pilotstand: Verantwortliche Stelle, Hostinganbieter und tatsächliche Datenflüsse müssen vor der Veröffentlichung ergänzt und fachlich geprüft werden.">
    <h2>Verantwortliche Stelle</h2><p>[Name und Kontaktanschrift des Verantwortlichen]</p>
    <h2>Pilotseite</h2><p>Die geplante Pilotseite verwendet keine Analyse- oder Werbewerkzeuge, kein Kontaktformular und keine extern eingebetteten Medien. Der Hostinganbieter kann technisch erforderliche Verbindungsdaten wie IP-Adresse, Zeitpunkt und angeforderte Seite verarbeiten.</p>
    <h2>Speicherdauer und Rechtsgrundlage</h2><p>[Nach Auswahl des Hostings anhand der tatsächlichen Verarbeitung und des anwendbaren Rechts ergänzen.]</p>
    <h2>Rechte betroffener Personen</h2><p>[Auskunfts-, Berichtigungs-, Löschungs-, Einschränkungs-, Widerspruchs- und Beschwerdeinformationen fachlich prüfen und ergänzen.]</p>
  </LegalPage>;
}
