"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import styles from "./test-panel.module.css";

type State = {
  consent: boolean; externalEnabled: boolean;
  campaign: { enabled: boolean; reserved_cents: number; photo_count: number; actual_cents: number | null; active_attempt: string | null };
  availablePhotos: { id: string; original_name: string }[];
  photos: { id: string; photo_id: string | null; attempts: number; style: string; budget_euro: number; room_fidelity_profile: RoomProfile | null }[];
  attempts: { id: string; test_photo_id: string; status: string; room_fidelity_status: "pending" | "accepted" | "rejected"; reserved_cents: number; duration_ms: number | null }[];
};
type RoomProfile = { doors: number; windows: number; openings: number; protectedArchitecture: true };
type ProfileDraft = { doors: string; windows: string; openings: string; confirmed: boolean };
const emptyProfile: ProfileDraft = { doors: "", windows: "", openings: "", confirmed: false };
const endpoint = "/api/internal/image-test";

async function authenticatedFetch(url: string, init?: RequestInit) {
  const supabase = createSupabaseBrowserClient();
  const { data: initial } = await supabase.auth.getSession();
  if (!initial.session) throw new Error("Bitte zuerst im normalen Raumly-Bereich anmelden. Nur freigegebene Testkonten erhalten Zugriff.");
  // The server verifies every bearer token. Refresh only an expiring session so
  // a normal test action does not depend on a second authentication round trip.
  const expiresSoon = !initial.session.expires_at || initial.session.expires_at * 1000 <= Date.now() + 30_000;
  const { data, error } = expiresSoon ? await supabase.auth.refreshSession() : { data: initial, error: null };
  const session = data.session;
  if (error || !session) throw new Error("Bitte erneut im normalen Raumly-Bereich anmelden.");
  return fetch(url, { ...init, cache: "no-store", headers: { ...init?.headers, Authorization: `Bearer ${session.access_token}` } });
}

export default function ImageTestPanel() {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("Testzugang noch nicht geladen. Externe Ausführung ist standardmäßig ausgeschaltet.");
  const [checked, setChecked] = useState(false);
  const [photoId, setPhotoId] = useState("");
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, ProfileDraft>>({});
  const [comparison, setComparison] = useState<{ attemptId: string; sourceUrl: string; resultUrl: string } | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  useEffect(() => () => {
    if (comparison) { URL.revokeObjectURL(comparison.sourceUrl); URL.revokeObjectURL(comparison.resultUrl); }
  }, [comparison]);

  async function reload() {
    const response = await authenticatedFetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setState(data);
  }

  async function act(body?: Record<string, unknown>) {
    setBusy(true); setMessage(""); setComparison(null); setReviewConfirmed(false);
    try {
      if (body) {
        const response = await authenticatedFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      }
      await reload();
      setChecked(false);
      setMessage(body ? "Aktion bestätigt. Teststand aktualisiert." : "Teststand geladen.");
    } catch (error) { setState(null); setMessage(error instanceof Error ? error.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  async function showComparison(attemptId: string, testPhotoId: string) {
    setBusy(true); setComparison(null); setReviewConfirmed(false);
    try {
      const [sourceResponse, resultResponse] = await Promise.all([
        authenticatedFetch(`${endpoint}?source=${testPhotoId}`),
        authenticatedFetch(`${endpoint}?result=${attemptId}`),
      ]);
      if (!sourceResponse.ok || !resultResponse.ok) throw new Error("Vergleich nicht mehr verfügbar oder Einwilligung widerrufen.");
      setComparison({ attemptId, sourceUrl: URL.createObjectURL(await sourceResponse.blob()), resultUrl: URL.createObjectURL(await resultResponse.blob()) });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ergebnis nicht verfügbar."); }
    finally { setBusy(false); }
  }

  function updateProfile(id: string, change: Partial<ProfileDraft>) {
    setProfiles((current) => ({ ...current, [id]: { ...(current[id] ?? emptyProfile), ...change } }));
  }

  function saveProfile(id: string) {
    const draft = profiles[id] ?? emptyProfile;
    act({ action: "setRoomFidelity", testPhotoId: id, profile: {
      doors: Number(draft.doors), windows: Number(draft.windows), openings: Number(draft.openings), protectedArchitecture: true,
    } });
  }

  return <section className={styles.panel} aria-label="Geschützter Testbereich">
    <button disabled={busy} onClick={() => act()}>Teststand laden</button>
    <p role="status">{message}</p>
    {state && <>
      <p><strong>{state.externalEnabled && state.campaign.enabled ? "Ein einzelner Versuch freigegeben" : "Externe Ausführung gesperrt"}</strong></p>
      <p>Fotos: {state.campaign.photo_count}/5 · Reserviert: {(state.campaign.reserved_cents / 100).toFixed(2)} €/3,00 € ·
        Tatsächlich abgerechnet: {state.campaign.actual_cents === null ? "noch nicht abgeglichen" : `${(state.campaign.actual_cents / 100).toFixed(2)} €`}</p>
      <fieldset disabled={busy}>
        <legend>Separate KI-Einwilligung · vertex-test-v1</legend>
        <p>Ich erlaube für diesen internen Test die Übertragung der einzeln freigegebenen Wohnzimmerfotos,
          des Stils und des Einrichtungsbudgets an Google Vertex AI zur Erstellung von Inspirationsbildern.
          Der globale Endpunkt garantiert keine ausschließliche EU-Verarbeitung; Google kann Daten
          zur Missbrauchserkennung speichern. Die konkreten Anbieterbedingungen müssen vor der echten Ausführung geprüft sein.</p>
        <p>Raumly speichert Testergebnisse privat für höchstens 30 Tage. Ein Widerruf sperrt weitere
          Aufträge und entfernt die Testergebnisse. Bereits übertragene Daten lassen sich nicht zurückholen.
          Die normale Foto-Speichereinwilligung gilt unabhängig davon.</p>
        {state.consent ? <button onClick={() => act({ action: "withdraw" })}>KI-Einwilligung widerrufen und Ergebnisse löschen</button> : <>
          <label><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> Ich stimme dieser getrennten KI-Verarbeitung zu.</label>
          <button disabled={!checked} onClick={() => act({ action: "grant" })}>KI-Einwilligung speichern</button>
        </>}
      </fieldset>
      <fieldset disabled={busy || !state.consent}>
        <legend>Ein Foto ausdrücklich zulassen</legend>
        <label>Eigenes gespeichertes Foto
          <select value={photoId} onChange={(event) => setPhotoId(event.target.value)}>
            <option value="">Bitte auswählen</option>
            {state.availablePhotos.map((photo) => <option key={photo.id} value={photo.id}>{photo.original_name}</option>)}
          </select>
        </label>
        <p>Für den KI-Test höchstens 7 MB je Foto. Nur eigene oder zur KI-Verarbeitung berechtigte Bilder ohne Personen, Dokumente oder andere sensible Details verwenden.</p>
        <button disabled={!photoId} onClick={() => act({ action: "approve", photoId })}>Dieses Foto für den KI-Test freigeben</button>
      </fieldset>
      {state.photos.map((photo, index) => <article key={photo.id}>
        <h2>Testfoto {index + 1}</h2>
        <p>{photo.style} · Einrichtung {photo.budget_euro} € · Versuche {photo.attempts}/2</p>
        {photo.room_fidelity_profile ? <p><strong>Raumtreue-Profil geschützt:</strong> {photo.room_fidelity_profile.doors} Türen, {photo.room_fidelity_profile.windows} Fenster, {photo.room_fidelity_profile.openings} Durchgänge; Wände, Boden und Perspektive unveränderlich.</p> : <fieldset>
          <legend>Raumtreue-Profil vor dem Test</legend>
          <p>Zähle nur die im Foto sichtbaren Elemente. Das Profil kann nach dem ersten Versuch nicht mehr geändert werden.</p>
          {(["doors", "windows", "openings"] as const).map((field) => <label key={field}>{({ doors: "Sichtbare Türen", windows: "Sichtbare Fenster", openings: "Sichtbare Durchgänge" })[field]}
            <input type="number" min="0" max="12" step="1" value={(profiles[photo.id] ?? emptyProfile)[field]} onChange={(event) => updateProfile(photo.id, { [field]: event.target.value })} />
          </label>)}
          <label><input type="checkbox" checked={(profiles[photo.id] ?? emptyProfile).confirmed} onChange={(event) => updateProfile(photo.id, { confirmed: event.target.checked })} /> Ich bestätige: Türen, Fenster, Durchgänge, Wände, Boden und Perspektive müssen unverändert bleiben.</label>
          <button disabled={!((profiles[photo.id] ?? emptyProfile).confirmed && ["doors", "windows", "openings"].every((field) => /^(0|[1-9]|1[0-2])$/.test((profiles[photo.id] ?? emptyProfile)[field as keyof Pick<ProfileDraft, "doors" | "windows" | "openings">])))} onClick={() => saveProfile(photo.id)}>Raumtreue-Profil speichern</button>
        </fieldset>}
        <button disabled={busy || !state.consent || !photo.photo_id || !photo.room_fidelity_profile || photo.attempts >= 2 || !state.externalEnabled || !state.campaign.enabled || !!state.campaign.active_attempt}
          onClick={() => act({ action: "generate", testPhotoId: photo.id, requestId: crypto.randomUUID() })}>Einen kostenpflichtigen Versuch starten</button>
        {!photo.room_fidelity_profile && <p>Start gesperrt: Zuerst das Raumtreue-Profil speichern.</p>}
      </article>)}
      {state.attempts.map((attempt, index) => <article key={attempt.id}>
        <h2>Versuch {state.attempts.length - index}</h2>
        <p>Status: {({ reserved: "reserviert / Ausgang offen", succeeded: "erfolgreich", unknown: "ungeklärt", discarded: "verworfen", deleted: "Ergebnis gelöscht" })[attempt.status] ?? attempt.status} · Reservierung {(attempt.reserved_cents / 100).toFixed(2)} €</p>
        {attempt.status === "succeeded" && <>
          <p>Raumtreue: {attempt.room_fidelity_status === "accepted" ? "bestätigt" : "Prüfung ausstehend"}</p>
          <button disabled={busy} onClick={() => showComparison(attempt.id, attempt.test_photo_id)}>Original und Ergebnis vergleichen</button>
          {attempt.room_fidelity_status === "pending" && <>
            <button disabled={busy || comparison?.attemptId !== attempt.id || !reviewConfirmed} onClick={() => act({ action: "reviewRoomFidelity", requestId: attempt.id, accepted: true })}>Raumtreue bestätigen</button>
            <button disabled={busy} onClick={() => act({ action: "reviewRoomFidelity", requestId: attempt.id, accepted: false })}>Als Raumtreuefehler verwerfen</button>
          </>}
          <button disabled={busy} onClick={() => act({ action: "delete", requestId: attempt.id })}>Testergebnis löschen</button>
        </>}
      </article>)}
    </>}
    {comparison && <section aria-label="Verpflichtender Raumtreuevergleich">
      <h2>Original und Ergebnis prüfen</h2>
      <div className={styles.comparison}>
        <figure>
          {/* Private Blob-URLs dürfen nicht durch einen Bild-Proxy laufen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={comparison.sourceUrl} alt="Freigegebenes Originalfoto" />
          <figcaption>Original</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={comparison.resultUrl} alt="KI-Inspirationsbild" />
          <figcaption>KI-Ergebnis – Prüfung ausstehend</figcaption>
        </figure>
      </div>
      <p>Prüfe Türen, Fenster, Durchgänge, Wände, Boden und Perspektive. Schon eine Abweichung bedeutet: verwerfen.</p>
      <label><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} /> Ich habe alle sechs Raummerkmale mit dem Original verglichen und keine Abweichung gefunden.</label>
    </section>}
  </section>;
}
