"use client";

import { useState } from "react";

type Props = { file?: File; style: string; budgetEuro: number };
type TestState = "idle" | "prepared" | "candidate" | "accepted" | "unavailable";

// This is deliberately a separate, opt-in test surface. The normal planning
// flow never uploads a guest photo merely by showing this component.
export default function GuestImageTestPanel({ file, style, budgetEuro }: Props) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<TestState>("idle");
  const [message, setMessage] = useState("");
  const enabled = process.env.NEXT_PUBLIC_RAUMLY_GUEST_IMAGE_TEST_ENABLED === "true";

  async function prepare() {
    if (!file || !consent) return;
    setMessage("");
    if (!enabled) {
      setState("unavailable");
      setMessage("Der kontrollierte Bildtest ist noch ausgeschaltet. Ihr Foto bleibt nur in diesem Browser.");
      return;
    }
    // The endpoint stays server-side disabled until the operator explicitly
    // arms a single campaign. No Vertex request is made by this action.
    const body = new FormData();
    body.set("action", "prepare");
    body.set("photo", file);
    body.set("style", style);
    body.set("budgetEuro", String(budgetEuro));
    const response = await fetch("/api/guest-image-test", { method: "POST", body, credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(typeof result.error === "string" ? result.error : "Testvorbereitung fehlgeschlagen.");
      return;
    }
    setState("prepared");
    setMessage("Testfoto und Einwilligung sind für höchstens 24 Stunden getrennt gespeichert. Vertex bleibt ausgeschaltet.");
  }

  return (
    <section className="guest-image-test" aria-labelledby="guest-image-test-title">
      <small className="summary-kicker">KONTROLLIERTER KI-BILDTEST</small>
      <h3 id="guest-image-test-title">Raumtreuer Entwurf</h3>
      <p>Das Ergebnis erscheint erst nach der automatischen Architekturprüfung und Ihrer eigenen Sichtprüfung hier rechts.</p>
      <label className="guest-image-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        Ich willige ein, dass dieses Foto ausschließlich für einen kontrollierten Vertex-Test verarbeitet und spätestens nach 24 Stunden gelöscht wird.
      </label>
      <button type="button" onClick={prepare} disabled={!file || !consent || state === "prepared" || state === "candidate" || state === "accepted"}>
        {enabled ? "Test sicher vorbereiten" : "Bildtest ist ausgeschaltet"}
      </button>
      {state === "prepared" && <p className="guest-image-status">Bereit. Der einzelne Vertex-Aufruf wird erst nach Ihrer separaten Freigabe durch Raumly ausgelöst.</p>}
      {message && <p className="guest-image-status" role="status">{message}</p>}
      {!file && <small>Ohne Foto wird kein Test vorbereitet.</small>}
      {file && !consent && <small>Ohne Einwilligung wird kein Foto für diesen Test übertragen.</small>}
    </section>
  );
}
