import LegalPage from "../legal-page";

export const metadata = { title: "Affiliate-Hinweis – Raumly" };

export default function AffiliatePage() {
  return <LegalPage title="Hinweis zu Affiliate-Links">
    <p>Raumly enthält im aktuellen Pilotstand keine aktiven Händler- oder Affiliate-Links.</p>
    <p>Später können eindeutig gekennzeichnete Links zu Händlerangeboten eingesetzt werden. Kommt darüber ein Kauf zustande, kann Raumly eine Provision erhalten. Der Preis für Nutzerinnen und Nutzer soll sich dadurch nicht erhöhen.</p>
    <p>Eine Provision darf die Auswahl oder Darstellung eines Angebots nicht verdecken. Preise, Versand und Verfügbarkeit müssen vor einem Kauf erneut beim jeweiligen Händler geprüft werden.</p>
  </LegalPage>;
}
