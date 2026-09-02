"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createLocalProject,
  readLocalProjects,
  writeLocalProjects,
} from "@/lib/local-projects";
import type { LocalProject } from "@/lib/local-projects";
import AutomaticProductConcept from "./automatic-product-concept";
import { syntheticProductCatalog } from "@/lib/product-catalog";
import { createAutomaticProductConcept } from "@/lib/product-concept";
import AuthPanel from "./auth-panel";
import type { User } from "@supabase/supabase-js";
import type { AccountDeletionRequest } from "@/lib/supabase/account-deletion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  movePrivateProjectToTrash,
  permanentlyDeletePrivateProject,
  readPrivatePhotos,
  readPrivateProjects,
  removePrivatePhoto,
  restorePrivateProject,
  savePrivateProject,
  uploadPrivatePhotos,
} from "@/lib/supabase/private-projects";
import type { PrivateProject } from "@/lib/supabase/private-projects";
import { transferPendingGuestProject } from "@/lib/supabase/guest-project-transfer";
import {
  grantPhotoStorageConsent,
  readPhotoStorageConsent,
  withdrawPhotoStorageConsent,
} from "@/lib/supabase/photo-consent";

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

type RoomImage = { name: string; previewUrl: string; file?: File; storagePath?: string };

function Soon() {
  return <small>Bald verfügbar</small>;
}

export default function Home() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectSaveStatus, setProjectSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [photoSaveStatus, setPhotoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectError, setProjectError] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [style, setStyle] = useState("");
  const [images, setImages] = useState<RoomImage[]>([]);
  const [postcode, setPostcode] = useState("");
  const [budget, setBudget] = useState(1500);
  const [emptyRoomConfirmed, setEmptyRoomConfirmed] = useState(false);
  const [scaleMode, setScaleMode] = useState<"room-dimensions" | "reference">("room-dimensions");
  const [roomWidthCm, setRoomWidthCm] = useState<number | null>(null);
  const [roomDepthCm, setRoomDepthCm] = useState<number | null>(null);
  const [referenceLengthCm, setReferenceLengthCm] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [accountUser, setAccountUser] = useState<User | null>(null);
  const [accountDeletionRequest, setAccountDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [trashedProjects, setTrashedProjects] = useState<PrivateProject[]>([]);
  const [guestTransferMessage, setGuestTransferMessage] = useState("");
  const [photoConsentActive, setPhotoConsentActive] = useState(false);
  const [photoConsentBusy, setPhotoConsentBusy] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const postcodeIsValid = /^\d{5}$/.test(postcode);
  const measurementIsComplete = scaleMode === "room-dimensions"
    ? Boolean(roomWidthCm && roomDepthCm && roomWidthCm >= 200 && roomWidthCm <= 2000 && roomDepthCm >= 200 && roomDepthCm <= 2000)
    : Boolean(referenceLengthCm && referenceLengthCm >= 20 && referenceLengthCm <= 500);
  const briefingIsComplete = Boolean(style && images.length && emptyRoomConfirmed && measurementIsComplete);
  const budgetLabel = useMemo(() => budget.toLocaleString("de-DE"), [budget]);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const productConcept = useMemo(
    () => createAutomaticProductConcept(style, budget, syntheticProductCatalog, scaleMode === "room-dimensions"
      ? { mode: "room-dimensions", roomWidthCm: roomWidthCm ?? 0, roomDepthCm: roomDepthCm ?? 0 }
      : { mode: "reference", referenceLengthCm: referenceLengthCm ?? 0 }),
    [style, budget, scaleMode, roomWidthCm, roomDepthCm, referenceLengthCm],
  );

  useEffect(() => {
    const loadProjects = window.setTimeout(() => {
      setProjects(readLocalProjects(window.localStorage));
      setProjectsLoaded(true);
    }, 0);
    return () => window.clearTimeout(loadProjects);
  }, []);

  useEffect(() => {
    if (!accountUser || accountDeletionRequest) return;
    let active = true;
    Promise.all([
      transferPendingGuestProject(window.localStorage, supabase, accountUser),
      readPhotoStorageConsent(supabase),
    ]).then(async ([transferredProjectName, consentActive]) => {
      const privateProjects = await readPrivateProjects(supabase);
      if (!active) return;
      setPhotoConsentActive(consentActive);
      setGuestTransferMessage(transferredProjectName
        ? `„${transferredProjectName}“ wurde sicher aus diesem Browser in Ihr Konto übernommen.`
        : "");
      setProjects(privateProjects.filter((project) => !project.deletedAt));
      setTrashedProjects(privateProjects.filter((project) => project.deletedAt));
      setActiveProjectId(null);
      setProjectsLoaded(true);
    }).catch((loadError) => {
      if (!active) return;
      setProjectError(loadError instanceof Error ? loadError.message : "Private Projekte konnten nicht geladen werden.");
      setProjectsLoaded(true);
    });
    return () => { active = false; };
  }, [accountDeletionRequest, accountUser, supabase]);

  async function commitProjects(nextProjects: LocalProject[]) {
    setProjectError("");
    if (accountUser) {
      setProjectSaveStatus("saving");
      try {
        await Promise.all(nextProjects.map((project) => savePrivateProject(supabase, accountUser, project)));
      } catch (saveError) {
        setProjectSaveStatus("idle");
        setProjectError(saveError instanceof Error ? saveError.message : "Das private Projekt konnte nicht gespeichert werden.");
        return false;
      }
      setProjectSaveStatus("saved");
    } else {
      writeLocalProjects(window.localStorage, nextProjects);
    }
    setProjects(nextProjects);
    return true;
  }

  const handleAccountUserChange = useCallback((user: User | null) => {
    setAccountUser(user);
    if (user) {
      setProjectsLoaded(false);
    } else {
      setProjects(readLocalProjects(window.localStorage));
      setTrashedProjects([]);
      setPhotoConsentActive(false);
      setGuestTransferMessage("");
      setActiveProjectId(null);
      setProjectsLoaded(true);
    }
  }, []);

  async function allowPrivatePhotoStorage() {
    setPhotoConsentBusy(true);
    setError("");
    try {
      await grantPhotoStorageConsent(supabase);
      setPhotoConsentActive(true);
    } catch (consentError) {
      setError(consentError instanceof Error ? consentError.message : "Die Foto-Einwilligung konnte nicht gespeichert werden.");
    } finally {
      setPhotoConsentBusy(false);
    }
  }

  async function withdrawPrivatePhotoStorage() {
    if (!window.confirm("Möchten Sie die Einwilligung zur privaten Fotospeicherung widerrufen? Alle bisher gespeicherten Raumfotos werden dauerhaft gelöscht.")) return;
    setPhotoConsentBusy(true);
    setError("");
    try {
      await withdrawPhotoStorageConsent(supabase);
      images.forEach(({ previewUrl }) => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); });
      setImages([]);
      setPhotoConsentActive(false);
    } catch (consentError) {
      setError(consentError instanceof Error ? consentError.message : "Der Widerruf konnte nicht vollständig verarbeitet werden.");
    } finally {
      setPhotoConsentBusy(false);
    }
  }

  const handleDeletionRequestChange = useCallback((request: AccountDeletionRequest | null) => {
    setAccountDeletionRequest(request);
    if (request) {
      setProjects([]);
      setTrashedProjects([]);
      setActiveProjectId(null);
      setImages([]);
    } else {
      setProjectsLoaded(false);
    }
  }, []);

  async function createProject() {
    const name = newProjectName.trim();
    if (!name) {
      setProjectError("Bitte geben Sie Ihrem Zuhause einen Namen.");
      return;
    }
    const project = createLocalProject(name);
    const saved = await commitProjects([...projects, project]);
    if (!saved) return;
    setNewProjectName("");
    openProject(project);
  }

  async function openProject(project: LocalProject) {
    images.forEach(({ previewUrl }) => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); });
    setImages([]);
    setStyle(project.livingRoom.style);
    setPostcode(project.livingRoom.postcode);
    setBudget(project.livingRoom.budget);
    setEmptyRoomConfirmed(project.livingRoom.emptyRoomConfirmed);
    setScaleMode(project.livingRoom.scaleMode);
    setRoomWidthCm(project.livingRoom.roomWidthCm);
    setRoomDepthCm(project.livingRoom.roomDepthCm);
    setReferenceLengthCm(project.livingRoom.referenceLengthCm);
    setShowSummary(false);
    setError("");
    setActiveProjectId(project.id);
    if (accountUser) {
      try {
        const storedImages = await readPrivatePhotos(supabase, project.id);
        setImages(storedImages);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Private Fotos konnten nicht geladen werden.");
      }
    }
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

  async function saveProjectName(projectId: string) {
    const name = renamingProjectName.trim();
    if (!name) {
      setProjectError("Der Projektname darf nicht leer sein.");
      return;
    }
    const saved = await commitProjects(projects.map((project) => project.id === projectId
      ? { ...project, name, updatedAt: new Date().toISOString() }
      : project));
    if (!saved) return;
    setRenamingProjectId(null);
  }

  async function deleteProject(project: LocalProject) {
    const confirmation = accountUser
      ? `Möchten Sie „${project.name}“ für 30 Tage in den Papierkorb verschieben?`
      : `Möchten Sie „${project.name}“ wirklich löschen? Diese lokale Löschung kann nicht rückgängig gemacht werden.`;
    if (!window.confirm(confirmation)) return;
    if (accountUser) {
      try {
        await movePrivateProjectToTrash(supabase, project.id);
      } catch (deleteError) {
        setProjectError(deleteError instanceof Error ? deleteError.message : "Das private Projekt konnte nicht in den Papierkorb verschoben werden.");
        return;
      }
      setTrashedProjects((current) => [{ ...project, deletedAt: new Date().toISOString() }, ...current]);
    }
    const remainingProjects = projects.filter(({ id }) => id !== project.id);
    setProjects(remainingProjects);
    if (!accountUser) writeLocalProjects(window.localStorage, remainingProjects);
    if (activeProjectId === project.id) {
      setActiveProjectId(null);
      images.forEach(({ previewUrl }) => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); });
      setImages([]);
      setShowSummary(false);
    }
  }

  async function restoreProject(project: PrivateProject) {
    try {
      await restorePrivateProject(supabase, project.id);
      setTrashedProjects((current) => current.filter(({ id }) => id !== project.id));
      setProjects((current) => [{ ...project, deletedAt: null }, ...current]);
      setProjectError("");
    } catch (restoreError) {
      setProjectError(restoreError instanceof Error ? restoreError.message : "Das Projekt konnte nicht wiederhergestellt werden.");
    }
  }

  async function permanentlyDeleteProject(project: PrivateProject) {
    if (!window.confirm(`Möchten Sie „${project.name}“ jetzt endgültig löschen? Das Projekt und seine Fotos können danach nicht wiederhergestellt werden.`)) return;
    try {
      await permanentlyDeletePrivateProject(supabase, project.id);
      setTrashedProjects((current) => current.filter(({ id }) => id !== project.id));
      setProjectError("");
    } catch (deleteError) {
      setProjectError(deleteError instanceof Error ? deleteError.message : "Das Projekt konnte nicht endgültig gelöscht werden.");
    }
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setError("");

    if (selectedFiles.length === 0) return;

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

    const previews = selectedFiles.map((file) => ({ name: file.name, file, previewUrl: URL.createObjectURL(file) }));
    if (accountUser && activeProjectId) {
      setPhotoSaveStatus("saving");
      try {
        const storedImages = images.filter((image) => image.storagePath);
        const uploaded = await uploadPrivatePhotos(supabase, accountUser, activeProjectId, selectedFiles);
        previews.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
        const remainingOldImages: RoomImage[] = [];
        for (const storedImage of storedImages) {
          try {
            await removePrivatePhoto(supabase, storedImage.storagePath!);
          } catch {
            remainingOldImages.push(storedImage);
          }
        }
        setImages([...remainingOldImages, ...uploaded]);
        setPhotoSaveStatus("saved");
        if (remainingOldImages.length) setError("Die neuen Fotos wurden gespeichert, aber mindestens ein bisheriges Foto konnte noch nicht entfernt werden.");
      } catch (uploadError) {
        previews.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
        setPhotoSaveStatus("idle");
        setError(uploadError instanceof Error ? uploadError.message : "Die privaten Fotos konnten nicht gespeichert werden.");
      }
    } else {
      images.forEach(({ previewUrl }) => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); });
      setImages(previews);
    }
    setShowSummary(false);
  }

  async function removeImage(index: number) {
    const image = images[index];
    if (accountUser && image?.storagePath) {
      try {
        await removePrivatePhoto(supabase, image.storagePath);
      } catch (removeError) {
        setError(removeError instanceof Error ? removeError.message : "Das private Foto konnte nicht gelöscht werden.");
        return;
      }
    }
    if (image?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setShowSummary(false);
  }

  function createSummary() {
    if (!briefingIsComplete) {
      setError("Bitte bestätige den leeren Raum, ergänze ein Maß, wähle einen Stil und lade mindestens ein Foto hoch.");
      return;
    }
    setError("");
    updateActivePlan({ productConcept });
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
          <AuthPanel
            onUserChange={handleAccountUserChange}
            onDeletionRequestChange={handleDeletionRequestChange}
            guestProjectId={accountUser ? null : activeProjectId}
          />
          {accountDeletionRequest ? (
            <section className="account-locked" aria-labelledby="account-locked-title">
              <h2 id="account-locked-title">Konto zur Löschung vorgemerkt</h2>
              <p>Ihre Projekte und Fotos bleiben während der 14-tägigen Widerrufsfrist geschützt, können aber nicht bearbeitet werden.</p>
            </section>
          ) : <>
          <section className="projects-panel" id="projekte" aria-labelledby="projects-title">
            <div className="projects-heading">
              <div><small>{accountUser ? "PRIVAT IN IHREM KONTO" : "LOKAL IN DIESEM BROWSER"}</small><h2 id="projects-title">Meine Projekte</h2></div>
              <p>{accountUser
                ? "Ihre Projekte und Fotos werden privat Ihrem angemeldeten Konto zugeordnet."
                : "Ihre Projektdaten bleiben auf diesem Gerät. Fotos werden nicht dauerhaft gespeichert."}</p>
            </div>
            <form className="new-project-form" onSubmit={(event) => { event.preventDefault(); createProject(); }}>
              <label htmlFor="new-project-name">Neues Zuhause</label>
              <div>
                <input id="new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} maxLength={60} placeholder="z. B. Meine Wohnung" />
                <button type="submit" disabled={projectSaveStatus === "saving"}>{projectSaveStatus === "saving" ? "Wird gespeichert …" : "Zuhause anlegen"}</button>
              </div>
            </form>
            {projectError && <p className="form-error" role="alert">{projectError}</p>}
            {guestTransferMessage && <p className="projects-status" role="status">{guestTransferMessage}</p>}
            {accountUser && projectSaveStatus === "saved" && !projectError && <p className="projects-status" role="status">Alle Änderungen wurden sicher gespeichert.</p>}
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
            {accountUser && trashedProjects.length > 0 && (
              <details className="project-trash">
                <summary>Papierkorb ({trashedProjects.length})</summary>
                <p>Projekte werden 30 Tage nach dem Löschen endgültig entfernt.</p>
                <div className="project-grid">
                  {trashedProjects.map((project) => {
                    const deleteOn = new Date(new Date(project.deletedAt!).getTime() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <article key={project.id}>
                        <div><small>PAPIERKORB</small><h3>{project.name}</h3><p>Endgültige Löschung frühestens am {deleteOn.toLocaleDateString("de-DE")}</p></div>
                        <div className="project-actions">
                          <button type="button" onClick={() => restoreProject(project)}>Wiederherstellen</button>
                          <button className="delete-action" type="button" onClick={() => permanentlyDeleteProject(project)}>Endgültig löschen</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            )}
          </section>
          {activeProject && <div className="active-project-banner"><span>Aktives Zuhause</span><strong>{activeProject.name}</strong><small>Planungsangaben und Maße werden automatisch im Projekt gespeichert.</small></div>}
          <div className={`planning-workspace${activeProject ? "" : " no-project"}`} id="planer">
          {activeProject ? <>
          <div className="planning-controls-column">
          <ol className="planning-steps" aria-label="So funktioniert Raumly">
            <li className="planning-step-detailed">
              <div className="step-heading"><span>1</span><strong>Zimmer auswählen</strong></div>
              <ul className="room-options" aria-label="Verfügbare und zukünftige Zimmer">
                <li className="room-option-selected"><strong>Wohnzimmer</strong><small>Ausgewählt</small></li>
                {futureRoomOptions.map((room) => (
                  <li key={room}><strong>{room}</strong><small>Bald verfügbar</small></li>
                ))}
              </ul>
              <div className="empty-room-check">
                <label><input type="checkbox" checked={emptyRoomConfirmed} onChange={(event) => { setEmptyRoomConfirmed(event.target.checked); updateActivePlan({ emptyRoomConfirmed: event.target.checked, productConcept: null }); setShowSummary(false); }} /> Dieses Foto zeigt einen leeren Raum ohne vorhandene Möbel.</label>
                <small>Phase 11 plant ausschließlich leere Räume. Eingerichtete Räume werden noch nicht unterstützt.</small>
              </div>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>2</span><strong>Maßstab angeben</strong></div>
              <fieldset className="scale-fields">
                <legend>Wie soll Raumly die Produktgröße einschätzen?</legend>
                <label><input type="radio" name="scale-mode" checked={scaleMode === "room-dimensions"} onChange={() => { setScaleMode("room-dimensions"); updateActivePlan({ scaleMode: "room-dimensions", productConcept: null }); setShowSummary(false); }} /> Raummaße</label>
                <label><input type="radio" name="scale-mode" checked={scaleMode === "reference"} onChange={() => { setScaleMode("reference"); updateActivePlan({ scaleMode: "reference", productConcept: null }); setShowSummary(false); }} /> Referenzmaß im Foto</label>
                {scaleMode === "room-dimensions" ? <div className="measurement-grid">
                  <label htmlFor="room-width">Raumbreite in cm<input id="room-width" type="number" min="200" max="2000" value={roomWidthCm ?? ""} onChange={(event) => { const value = event.target.value ? Number(event.target.value) : null; setRoomWidthCm(value); updateActivePlan({ roomWidthCm: value, productConcept: null }); setShowSummary(false); }} /></label>
                  <label htmlFor="room-depth">Raumtiefe in cm<input id="room-depth" type="number" min="200" max="2000" value={roomDepthCm ?? ""} onChange={(event) => { const value = event.target.value ? Number(event.target.value) : null; setRoomDepthCm(value); updateActivePlan({ roomDepthCm: value, productConcept: null }); setShowSummary(false); }} /></label>
                </div> : <label className="reference-field" htmlFor="reference-length">Länge eines sichtbaren Referenzobjekts in cm<input id="reference-length" type="number" min="20" max="500" value={referenceLengthCm ?? ""} onChange={(event) => { const value = event.target.value ? Number(event.target.value) : null; setReferenceLengthCm(value); updateActivePlan({ referenceLengthCm: value, productConcept: null }); setShowSummary(false); }} /><small>Beispiel: Türbreite oder eine eindeutig markierte Messstrecke. Die Passform bleibt damit nur geschätzt.</small></label>}
              </fieldset>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>3</span><strong>Designstil wählen</strong></div>
              <div className="style-options" aria-label="Designstil wählen">
                {designStyles.map(([name, description]) => (
                  <button
                    className={style === name ? "selected" : ""}
                    key={name}
                    type="button"
                    aria-pressed={style === name}
                    onClick={() => { setStyle(name); updateActivePlan({ style: name, productConcept: null }); setShowSummary(false); }}
                  >
                    <strong>{name}</strong><small>{description}</small>
                  </button>
                ))}
              </div>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>4</span><strong>Foto des leeren Raums hochladen</strong></div>
              {accountUser && <div className="photo-consent-panel">
                <strong>Private Fotospeicherung</strong>
                <p>Raumfotos können persönliche Details enthalten. Sie werden privat Ihrem Konto zugeordnet und ausschließlich für Ihre Raumplanung gespeichert.</p>
                {photoConsentActive
                  ? <><span role="status">Einwilligung aktiv</span><button type="button" onClick={withdrawPrivatePhotoStorage} disabled={photoConsentBusy}>{photoConsentBusy ? "Bitte warten …" : "Einwilligung widerrufen und Fotos löschen"}</button></>
                  : <button type="button" onClick={allowPrivatePhotoStorage} disabled={photoConsentBusy}>{photoConsentBusy ? "Bitte warten …" : "Private Fotospeicherung erlauben"}</button>}
              </div>}
              <label className="upload-zone" htmlFor="room-images">
                <span aria-hidden="true">↑</span>
                <strong>Fotos auswählen</strong>
                <small>1–5 Bilder · JPG, PNG oder WEBP · maximal 10 MB pro Bild</small>
                <input id="room-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} disabled={photoSaveStatus === "saving" || Boolean(accountUser && !photoConsentActive)} />
              </label>
              {accountUser && !photoConsentActive && <small>Bitte erlauben Sie zuerst die private Fotospeicherung. Ohne Einwilligung wird kein Foto hochgeladen.</small>}
              {accountUser && photoSaveStatus === "saving" && <p className="projects-status" role="status">Fotos werden sicher gespeichert …</p>}
              {accountUser && photoSaveStatus === "saved" && !error && <p className="projects-status" role="status">Fotos wurden sicher gespeichert.</p>}
              <div className="image-previews" aria-live="polite">
                {images.map(({ name, file, previewUrl, storagePath }, index) => (
                  <figure key={storagePath ?? `${name}-${file?.lastModified ?? index}`}>
                    {/* A local object URL is required for an immediate, non-uploaded preview. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Vorschau: ${name}`} />
                    <button type="button" onClick={() => removeImage(index)} aria-label={`${name} entfernen`} disabled={photoSaveStatus === "saving"}>×</button>
                  </figure>
                ))}
              </div>
            </li>
            <li className="planning-step-detailed">
              <div className="step-heading"><span>5</span><strong>Budget auswählen</strong></div>
              <div className="planning-fields">
                <label htmlFor="budget">Budget: <strong>{budgetLabel} €</strong></label>
                <input
                  id="budget"
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={budget}
                  onChange={(event) => { const nextBudget = Number(event.target.value); setBudget(nextBudget); updateActivePlan({ budget: nextBudget, productConcept: null }); setShowSummary(false); }}
                />
                <div className="range-labels"><span>100 €</span><span>10.000 €</span></div>
                <label htmlFor="postcode">Postleitzahl <small>(optional)</small></label>
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
                  aria-invalid={Boolean(postcode && !postcodeIsValid)}
                />
                <small id="postcode-help">Nur für spätere regionale Händlerempfehlungen in Deutschland. Sie können die Angabe vorerst leer lassen.</small>
              </div>
            </li>
          </ol>
          <div className="generate-panel">
            <button type="button" disabled={!briefingIsComplete} onClick={createSummary}>Planung zusammenfassen</button>
            <small>{briefingIsComplete ? "Die fünf Grundschritte sind vollständig." : "Bestätigen Sie den leeren Raum, ergänzen Sie ein Maß und wählen Sie Stil sowie Foto."}</small>
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
                  <div><dt>Leerraum</dt><dd>Bestätigt</dd></div>
                  <div><dt>Maßstab</dt><dd>{scaleMode === "room-dimensions" ? `${roomWidthCm} × ${roomDepthCm} cm` : `Referenz ${referenceLengthCm} cm`}</dd></div>
                  <div><dt>Designstil</dt><dd>{style}</dd></div>
                  <div><dt>Fotos</dt><dd>{images.length}</dd></div>
                  <div><dt>Postleitzahl</dt><dd>{postcodeIsValid ? postcode : "Noch nicht angegeben"}</dd></div>
                  <div><dt>Budget</dt><dd>{budgetLabel} €</dd></div>
                </dl>
                <AutomaticProductConcept concept={productConcept} />
                <button type="button" onClick={() => setShowSummary(false)}>Angaben bearbeiten</button>
              </div>
            ) : (
              <div>
                <h2 id="design-results-title">Ihre Planung</h2>
                <p>Vervollständigen Sie die vier Grundschritte. Danach sehen Sie hier die geprüfte Grundlage für Ihren späteren Inspirationsentwurf.</p>
              </div>
            )}
          </aside>
          </> : <div className="no-project-message"><h2>Wählen Sie zuerst ein Zuhause</h2><p>Legen Sie oben ein Projekt an oder öffnen Sie ein vorhandenes Zuhause, um das Wohnzimmer zu planen.</p></div>}
          </div>
          </>}
        </section>
      </main>
    </>
  );
}
