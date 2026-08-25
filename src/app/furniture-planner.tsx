"use client";

import { useMemo, useState } from "react";
import { furnitureCatalog, simulatedFurnitureIds } from "@/lib/furniture-catalog";
import type { FurnitureItem, FurniturePreference, FurnitureReview } from "@/lib/local-projects";

type Props = { review: FurnitureReview; imageCount: number; onChange: (review: FurnitureReview) => void };
type RemovedItem = { item: FurnitureItem; index: number } | null;

const sourceLabels = {
  simulated: "Simuliert erkannt",
  corrected: "Vom Nutzer korrigiert",
  manual: "Vom Nutzer ergänzt",
};

export default function FurniturePlanner({ review, imageCount, onChange }: Props) {
  const [catalogId, setCatalogId] = useState(furnitureCatalog[0].id);
  const [quantity, setQuantity] = useState(1);
  const [removedItem, setRemovedItem] = useState<RemovedItem>(null);
  const catalogGroups = useMemo(() => [...new Set(furnitureCatalog.map(({ group }) => group))], []);

  function startSimulation() {
    const items = simulatedFurnitureIds.map((id) => {
      const catalogItem = furnitureCatalog.find((item) => item.id === id)!;
      return { id: crypto.randomUUID(), catalogId: id, label: catalogItem.label, source: "simulated", preference: "none", comment: "", quantity: 1 } satisfies FurnitureItem;
    });
    onChange({ ...review, status: "ready", items });
  }

  function updateItem(id: string, changes: Partial<FurnitureItem>) {
    onChange({ ...review, items: review.items.map((item) => item.id === id ? { ...item, ...changes } : item) });
  }

  function correctItem(id: string, nextCatalogId: string) {
    const catalogItem = furnitureCatalog.find((item) => item.id === nextCatalogId);
    if (catalogItem) updateItem(id, { catalogId: catalogItem.id, label: catalogItem.label, source: "corrected", quantity: 1 });
  }

  function removeItem(id: string) {
    const index = review.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    setRemovedItem({ item: review.items[index], index });
    onChange({ ...review, items: review.items.filter((item) => item.id !== id) });
  }

  function undoRemove() {
    if (!removedItem) return;
    const items = [...review.items];
    items.splice(Math.min(removedItem.index, items.length), 0, removedItem.item);
    onChange({ ...review, items });
    setRemovedItem(null);
  }

  function addFurniture() {
    const catalogItem = furnitureCatalog.find((item) => item.id === catalogId);
    if (!catalogItem) return;
    onChange({
      ...review,
      status: "ready",
      items: [...review.items, {
        id: crypto.randomUUID(), catalogId: catalogItem.id, label: catalogItem.label,
        source: "manual", preference: "add", comment: "",
        quantity: catalogItem.supportsQuantity ? quantity : 1,
      }],
    });
  }

  if (review.status === "not_started") return (
    <section className="furniture-planner" aria-labelledby="furniture-title">
      <div className="furniture-heading"><span>5</span><div><h2 id="furniture-title">Möbel und Wünsche prüfen</h2><p>Dieser Schritt verwendet vorbereitete Testdaten. Ihr Foto wird nicht analysiert.</p></div></div>
      <button className="simulation-button" type="button" disabled={imageCount === 0} onClick={startSimulation}>Test-Erkennung starten</button>
      <small>{imageCount ? "Die Simulation ist bereit." : "Wählen Sie zuerst mindestens ein Foto in dieser Sitzung aus."}</small>
    </section>
  );

  return (
    <section className="furniture-planner" aria-labelledby="furniture-title">
      <div className="furniture-heading"><span>5</span><div><h2 id="furniture-title">Möbel und Wünsche prüfen</h2><p><strong>Testsimulation:</strong> Die Einträge wurden nicht aus Ihrem Foto erkannt. Alle Angaben sind freiwillig.</p></div></div>

      <label className="general-note" htmlFor="general-room-note">Allgemeine Raumnotiz <small>{review.generalNote.length}/500</small></label>
      <textarea id="general-room-note" maxLength={500} value={review.generalNote} onChange={(event) => onChange({ ...review, generalNote: event.target.value })} placeholder="z. B. Keine schwarzen Möbel und möglichst viel geschlossener Stauraum" />

      {removedItem && <div className="undo-banner" role="status"><span>„{removedItem.item.label}“ wurde entfernt.</span><button type="button" onClick={undoRemove}>Rückgängig</button></div>}
      {review.items.length === 0 && <p className="empty-furniture">Keine Möbel in der Planung. Sie können unten Möbel ergänzen oder den Ablauf ohne Vorgaben fortsetzen.</p>}

      <div className="furniture-list">
        {review.items.map((item) => (
          <article className="furniture-card" key={item.id}>
            <div className="furniture-card-heading"><div><small>{sourceLabels[item.source]}</small><h3>{item.label}{item.quantity > 1 ? ` (${item.quantity}×)` : ""}</h3></div><button type="button" onClick={() => removeItem(item.id)}>{item.source === "manual" ? "Aus Planung entfernen" : "Falsch erkannt – entfernen"}</button></div>
            {item.source !== "manual" ? (
              <fieldset><legend>Ihre freiwillige Vorgabe</legend>{(["none", "keep", "replace"] as FurniturePreference[]).map((preference) => <label key={preference}><input type="radio" name={`preference-${item.id}`} checked={item.preference === preference} onChange={() => updateItem(item.id, { preference })} />{{ none: "Keine Vorgabe", keep: "Behalten", replace: "Ersetzen", add: "Ergänzen" }[preference]}</label>)}</fieldset>
            ) : <p className="added-status">Vorgabe: Ergänzen</p>}
            <label htmlFor={`comment-${item.id}`}>Freiwilliger Kommentar <small>{item.comment.length}/300</small></label>
            <textarea id={`comment-${item.id}`} maxLength={300} value={item.comment} onChange={(event) => updateItem(item.id, { comment: event.target.value })} placeholder="Optionaler Hinweis zu diesem Möbelstück" />
            {item.source !== "manual" && <details className="correction-control"><summary>Erkennung korrigieren</summary><label htmlFor={`correct-${item.id}`}>Tatsächliche Möbelart</label><select id={`correct-${item.id}`} value={item.catalogId} onChange={(event) => correctItem(item.id, event.target.value)}>{catalogGroups.map((group) => <optgroup label={group} key={group}>{furnitureCatalog.filter((entry) => entry.group === group).map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</optgroup>)}</select></details>}
          </article>
        ))}
      </div>

      <details className="add-furniture"><summary>Möbel ergänzen</summary><div><label htmlFor="catalog-furniture">Möbelart</label><select id="catalog-furniture" value={catalogId} onChange={(event) => { setCatalogId(event.target.value); setQuantity(1); }}>{catalogGroups.map((group) => <optgroup label={group} key={group}>{furnitureCatalog.filter((entry) => entry.group === group).map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</optgroup>)}</select>{furnitureCatalog.find((item) => item.id === catalogId)?.supportsQuantity && <><label htmlFor="furniture-quantity">Anzahl</label><select id="furniture-quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6].map((count) => <option key={count}>{count}</option>)}</select></>}<button type="button" onClick={addFurniture}>Zur Planung hinzufügen</button></div></details>
    </section>
  );
}
