import { productPurchaseBlockers } from "@/lib/product-concept";
import type { ProductConcept } from "@/lib/product-concept";
import type { CSSProperties } from "react";

const categoryLabels: Record<string, string> = {
  sofa: "Sofa", "coffee-table": "Couchtisch", rug: "Teppich", "floor-lamp": "Stehleuchte",
  armchair: "Sessel", sideboard: "Sideboard", plant: "Zimmerpflanze",
};

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function AutomaticProductConcept({ concept }: { concept: ProductConcept }) {
  return (
    <section className="product-concept" aria-labelledby="product-concept-title">
      <small className="summary-kicker">AUTOMATISCHE PRODUKTAUSWAHL · TESTDATEN</small>
      <h3 id="product-concept-title">Visuelles Einrichtungskonzept</h3>
      <p>Raumly hat passende Testprodukte automatisch ausgewählt. Sie sind synthetisch, nicht kaufbar und verwenden keine Händlerbilder.</p>
      <p className="fit-status">{concept.scaleBasis.mode === "room-dimensions" ? `Größenprüfung mit ${concept.scaleBasis.roomWidthCm} × ${concept.scaleBasis.roomDepthCm} cm Raummaß.` : `Passform geschätzt anhand eines Referenzmaßes von ${concept.scaleBasis.referenceLengthCm} cm.`}</p>
      <div className="concept-room" aria-label={`Schematische Konzeptvorschau im Stil ${concept.style}`}>
        {concept.items.map((item) => (
          <div className={`concept-shape concept-${item.category}`} style={{ "--product-color": item.color } as CSSProperties} key={item.id}>
            <span>{categoryLabels[item.category]}</span>
          </div>
        ))}
      </div>
      <div className="concept-products">
        {concept.items.map((item) => {
          const blockers = productPurchaseBlockers(item);
          return <article key={item.id} className="purchase-card">
            <span className="product-swatch" style={{ background: item.color }} aria-hidden="true" />
            <div className="purchase-card-copy">
              <strong>{item.title}</strong>
              <small>Synthetisches Testprodukt · ID {item.sourceProductId}</small>
              <small>{item.widthCm} × {item.depthCm} × {item.heightCm} cm · {item.material}</small>
              <small>Preis {euro(item.priceCents ?? 0)} · Versand {euro(item.shippingCents ?? 0)} · geprüft {new Date(item.checkedAt).toLocaleDateString("de-DE")}</small>
              <span className="purchase-status">{blockers.join(" · ")}</span>
            </div>
            <div className="purchase-card-action"><b>{euro((item.priceCents ?? 0) + (item.shippingCents ?? 0))}</b>{blockers.length === 0 && item.productUrl
              ? <a href={item.productUrl} rel="noopener noreferrer sponsored">Beim Händler ansehen</a>
              : <button type="button" disabled>Testlink nicht verfügbar</button>}</div>
          </article>;
        })}
      </div>
      {concept.completeness === "incomplete" && <p className="concept-warning" role="status">Mit diesem Budget ist noch kein vollständiges Basiskonzept möglich. Fehlend: {concept.missingCategories.map((category) => categoryLabels[category]).join(", ")}.</p>}
      <dl className="concept-budget">
        <div><dt>Produkte</dt><dd>{euro(concept.productSubtotalCents)}</dd></div>
        <div><dt>Versand</dt><dd>{euro(concept.shippingTotalCents)}</dd></div>
        <div><dt>Sicherheitsreserve</dt><dd>{euro(concept.reserveCents)}</dd></div>
        <div><dt>Verbleibend einschließlich Reserve</dt><dd>{euro(concept.remainingCents)}</dd></div>
      </dl>
      <div className="prototype-note"><strong>KI-Bild gesperrt</strong><p>Für diese Testprodukte fehlen freigegebene Händlerdaten und ausdrückliche Bildrechte. Daher wird kein Raumfoto übertragen, kein KI-Bild erzeugt und es entstehen keine KI-Kosten.</p></div>
    </section>
  );
}
