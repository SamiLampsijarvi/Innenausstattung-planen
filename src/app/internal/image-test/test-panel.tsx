"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import styles from "./test-panel.module.css";

type State = {
  consent: boolean; externalEnabled: boolean;
  campaign: { enabled: boolean; reserved_cents: number; photo_count: number; actual_cents: number | null; active_attempt: string | null };
  availablePhotos: { id: string; original_name: string }[];
  photos: { id: string; photo_id: string | null; attempts: number; style: string; budget_euro: number }[];
  attempts: { id: string; status: string; reserved_cents: number; duration_ms: number | null }[];
};
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  async function reload() {
    const response = await authenticatedFetch(endpoint);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setState(data);
  }

  async function act(body?: Record<string, string>) {
    setBusy(true); setMessage(""); setImageUrl(null);
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

  async function showResult(id: string) {
    setBusy(true); setImageUrl(null);
    try {
      const response = await authenticatedFetch(`${endpoint}?result=${id}`);
      if (!response.ok) throw new Error("Ergebnis nicht mehr verfügbar oder Einwilligung widerrufen.");
      setImageUrl(URL.createObjectURL(await response.blob()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ergebnis nicht verfügbar."); }
    finally { setBusy(false); }
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
        <button disabled={busy || !state.consent || !photo.photo_id || photo.attempts >= 2 || !state.externalEnabled || !state.campaign.enabled || !!state.campaign.active_attempt}
          onClick={() => act({ action: "generate", testPhotoId: photo.id, requestId: crypto.randomUUID() })}>Einen kostenpflichtigen Versuch starten</button>
      </article>)}
      {state.attempts.map((attempt, index) => <article key={attempt.id}>
        <h2>Versuch {state.attempts.length - index}</h2>
        <p>Status: {({ reserved: "reserviert / Ausgang offen", succeeded: "erfolgreich", unknown: "ungeklärt", discarded: "verworfen", deleted: "Ergebnis gelöscht" })[attempt.status] ?? attempt.status} · Reservierung {(attempt.reserved_cents / 100).toFixed(2)} €</p>
        {attempt.status === "succeeded" && <>
          <button disabled={busy} onClick={() => showResult(attempt.id)}>Ergebnis anzeigen</button>
          <button disabled={busy} onClick={() => act({ action: "delete", requestId: attempt.id })}>Testergebnis löschen</button>
        </>}
      </article>)}
    </>}
    {imageUrl && <figure>
      {/* A private blob URL must never pass through an image proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="KI-Inspirationsbild des Testwohnzimmers" />
      <figcaption>KI-Inspiration – keine maßgenaue Planung, Bestands- oder Kostengarantie.</figcaption>
    </figure>}
  </section>;
}
