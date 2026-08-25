"use client";

import { useState } from "react";
import type { DesignDraft, LivingRoomPlan } from "@/lib/local-projects";

type Props = {
  plan: LivingRoomPlan;
  canCreate: boolean;
  onChange: (drafts: DesignDraft[]) => void;
};

type RemovedDraft = { draft: DesignDraft; index: number } | null;

const variants = [
  { variant: 1 as const, title: "Ruhige Basis", palette: ["#E8E2D6", "#C9B99A", "#718173", "#24453E"], concept: "Eine ruhige Grundlage mit natürlichen Materialien, weichen Übergängen und zurückhaltenden Akzenten." },
  { variant: 2 as const, title: "Warme Akzente", palette: ["#F1E5D2", "#C87955", "#A99A7D", "#3C5148"], concept: "Eine wohnliche Variante mit warmen Farbakzenten, klaren Funktionszonen und gemütlicher Lichtwirkung." },
  { variant: 3 as const, title: "Klare Kontraste", palette: ["#F4F1EA", "#9FA8A3", "#5B6B66", "#173F38"], concept: "Eine aufgeräumte Variante mit deutlichen Kontrasten, reduzierter Dekoration und präziser Raumwirkung." },
];

const preferenceLabels = { none: "Keine Vorgabe", keep: "Behalten", replace: "Ersetzen", add: "Ergänzen" };

export default function DraftResults({ plan, canCreate, onChange }: Props) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(plan.drafts[0]?.id ?? null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [removedDraft, setRemovedDraft] = useState<RemovedDraft>(null);
  const selectedDraft = plan.drafts.find(({ id }) => id === selectedDraftId) ?? null;
  const comparisonDrafts = comparisonIds.flatMap((id) => plan.drafts.find((draft) => draft.id === id) ?? []);
  const limitReached = plan.drafts.length >= 3;

  function createDraft() {
    if (!canCreate || limitReached) return;
    const variant = variants.find((entry) => !plan.drafts.some((draft) => draft.variant === entry.variant)) ?? variants[plan.drafts.length % variants.length];
    const draft: DesignDraft = {
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), variant: variant.variant,
      title: variant.title, style: plan.style, postcode: plan.postcode, budget: plan.budget,
      palette: variant.palette, concept: `${variant.concept} Der gewählte Stil „${plan.style}“ bildet die gestalterische Grundlage.`,
      generalNote: plan.furnitureReview.generalNote,
      furniture: plan.furnitureReview.items.map(({ label, preference, comment, quantity }) => ({ label, preference, comment, quantity })),
    };
    onChange([...plan.drafts, draft]);
    setSelectedDraftId(draft.id);
    setRemovedDraft(null);
  }

  function removeDraft(draft: DesignDraft) {
    const index = plan.drafts.findIndex(({ id }) => id === draft.id);
    const drafts = plan.drafts.filter(({ id }) => id !== draft.id);
    setRemovedDraft({ draft, index });
    setComparisonIds((ids) => ids.filter((id) => id !== draft.id));
    if (selectedDraftId === draft.id) setSelectedDraftId(drafts[Math.min(index, drafts.length - 1)]?.id ?? null);
    onChange(drafts);
  }

  function undoRemove() {
    if (!removedDraft || plan.drafts.length >= 3) return;
    const drafts = [...plan.drafts];
    drafts.splice(Math.min(removedDraft.index, drafts.length), 0, removedDraft.draft);
    onChange(drafts);
    setSelectedDraftId(removedDraft.draft.id);
    setRemovedDraft(null);
  }

  function toggleComparison(id: string) {
    setComparisonIds((ids) => ids.includes(id) ? ids.filter((entry) => entry !== id) : ids.length < 3 ? [...ids, id] : ids);
  }

  return (
    <section className="draft-results" aria-labelledby="drafts-title">
      <div className="drafts-heading"><div><small>LOKALE TESTDATEN</small><h3 id="drafts-title">Ihre Testentwürfe</h3></div><strong>{plan.drafts.length} von 3</strong></div>
      <p className="drafts-explanation">Diese Varianten wurden nicht durch eine KI erzeugt. Sie testen ausschließlich den späteren Entwurfsablauf.</p>
      <button className="create-draft-button" type="button" onClick={createDraft} disabled={!canCreate || limitReached}>Testentwurf erstellen</button>
      {!canCreate && <small className="draft-help">Vervollständigen Sie Stil, Foto und Postleitzahl, um einen Testentwurf zu erstellen.</small>}
      {limitReached && <small className="draft-help">Die Grenze von drei Testentwürfen ist erreicht. Löschen Sie zuerst einen Entwurf.</small>}

      {removedDraft && <div className="draft-undo" role="status"><span>„{removedDraft.draft.title}“ wurde entfernt.</span><button type="button" onClick={undoRemove}>Rückgängig</button></div>}

      <div className="draft-list">
        {plan.drafts.map((draft, index) => (
          <article className={selectedDraft?.id === draft.id ? "draft-card selected" : "draft-card"} key={draft.id}>
            <small>SIMULIERTER TESTENTWURF · KEINE KI</small>
            <h4>Entwurf {index + 1}: {draft.title}</h4>
            <p>{draft.style} · {draft.budget.toLocaleString("de-DE")} €</p>
            <div className="palette" aria-label={`Farbpalette für Entwurf ${index + 1}`}>{draft.palette.map((color) => <span style={{ backgroundColor: color }} key={color} />)}</div>
            <div className="draft-card-actions"><button type="button" onClick={() => setSelectedDraftId(draft.id)}>Entwurf öffnen</button><button className="delete-draft" type="button" onClick={() => removeDraft(draft)}>Entwurf löschen</button></div>
            <label><input type="checkbox" checked={comparisonIds.includes(draft.id)} onChange={() => toggleComparison(draft.id)} /> Für Vergleich auswählen</label>
          </article>
        ))}
      </div>

      {selectedDraft && <DraftDetail draft={selectedDraft} title="Ausgewählter Entwurf" />}

      {comparisonDrafts.length > 0 && <section className="draft-comparison" aria-labelledby="comparison-title"><h3 id="comparison-title">Vergleichsauswahl</h3><p>{comparisonDrafts.length < 2 ? "Wählen Sie mindestens einen weiteren Entwurf aus." : `${comparisonDrafts.length} Entwürfe werden untereinander verglichen.`}</p>{comparisonDrafts.length >= 2 && comparisonDrafts.map((draft) => <DraftDetail draft={draft} title={draft.title} key={draft.id} />)}</section>}
    </section>
  );
}

function DraftDetail({ draft, title }: { draft: DesignDraft; title: string }) {
  const specifiedFurniture = draft.furniture.filter(({ preference, comment }) => preference !== "none" || comment);
  return <article className="draft-detail"><small>SIMULIERTER TESTENTWURF · KEINE KI</small><h3>{title}</h3><dl><div><dt>Variante</dt><dd>{draft.title}</dd></div><div><dt>Stil</dt><dd>{draft.style}</dd></div><div><dt>Budget</dt><dd>{draft.budget.toLocaleString("de-DE")} €</dd></div><div><dt>Postleitzahl</dt><dd>{draft.postcode}</dd></div><div><dt>Raumnotiz</dt><dd>{draft.generalNote || "Keine Vorgabe"}</dd></div></dl><div className="draft-detail-palette"><strong>Farbpalette</strong><div className="palette">{draft.palette.map((color) => <span style={{ backgroundColor: color }} key={color} />)}</div></div><strong>Konzept</strong><p>{draft.concept}</p><strong>Möbelvorgaben</strong>{specifiedFurniture.length ? <ul>{specifiedFurniture.map((item, index) => <li key={`${item.label}-${index}`}><b>{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.label}:</b> {preferenceLabels[item.preference]}{item.comment ? ` – ${item.comment}` : ""}</li>)}</ul> : <p>Keine besonderen Möbelvorgaben.</p>}</article>;
}
