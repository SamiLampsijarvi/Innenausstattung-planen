import LegalPage from "../legal-page";

export const metadata = { title: "Impressum – Raumly" };

export default function ImpressumPage() {
  return <LegalPage title="Impressum" notice="Nicht zur Veröffentlichung freigegeben: Die gesetzlich erforderlichen Anbieterangaben müssen vor dem Hosting vom Betreiber ergänzt und geprüft werden.">
    <h2>Anbieter</h2><p>[Vollständiger Name oder Unternehmensname]</p>
    <h2>Anschrift</h2><p>[Vollständige ladungsfähige Anschrift]</p>
    <h2>Kontakt</h2><p>E-Mail: [Kontaktadresse]<br />Telefon: [falls erforderlich]</p>
    <h2>Weitere Angaben</h2><p>[Rechtsform, Vertretungsberechtigte, Register- und Umsatzsteuerangaben ergänzen, soweit zutreffend.]</p>
  </LegalPage>;
}
