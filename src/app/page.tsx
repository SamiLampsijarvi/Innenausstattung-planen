"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  createLocalProject,
  readLocalProjects,
  writeLocalProjects,
} from "@/lib/local-projects";
import type { LocalProject } from "@/lib/local-projects";
import FurniturePlanner from "./furniture-planner";
import DraftResults from "./draft-results";

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
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [style, setStyle] = useState("");
  const [images, setImages] = useState<RoomImage[]>([]);
  const [postcode, setPostcode] = useState("");
  const [budget, setBudget] = useState(1500);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const postcodeIsValid = /^\d{5}$/.test(postcode);
  const briefingIsComplete = Boolean(style && images.length && postcodeIsValid);
  const budgetLabel = useMemo(() => budget.toLocaleString("de-DE"), [budget]);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    const loadProjects = window.setTimeout(() => {
      setProjects(readLocalProjects(window.localStorage));
      setProjectsLoaded(true);
    }, 0);
    return () => window.clearTimeout(loadProjects);
  }, []);

  function commitProjects(nextProjects: LocalProject[]) {
    setProjects(nextProjects);
    writeLocalProjects(window.localStorage, nextProjects);
  }

  function createProject() {
    const name = newProjectName.trim();
    if (!name) {
      setProjectError("Bitte geben Sie Ihrem Zuhause einen Namen.");
      return;
    }
    const project = createLocalProject(name);
    commitProjects([...projects, project]);
    setNewProjectName("");
    setProjectError("");
    openProject(project);
  }

  function openProject(project: LocalProject) {
    images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setImages([]);
    setStyle(project.livingRoom.style);
    setPostcode(project.livingRoom.postcode);
    setBudget(project.livingRoom.budget);
    setShowSummary(false);
    setError("");
    setActiveProjectId(project.id);
    requestAnimationFrame(() => document.querySelector("#planer")?.scrollIntoView());
  }

  function updateActivePlan(changes: Partial<LocalProject["livingRoom"]>) {
    if (!activeProjectId) return;
    const now = new Date().toISOString();
    commitProjects(projects.map((project) => project.id === activeProjectId
      ? { ...project, updatedAt: now, livingRoom: { ...project.livingRoom, ...changes } }
      : project));
  }

  function startRenaming(project: LocalProject) {
    setRenamingProjectId(project.id);
    setRenamingProjectName(project.name);
    setProjectError("");
  }

  function saveProjectName(projectId: string) {
    const name = renamingProjectName.trim();
    if (!name) {
      setProjectError("Der Projektname darf nicht leer sein.");
      return;
    }
    commitProjects(projects.map((project) => project.id === projectId
      ? { ...project, name, updatedAt: new Date().toISOString() }
      : project));
    setRenamingProjectId(null);
    setProjectError("");
  }

  function deleteProject(project: LocalProject) {
    if (!window.confirm(`Möchten Sie „${project.name}“ wirklich löschen? Diese lokale Löschung kann nicht rückgängig gemacht werden.`)) return;
    const remainingProjects = projects.filter(({ id }) => id !== project.id);
    commitProjects(remainingProjects);
    if (activeProjectId === project.id) {
      setActiveProjectId(null);
      images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setImages([]);
      setShowSummary(false);
    }
  }

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
              <a href="#top">Homepage</a><a href="#projekte">Meine Projekte</a><a href="#planer">Wohnzimmer planen</a>
              <span>Weitere Zimmer <Soon /></span><span>Produkte <Soon /></span>
              <span>Preisgestaltung <Soon /></span><span>Services <Soon /></span>
            </nav>
          </details>
        </div>

        <div className="main-nav-row">
          <nav className="desktop-nav" aria-label="Hauptnavigation">
            <a className="nav-home" href="#top">Homepage</a>
            <a href="#projekte">Meine Projekte</a>
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
          <section className="projects-panel" id="projekte" aria-labelledby="projects-title">
            <div className="projects-heading">
              <div><small>LOKAL IN DIESEM BROWSER</small><h2 id="projects-title">Meine Projekte</h2></div>
              <p>Ihre Projektdaten bleiben auf diesem Gerät. Fotos werden nicht dauerhaft gespeichert.</p>
            </div>
            <form className="new-project-form" onSubmit={(event) => { event.preventDefault(); createProject(); }}>
              <label htmlFor="new-project-name">Neues Zuhause</label>
              <div>
                <input id="new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} maxLength={60} placeholder="z. B. Meine Wohnung" />
                <button type="submit">Zuhause anlegen</button>
              </div>
            </form>
            {projectError && <p className="form-error" role="alert">{projectError}</p>}
            {!projectsLoaded ? <p className="projects-status">Projekte werden geladen …</p> : projects.length === 0 ? (
              <p className="projects-status">Noch kein Zuhause angelegt. Beginnen Sie mit einem Namen.</p>
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <article className={activeProjectId === project.id ? "active" : ""} key={project.id}>
                    {renamingProjectId === project.id ? (
                      <form className="rename-project-form" onSubmit={(event) => { event.preventDefault(); saveProjectName(project.id); }}>
                        <label htmlFor={`rename-${project.id}`}>Projektname</label>
                        <input id={`rename-${project.id}`} value={renamingProjectName} onChange={(event) => setRenamingProjectName(event.target.value)} maxLength={60} />
                        <div><button type="submit">Speichern</button><button type="button" onClick={() => setRenamingProjectId(null)}>Abbrechen</button></div>
                      </form>
                    ) : (
                      <>
                        <div><small>ZUHAUSE</small><h3>{project.name}</h3><p>Wohnzimmer · {project.livingRoom.style || "Planung begonnen"}</p></div>
                        <div className="project-actions">
                          <button type="button" onClick={() => openProject(project)}>{activeProjectId === project.id ? "Geöffnet" : "Öffnen"}</button>
                          <button type="button" onClick={() => startRenaming(project)}>Umbenennen</button>
                          <button className="delete-action" type="button" onClick={() => deleteProject(project)}>Löschen</button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
          {activeProject && <div className="active-project-banner"><span>Aktives Zuhause</span><strong>{activeProject.name}</strong><small>Änderungen an Stil, Postleitzahl und Budget werden automatisch lokal gespeichert.</small></div>}
          <div className={`planning-workspace${activeProject ? "" : " no-project"}`} id="planer">
          {activeProject ? <>
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
                    onClick={() => { setStyle(name); updateActivePlan({ style: name }); setShowSummary(false); }}
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
                    updateActivePlan({ postcode: event.target.value.replace(/\D/g, "").slice(0, 5) });
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
                  onChange={(event) => { const nextBudget = Number(event.target.value); setBudget(nextBudget); updateActivePlan({ budget: nextBudget }); setShowSummary(false); }}
                />
                <div className="range-labels"><span>100 €</span><span>10.000 €</span></div>
              </div>
            </li>
          </ol>
          <FurniturePlanner
            review={activeProject.livingRoom.furnitureReview}
            imageCount={images.length}
            onChange={(furnitureReview) => updateActivePlan({ furnitureReview })}
          />
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
                  <div><dt>Möbelangaben</dt><dd>{activeProject.livingRoom.furnitureReview.items.length || "Keine Vorgabe"}</dd></div>
                </dl>
                <div className="prototype-note"><strong>Noch keine KI-Ausführung</strong><p>Die Fotos bleiben lokal in diesem Browserfenster. Eine KI-Erstellung und dauerhafte Speicherung sind in dieser Phase nicht aktiv.</p></div>
                <button type="button" onClick={() => setShowSummary(false)}>Angaben bearbeiten</button>
              </div>
            ) : (
              <div>
                <h2 id="design-results-title">Ihre Planung</h2>
                <p>Vervollständigen Sie links die Angaben. Danach können Sie hier lokale Testentwürfe erstellen.</p>
              </div>
            )}
            <DraftResults plan={activeProject.livingRoom} canCreate={briefingIsComplete} onChange={(drafts) => updateActivePlan({ drafts })} />
          </aside>
          </> : <div className="no-project-message"><h2>Wählen Sie zuerst ein Zuhause</h2><p>Legen Sie oben ein Projekt an oder öffnen Sie ein vorhandenes Zuhause, um das Wohnzimmer zu planen.</p></div>}
          </div>
        </section>
      </main>
    </>
  );
}
