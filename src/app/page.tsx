const futureRooms = [
  "Schlafzimmer Design", "Küche Design", "Badezimmer Design", "Eingang Design",
  "Kinderzimmer Design", "Garten", "Homeoffice", "Gaming Room", "Garage",
];

const futureProducts = [
  "Sofas & Teppiche", "Betten & Matratzen", "Tische & Stühle",
  "Regale & Hängemöbel", "Outdoor-Produkte",
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
        <p className="eyebrow">TECHNISCHE GRUNDLAGE</p>
        <h1>Raumly</h1>
        <p>Der Wohnzimmer-Planer wird im nächsten kleinen Schritt übertragen.</p>
        <div id="planer" aria-hidden="true" />
      </main>
    </>
  );
}
