"use client";

import { ChangeEvent, useMemo, useState } from "react";

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

const designStyles = [
  ["Modern", "Klare Linien, ruhige Farben und funktionale Möbel"],
  ["Skandinavisch", "Hell, natürlich, gemütlich und unkompliziert"],
  ["Japandi", "Japanische Ruhe trifft skandinavische Wärme"],
  ["Industrial", "Rohes Holz, Metall und markante Kontraste"],
  ["Boho", "Lebendig, persönlich, textil und pflanzenreich"],
  ["Mid-Century", "Organische Formen und Design der 1950er–60er"],
  ["1990er Revival", "Warme Hölzer, Glas, Chrom und mutige Akzente"],
  ["Landhaus", "Zeitlos, wohnlich und von der Natur inspiriert"],
  ["Neubau minimalistisch", "Raumoptimiert, hochwertig und reduziert"],
];

type RoomImage = { file: File; previewUrl: string };

function Soon() {
  return <small>Bald verfügbar</small>;
}

export default function Home() {
  const [style, setStyle] = useState("");
  const [images, setImages] = useState<RoomImage[]>([]);
  const [postcode, setPostcode] = useState("");
  const [budget, setBudget] = useState(1500);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const postcodeIsValid = /^\d{5}$/.test(postcode);
  const briefingIsComplete = Boolean(style && images.length && postcodeIsValid);
  const budgetLabel = useMemo(() => budget.toLocaleString("de-DE"), [budget]);

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setError("");

    if (selectedFiles.length > 5) {
      setError("Bitte wähle höchstens fünf Fotos aus.");
      event.target.value = "";
      return;
    }

    const invalidFile = selectedFiles.find((file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (invalidFile) {
      setError(`${invalidFile.name} ist kein unterstütztes Bildformat.`);
      event.target.value = "";
      return;
    }

    const tooLarge = selectedFiles.find((file) => file.size > 10 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} ist größer als 10 MB.`);
      event.target.value = "";
      return;
    }

    images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setImages(selectedFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    setShowSummary(false);
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((image, imageIndex) => {
      if (imageIndex === index) URL.revokeObjectURL(image.previewUrl);
      return imageIndex !== index;
    }));
    setShowSummary(false);
  }

  function createSummary() {
    if (!briefingIsComplete) {
      setError("Bitte wähle einen Stil, lade mindestens ein Foto hoch und gib eine gültige Postleitzahl ein.");
      return;
    }
    setError("");
    setShowSummary(true);
  }

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
          <div className="planning-workspace">
          <div className="planning-controls-column">
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
            <li className="planning-step-detailed">
              <div className="step-heading"><span>2</span><strong>Designstil wählen</strong></div>
              <div className="style-options" aria-label="Designstil wählen">
                {designStyles.map(([name, description]) => (
                  <button
                    className={style === name ? "selected" : ""}
                    key={name}
                    type="button"
                    aria-pressed={style === name}
                    onClick={() => { setStyle(name); setShowSummary(false); }}
                  >
                    <strong>{name}</strong><small>{description}</small>
                  </button>
                ))}
              </div>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>3</span><strong>Bilder Ihres Wohnzimmers hochladen</strong></div>
              <label className="upload-zone" htmlFor="room-images">
                <span aria-hidden="true">↑</span>
                <strong>Fotos auswählen</strong>
                <small>1–5 Bilder · JPG, PNG oder WEBP · maximal 10 MB pro Bild</small>
                <input id="room-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} />
              </label>
              <div className="image-previews" aria-live="polite">
                {images.map(({ file, previewUrl }, index) => (
                  <figure key={`${file.name}-${file.lastModified}`}>
                    {/* A local object URL is required for an immediate, non-uploaded preview. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Vorschau: ${file.name}`} />
                    <button type="button" onClick={() => removeImage(index)} aria-label={`${file.name} entfernen`}>×</button>
                  </figure>
                ))}
              </div>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>4</span><strong>Postleitzahl und Budget festlegen</strong></div>
              <div className="planning-fields">
                <label htmlFor="postcode">Postleitzahl des Zuhauses</label>
                <input
                  id="postcode"
                  value={postcode}
                  onChange={(event) => {
                    setPostcode(event.target.value.replace(/\D/g, "").slice(0, 5));
                    setShowSummary(false);
                  }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="z. B. 10115"
                  aria-describedby="postcode-help"
                />
                <small id="postcode-help">Für spätere regionale Empfehlungen in Deutschland. Eine vollständige Adresse ist nicht erforderlich.</small>
                <label htmlFor="budget">Budget: <strong>{budgetLabel} €</strong></label>
                <input
                  id="budget"
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={budget}
                  onChange={(event) => { setBudget(Number(event.target.value)); setShowSummary(false); }}
                />
                <div className="range-labels"><span>100 €</span><span>10.000 €</span></div>
              </div>
            </li>
          </ol>
          <div className="generate-panel">
            <button type="button" disabled={!briefingIsComplete} onClick={createSummary}>Planung zusammenfassen</button>
            <small>{briefingIsComplete ? "Alle Angaben sind vollständig." : "Wählen Sie einen Stil, mindestens ein Foto und eine gültige Postleitzahl."}</small>
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          </div>
          <aside className="design-results" aria-labelledby="design-results-title">
            {showSummary ? (
              <div className="briefing-summary" aria-live="polite">
                <small className="summary-kicker">PLANUNGSBRIEFING BEREIT</small>
                <h2 id="design-results-title">Ihre Zusammenfassung</h2>
                <dl>
                  <div><dt>Raum</dt><dd>Wohnzimmer</dd></div>
                  <div><dt>Designstil</dt><dd>{style}</dd></div>
                  <div><dt>Fotos</dt><dd>{images.length}</dd></div>
                  <div><dt>Postleitzahl</dt><dd>{postcode}</dd></div>
                  <div><dt>Budget</dt><dd>{budgetLabel} €</dd></div>
                </dl>
                <div className="prototype-note"><strong>Noch keine KI-Ausführung</strong><p>Die Fotos bleiben lokal in diesem Browserfenster. Eine KI-Erstellung und dauerhafte Speicherung sind in dieser Phase nicht aktiv.</p></div>
                <button type="button" onClick={() => setShowSummary(false)}>Angaben bearbeiten</button>
              </div>
            ) : (
              <div>
                <h2 id="design-results-title">Ihre Planung</h2>
                <p>Vervollständigen Sie links die Angaben. Danach erscheint hier Ihr lokales Planungsbriefing.</p>
              </div>
            )}
          </aside>
          </div>
        </section>
        <div id="planer" aria-hidden="true" />
      </main>
    </>
  );
}
