"use client";

import { useMemo, useState } from "react";
import { detectFurnitureLocally } from "@/lib/ai/local-furniture-detection";
import { furnitureCatalog, simulatedFurnitureIds } from "@/lib/furniture-catalog";
import type { FurnitureItem, FurniturePreference, FurnitureReview } from "@/lib/local-projects";

type Props = { review: FurnitureReview; imageCount: number; imageUrl?: string; onChange: (review: FurnitureReview) => void };
type RemovedItem = { item: FurnitureItem; index: number } | null;

const sourceLabels = {
  simulated: "Simuliert erkannt",
  ai: "Lokal durch KI erkannt",
  corrected: "Vom Nutzer korrigiert",
  manual: "Vom Nutzer ergänzt",
};

export default function FurniturePlanner({ review, imageCount, imageUrl, onChange }: Props) {
  const [catalogId, setCatalogId] = useState(furnitureCatalog[0].id);
  const [quantity, setQuantity] = useState(1);
  const [removedItem, setRemovedItem] = useState<RemovedItem>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(review.items[0]?.id ?? null);
  const [localAiConsent, setLocalAiConsent] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [detectionMessage, setDetectionMessage] = useState("");
  const catalogGroups = useMemo(() => [...new Set(furnitureCatalog.map(({ group }) => group))], []);
  const selectedItem = review.items.find((item) => item.id === selectedItemId) ?? review.items[0] ?? null;

  function startSimulation() {
    const items = simulatedFurnitureIds.map((id) => {
      const catalogItem = furnitureCatalog.find((item) => item.id === id)!;
      return { id: crypto.randomUUID(), catalogId: id, label: catalogItem.label, source: "simulated", preference: "none", comment: "", quantity: 1 } satisfies FurnitureItem;
    });
    setSelectedItemId(items[0]?.id ?? null);
    onChange({ ...review, status: "ready", method: "simulation", items });
  }

  async function startLocalDetection() {
    if (!imageUrl || !localAiConsent) return;
    setDetectionStatus("loading");
    setDetectionMessage("Das kostenlose Erkennungsmodell wird vorbereitet. Beim ersten Mal kann das etwas dauern.");
    try {
      const detections = await detectFurnitureLocally(imageUrl);
      const items = detections.map(({ catalogId, label, confidence }) => ({
        id: crypto.randomUUID(), catalogId, label, confidence,
        source: "ai", preference: "none", comment: "", quantity: 1,
      } satisfies FurnitureItem));
      setSelectedItemId(items[0]?.id ?? null);
      onChange({ ...review, status: "ready", method: "local_ai", items });
      setDetectionStatus("done");
      setDetectionMessage(items.length
        ? `${items.length} passende Möbel wurden lokal erkannt. Bitte prüfen und korrigieren Sie das Ergebnis.`
        : "Die lokale KI hat kein unterstütztes Möbel sicher erkannt. Sie können Möbel ergänzen oder die Simulation verwenden.");
    } catch {
      setDetectionStatus("error");
      setDetectionMessage("Die lokale KI konnte auf diesem Gerät nicht gestartet werden. Es wurden keine Fotos übertragen und keine Kosten verursacht.");
    }
  }

  function updateItem(id: string, changes: Partial<FurnitureItem>) {
    onChange({ ...review, items: review.items.map((item) => item.id === id ? { ...item, ...changes } : item) });
  }

  function correctItem(id: string, nextCatalogId: string) {
    const catalogItem = furnitureCatalog.find((item) => item.id === nextCatalogId);
    if (catalogItem) updateItem(id, { catalogId: catalogItem.id, label: catalogItem.label, source: "corrected", quantity: 1, confidence: undefined });
  }

  function removeItem(id: string) {
    const index = review.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    setRemovedItem({ item: review.items[index], index });
    const items = review.items.filter((item) => item.id !== id);
    if (selectedItem?.id === id) setSelectedItemId(items[Math.min(index, items.length - 1)]?.id ?? null);
    onChange({ ...review, items });
  }

  function undoRemove() {
    if (!removedItem) return;
    const items = [...review.items];
    items.splice(Math.min(removedItem.index, items.length), 0, removedItem.item);
    onChange({ ...review, items });
    setSelectedItemId(removedItem.item.id);
    setRemovedItem(null);
  }

  function addFurniture() {
    const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
    if (!catalogItem) return;
    const item = {
      id: crypto.randomUUID(), catalogId: catalogItem.id, label: catalogItem.label,
      source: "manual", preference: "add", comment: "",
      quantity: catalogItem.supportsQuantity ? quantity : 1,
    } satisfies FurnitureItem;
    onChange({
      ...review,
      status: "ready",
      items: [...review.items, item],
    });
    setSelectedItemId(item.id);
  }

  if (review.status === "not_started") return (
    <section className="furniture-planner" aria-labelledby="furniture-title">
      <div className="furniture-heading"><span>5</span><div><h2 id="furniture-title">Möbel und Wünsche prüfen</h2><p>Ein kostenloses Testmodell kann das erste Foto direkt in diesem Browser untersuchen.</p></div></div>
      <div className="local-ai-consent">
        <label><input type="checkbox" checked={localAiConsent} onChange={(event) => setLocalAiConsent(event.target.checked)} /> Ich erlaube die lokale KI-Analyse dieses Fotos.</label>
        <small>Das Raumfoto bleibt auf diesem Gerät und wird nicht an OpenAI, Google oder Raumly übertragen. Nur die Modelldateien werden einmalig von Hugging Face geladen und anschließend im Browser gespeichert.</small>
      </div>
      <button className="simulation-button" type="button" disabled={!imageUrl || !localAiConsent || detectionStatus === "loading"} onClick={startLocalDetection}>{detectionStatus === "loading" ? "Lokale KI wird vorbereitet …" : "Lokale KI-Erkennung starten"}</button>
      {detectionMessage && <p className={`detection-status ${detectionStatus}`} role="status">{detectionMessage}</p>}
      <div className="simulation-fallback"><small>Alternativ ohne Fotoanalyse:</small><button type="button" disabled={imageCount === 0} onClick={startSimulation}>Test-Erkennung starten</button></div>
      <small>{imageCount ? "Das erste ausgewählte Foto wird für den lokalen Test verwendet." : "Wählen Sie zuerst mindestens ein Foto in dieser Sitzung aus."}</small>
    </section>
  );

  return (
    <section className="furniture-planner" aria-labelledby="furniture-title">
      <div className="furniture-heading"><span>5</span><div><h2 id="furniture-title">Möbel und Wünsche prüfen</h2><p>{review.method === "local_ai" || review.items.some((item) => item.source === "ai") ? <><strong>Lokaler KI-Test:</strong> Bitte prüfen und korrigieren Sie das Ergebnis.</> : <><strong>Testsimulation:</strong> Die Einträge wurden nicht aus Ihrem Foto erkannt.</>} Alle Angaben sind freiwillig.</p></div></div>

      {detectionMessage && <p className={`detection-status ${detectionStatus}`} role="status">{detectionMessage}</p>}

      <label className="general-note" htmlFor="general-room-note">Allgemeine Raumnotiz <small>{review.generalNote.length}/500</small></label>
      <textarea id="general-room-note" maxLength={500} value={review.generalNote} onChange={(event) => onChange({ ...review, generalNote: event.target.value })} placeholder="z. B. Keine schwarzen Möbel und möglichst viel geschlossener Stauraum" />

      {removedItem && <div className="undo-banner" role="status"><span>„{removedItem.item.label}“ wurde entfernt.</span><button type="button" onClick={undoRemove}>Rückgängig</button></div>}
      {review.items.length === 0 && <p className="empty-furniture">Keine Möbel in der Planung. Sie können unten Möbel ergänzen oder den Ablauf ohne Vorgaben fortsetzen.</p>}

      {review.items.length > 0 && <div className="furniture-selector" aria-label="Möbel auswählen">
        {review.items.map((item) => <button className={selectedItem?.id === item.id ? "selected" : ""} type="button" aria-pressed={selectedItem?.id === item.id} onClick={() => setSelectedItemId(item.id)} key={item.id}><span>{item.label}{item.quantity > 1 ? ` (${item.quantity}×)` : ""}</span><small>{sourceLabels[item.source]}{item.confidence ? ` · ${Math.round(item.confidence * 100)} %` : ""}</small></button>)}
      </div>}

      {selectedItem && <article className="furniture-card" key={selectedItem.id}>
        <div className="furniture-card-heading"><div><small>{sourceLabels[selectedItem.source]}</small><h3>{selectedItem.label}{selectedItem.quantity > 1 ? ` (${selectedItem.quantity}×)` : ""}</h3></div><button type="button" onClick={() => removeItem(selectedItem.id)}>{selectedItem.source === "manual" ? "Aus Planung entfernen" : "Falsch erkannt – entfernen"}</button></div>
        {selectedItem.source !== "manual" ? (
          <fieldset><legend>Ihre freiwillige Vorgabe</legend>{(["none", "keep", "replace"] as FurniturePreference[]).map((preference) => <label key={preference}><input type="radio" name={`preference-${selectedItem.id}`} checked={selectedItem.preference === preference} onChange={() => updateItem(selectedItem.id, { preference })} />{{ none: "Keine Vorgabe", keep: "Behalten", replace: "Ersetzen", add: "Ergänzen" }[preference]}</label>)}</fieldset>
        ) : <p className="added-status">Vorgabe: Ergänzen</p>}
        <label htmlFor={`comment-${selectedItem.id}`}>Freiwilliger Kommentar <small>{selectedItem.comment.length}/300</small></label>
        <textarea id={`comment-${selectedItem.id}`} maxLength={300} value={selectedItem.comment} onChange={(event) => updateItem(selectedItem.id, { comment: event.target.value })} placeholder="Optionaler Hinweis zu diesem Möbelstück" />
        {selectedItem.source !== "manual" && <details className="correction-control"><summary>Erkennung korrigieren</summary><label htmlFor={`correct-${selectedItem.id}`}>Tatsächliche Möbelart</label><select id={`correct-${selectedItem.id}`} value={selectedItem.catalogId} onChange={(event) => correctItem(selectedItem.id, event.target.value)}>{catalogGroups.map((group) => <optgroup label={group} key={group}>{furnitureCatalog.filter((entry) => entry.group === group).map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</optgroup>)}</select></details>}
      </article>}

      <details className="add-furniture"><summary>Möbel ergänzen</summary><div><label htmlFor="catalog-furniture">Möbelart</label><select id="catalog-furniture" value={catalogId} onChange={(event) => { setCatalogId(event.target.value); setQuantity(1); }}>{catalogGroups.map((group) => <optgroup label={group} key={group}>{furnitureCatalog.filter((entry) => entry.group === group).map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</optgroup>)}</select>{furnitureCatalog.find((item) => item.id === catalogId)?.supportsQuantity && <><label htmlFor="furniture-quantity">Anzahl</label><select id="furniture-quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6].map((count) => <option key={count}>{count}</option>)}</select></>}<button type="button" onClick={addFurniture}>Zur Planung hinzufügen</button></div></details>
    </section>
  );
}
