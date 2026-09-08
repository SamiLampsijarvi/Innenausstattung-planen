"use client";

import { useState } from "react";

type Props = {
  image?: { name: string; previewUrl: string; file?: File };
  style: string;
  budgetEuro: number;
  ready: boolean;
  onGenerated: (url: string) => void;
};

// The server independently enforces consent, a 30-cent reservation and one attempt.
export default function GuestImageTestPanel({ image, style, budgetEuro, ready, onGenerated }: Props) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = process.env.NEXT_PUBLIC_RAUMLY_GUEST_IMAGE_TEST_ENABLED === "true";

  async function generate() {
    if (!image || !consent || !ready || busy) return;
    setBusy(true);
    setMessage("");
    try {
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
      const response = await fetch("/api/guest-image-test", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.requestId !== "string") throw new Error(typeof result.error === "string" ? result.error : "Bildversuch fehlgeschlagen.");
      onGenerated(`/api/guest-image-test?candidate=${encodeURIComponent(result.requestId)}`);
      setMessage("Der Bildversuch wurde automatisch auf Raumtreue geprüft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bildversuch fehlgeschlagen.");
    } finally {
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
