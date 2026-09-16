"use client";

import { useEffect, useState } from "react";

type Props = {
  projectId: string;
  image?: { name: string; previewUrl: string; file?: File };
  style: string;
  budgetEuro: number;
  ready: boolean;
  onGenerated: (url: string) => void;
  onProgress: (value: string | null) => void;
};

// The server independently enforces consent, a 30-cent reservation and one attempt.
export default function GuestImageTestPanel({ projectId, image, style, budgetEuro, ready, onGenerated, onProgress }: Props) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = process.env.NEXT_PUBLIC_RAUMLY_GUEST_IMAGE_TEST_ENABLED === "true";
  const rejectedPreviewEnabled = process.env.NEXT_PUBLIC_RAUMLY_INTERNAL_REJECTED_CANDIDATE_PREVIEW === "true";
  const scope = JSON.stringify([projectId, style, budgetEuro]);

  useEffect(() => {
    if (sessionStorage.getItem("raumly-image-test-scope") !== scope) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function restore() {
      try {
        const response = await fetch("/api/guest-image-test", { credentials: "same-origin", cache: "no-store" });
        const state = response.ok ? await response.json() : null;
        if (cancelled) return;
        const attempt = state?.attempts?.[0];
        if (attempt?.imageReady && typeof attempt.id === "string") {
          onGenerated(`/api/guest-image-test?candidate=${encodeURIComponent(attempt.id)}`);
          onProgress(null);
          setBusy(false);
        } else if (attempt?.status === "reserved") {
          setBusy(true);
          onProgress(attempt.progress_stage);
          timer = setTimeout(restore, 1500);
        } else if (attempt) {
          setBusy(false);
          if (attempt.status === "discarded" && rejectedPreviewEnabled && typeof attempt.id === "string") {
            onGenerated(`/api/guest-image-test?rejectedCandidate=${encodeURIComponent(attempt.id)}`);
            onProgress(null);
            setMessage("Interne Testansicht: Der verworfene Entwurf wird nur für die Anbieterevaluation angezeigt.");
          } else {
            onProgress(attempt.status === "discarded" ? "rejected" : "failed");
            setMessage(attempt.status === "discarded" ? "Der Entwurf hat die Raumtreue-Prüfung nicht bestanden." : "Der Versuch ist ungeklärt. Bitte vor einem weiteren Versuch prüfen lassen.");
          }
        }
      } catch { /* A later reload can read the same session; never generate during recovery. */ }
    }
    void restore();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [scope, onGenerated, onProgress, rejectedPreviewEnabled]);

  async function generate() {
    if (!image || !consent || !ready || busy) return;
    let poll: number | undefined;
    setBusy(true);
    setMessage("");
    onProgress("preparing");
    try {
      const session = await fetch("/api/guest-image-test?session=new", { credentials: "same-origin", cache: "no-store" });
      if (!session.ok) throw new Error("Der Bildversuch konnte nicht sicher vorbereitet werden.");
      sessionStorage.setItem("raumly-image-test-scope", scope);
      const body = new FormData();
      body.set("action", "generate");
      body.set("consent", "true");
      body.set("style", style);
      body.set("budgetEuro", String(budgetEuro));
      let photo = image.file;
      if (!photo) {
        const source = await fetch(image.previewUrl, { credentials: "same-origin" });
        const blob = await source.blob();
        if (!source.ok || !blob.size) throw new Error("Das private Projektfoto konnte nicht für den Bildversuch gelesen werden.");
        photo = new File([blob], image.name, { type: blob.type || "image/jpeg" });
      }
      body.set("photo", photo);
      poll = window.setInterval(async () => {
        const state = await fetch("/api/guest-image-test", { credentials: "same-origin", cache: "no-store" }).then((value) => value.ok ? value.json() : null).catch(() => null);
        const stage = state?.attempts?.[0]?.progress_stage;
        if (typeof stage === "string") onProgress(stage);
      }, 1000);
      const response = await fetch("/api/guest-image-test", { method: "POST", body, credentials: "same-origin" });
      window.clearInterval(poll);
      poll = undefined;
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.requestId !== "string") throw new Error(typeof result.error === "string" ? result.error : "Bildversuch fehlgeschlagen.");
      const stateResponse = await fetch("/api/guest-image-test", { credentials: "same-origin", cache: "no-store" });
      const state = stateResponse.ok ? await stateResponse.json() : null;
      const attempt = state?.attempts?.find((item: { id: string }) => item.id === result.requestId);
      if (!attempt?.imageReady) {
        if (attempt?.status === "discarded") {
          if (rejectedPreviewEnabled) {
            onGenerated(`/api/guest-image-test?rejectedCandidate=${encodeURIComponent(result.requestId)}`);
            onProgress(null);
            setMessage("Interne Testansicht: Der verworfene Entwurf wird nur für die Anbieterevaluation angezeigt.");
          } else {
            onProgress("rejected");
            setMessage("Das Bild wurde erzeugt, aber wegen einer Abweichung bei der Raumtreue nicht angezeigt.");
          }
          return;
        }
        throw new Error("Das Ergebnis ist noch nicht zur Anzeige freigegeben. Der gespeicherte Status bleibt erhalten.");
      }
      onGenerated(`/api/guest-image-test?candidate=${encodeURIComponent(result.requestId)}`);
      onProgress(null);
      setMessage("Der Bildversuch wurde automatisch auf Raumtreue geprüft.");
    } catch (error) {
      onProgress("failed");
      setMessage(error instanceof Error ? error.message : "Bildversuch fehlgeschlagen.");
    } finally {
      if (poll) window.clearInterval(poll);
      setBusy(false);
    }
  }

  return (
    <section className="guest-image-test" aria-label="Kontrollierter KI-Bildtest">
      <button type="button" onClick={generate} disabled={!enabled || !ready || !image || !consent || busy}>
        {busy ? "Bild wird generiert …" : "Bild generieren"}
      </button>
      <label className="guest-image-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        Ich willige ein, dass dieses Foto für genau einen Vertex-Bildversuch verarbeitet, nach höchstens 24 Stunden gelöscht und mit maximal 0,30 € berechnet wird.
      </label>
      {!ready && <small>Vervollständigen Sie zuerst die fünf Planungsschritte.</small>}
      {message && <p className="guest-image-status" role="status">{message}</p>}
    </section>
  );
}
