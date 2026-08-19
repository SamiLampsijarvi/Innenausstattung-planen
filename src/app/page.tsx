const futureRooms = [
  "Schlafzimmer Design", "Küche Design", "Badezimmer Design", "Eingang Design",
  "Kinderzimmer Design", "Garten", "Homeoffice", "Gaming Room", "Garage",
];

const futureProducts = [
  "Sofas & Teppiche", "Betten & Matratzen", "Tische & Stühle",
  "Regale & Hängemöbel", "Outdoor-Produkte",
];

const futureRoomOptions = [
  "Schlafzimmer", "Küche", "Badezimmer", "Kinderzimmer", "Esszimmer", "Eingang",
  "Garten", "Homeoffice", "Gaming Room", "Ankleidezimmer", "Garage",
];

function Soon() {
  return <small>Bald verfügbar</small>;
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="utility-bar">
          <button className="utility-location" type="button" disabled title="Standortauswahl – bald verfügbar" aria-label="Sprache Deutsch; Standortauswahl bald verfügbar">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18" />
            </svg>
            <strong>DE</strong><span className="utility-divider" /><span className="location-label">Standort</span>
          </button>

          <a className="brand" href="#top" aria-label="Raumly Startseite"><span>R</span> Raumly</a>

          <label className="site-search" title="Produktsuche – bald verfügbar">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
            <input type="search" placeholder="Wonach suchen Sie?" aria-label="Produktsuche – bald verfügbar" disabled />
            <span>Bald verfügbar</span>
          </label>

          <div className="account-actions">
            <button type="button" disabled title="Anmeldung – bald verfügbar"><span aria-hidden="true">♙</span> Anmelden</button>
            <button type="button" disabled title="Favoriten – bald verfügbar" aria-label="Favoriten – bald verfügbar"><span aria-hidden="true">♡</span></button>
          </div>

          <details className="mobile-menu">
            <summary aria-label="Menü öffnen"><span /><span /><span /></summary>
            <nav aria-label="Mobile Navigation">
              <a href="#top">Homepage</a><a href="#planer">Wohnzimmer planen</a>
              <span>Weitere Zimmer <Soon /></span><span>Produkte <Soon /></span>
              <span>Preisgestaltung <Soon /></span><span>Services <Soon /></span>
            </nav>
          </details>
        </div>

        <div className="main-nav-row">
          <nav className="desktop-nav" aria-label="Hauptnavigation">
            <a className="nav-home" href="#top">Homepage</a>
            <details className="nav-dropdown">
              <summary>Zimmer</summary>
              <div className="dropdown-panel room-menu">
                <a href="#planer"><strong>Wohnzimmer Design</strong><small>Jetzt planen</small></a>
                {futureRooms.map((room) => <span key={room}>{room} <Soon /></span>)}
              </div>
            </details>
            <details className="nav-dropdown">
              <summary>Produkte</summary>
              <div className="dropdown-panel product-menu">
                {futureProducts.map((product) => <span key={product}>{product} <Soon /></span>)}
              </div>
            </details>
          </nav>

          <div className="nav-secondary">
            <button type="button" disabled title="Preisgestaltung wird noch festgelegt">Preisgestaltung <small>Bald</small></button>
            <details className="nav-dropdown services-menu">
              <summary>Services</summary>
              <div className="dropdown-panel dropdown-panel-right"><span>Individuelle Designs <Soon /></span></div>
            </details>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="home-intro" aria-labelledby="home-intro-title">
          <h1 id="home-intro-title">
            Gestalten Sie Ihr Zuhause – passend zu Ihrem Raum, Ihrem Stil und Ihrem Budget.
          </h1>
          <ol className="planning-steps" aria-label="So funktioniert Raumly">
            <li className="planning-step-detailed">
              <div className="step-heading"><span>1</span><strong>Wohnzimmer planen</strong></div>
              <ul className="room-options" aria-label="Verfügbare und zukünftige Zimmer">
                <li className="room-option-selected"><strong>Wohnzimmer</strong><small>Ausgewählt</small></li>
                {futureRoomOptions.map((room) => (
                  <li key={room}><strong>{room}</strong><small>Bald verfügbar</small></li>
                ))}
              </ul>
            </li>
            <li><div className="step-heading"><span>2</span><strong>Designstil wählen</strong></div></li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>3</span><strong>Bilder Ihres Wohnzimmers hochladen</strong></div>
              <div className="image-placeholders" aria-label="Zwei zukünftige Plätze für Zimmerbilder">
                <div><span>Bild 1</span><small>Bald verfügbar</small></div>
                <div><span>Bild 2</span><small>Bald verfügbar</small></div>
              </div>
            </li>
            <li><div className="step-heading"><span>4</span><strong>Budget festlegen</strong></div></li>
          </ol>
        </section>
        <div id="planer" aria-hidden="true" />
      </main>
    </>
  );
}
