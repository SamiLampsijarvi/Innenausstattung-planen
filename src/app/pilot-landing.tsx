import Link from "next/link";

const steps = [
  ["Raum erfassen", "Ein leerer Wohnraum, seine Maße und das verfügbare Budget bilden die Planungsgrundlage."],
  ["Stil festlegen", "Der gewünschte Einrichtungsstil grenzt Farben, Materialien und passende Produktarten ein."],
  ["Konzept erhalten", "Raumly soll passende, tatsächlich kaufbare Möbel auswählen und transparent zum Händler verlinken."],
];

export default function PilotLanding() {
  return (
    <div className="pilot-shell">
      <header className="pilot-header">
        <Link className="pilot-brand" href="/" aria-label="Raumly Startseite"><span>R</span> Raumly</Link>
        <nav aria-label="Seitennavigation">
          <a href="#ablauf">So funktioniert es</a>
          <a href="#status">Projektstatus</a>
        </nav>
      </header>

      <main className="pilot-main">
        <section className="pilot-hero" aria-labelledby="pilot-title">
          <div>
            <small>RAUMLY · PRODUKT IN ENTWICKLUNG</small>
            <h1 id="pilot-title">Einrichtung, die zu Ihrem Raum, Stil und Budget passt.</h1>
            <p>Raumly entwickelt einen digitalen Planungsservice für ganze Wohnungen und Häuser einschließlich Garten. Die erste Entwicklungsstufe beginnt kontrolliert mit leeren Wohnzimmern und soll verständliche Konzepte mit maßlich passenden, später direkt kaufbaren Produkten liefern.</p>
            <a className="pilot-primary-link" href="#ablauf">Konzept kennenlernen</a>
          </div>
          <div className="pilot-room" role="img" aria-label="Schematisches Einrichtungskonzept mit Sofa, Tisch, Teppich, Leuchte und Pflanze">
            <span className="pilot-rug">Teppich</span>
            <span className="pilot-sofa">Sofa</span>
            <span className="pilot-table">Couchtisch</span>
            <span className="pilot-lamp">Leuchte</span>
            <span className="pilot-plant">Pflanze</span>
          </div>
        </section>

        <section className="pilot-section" id="ablauf" aria-labelledby="steps-title">
          <small>DER GEPLANTE ABLAUF</small>
          <h2 id="steps-title">Von einem leeren Raum zum stimmigen Konzept</h2>
          <div className="pilot-steps">
            {steps.map(([title, description], index) => (
              <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </section>

        <section className="pilot-status" id="status" aria-labelledby="status-title">
          <div>
            <small>TRANSPARENTER PROJEKTSTATUS</small>
            <h2 id="status-title">Sicher vorbereitet, noch nicht öffentlich nutzbar</h2>
          </div>
          <p>Raumly befindet sich in einer kontrollierten Entwicklungsphase. Auf dieser Pilotseite gibt es keinen Foto-Upload, keine aktive Bild-KI, keine echten Händlerangebote und keine Kaufmöglichkeit. Produktlinks werden später als Affiliate-Links gekennzeichnet.</p>
        </section>
      </main>

      <footer className="pilot-footer">
        <div><strong>Raumly</strong><span>Digitale Einrichtungsplanung · Vorabversion</span></div>
        <nav aria-label="Rechtliche Hinweise"><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/affiliate-hinweis">Affiliate-Hinweis</Link></nav>
      </footer>
    </div>
  );
}
