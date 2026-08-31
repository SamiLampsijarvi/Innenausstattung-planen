import ImageTestPanel from "./test-panel";
import Link from "next/link";

export const metadata = { title: "Raumly – interner Bildtest", robots: { index: false, follow: false } };

export default function ImageTestPage() {
  return <main style={{ maxWidth: 880, margin: "40px auto", padding: "0 20px" }}>
    <Link href="/">Zurück zu Raumly</Link>
    <h1>Interner Inspirationsbild-Test</h1>
    <p>Getrennt vom normalen Planungsablauf. Höchstens fünf freigegebene Fotos,
      zwei bewusst gestartete Versuche je Foto und 3 € interne Reservierungen.</p>
    <p>Die vorgesehenen 2 € Reserve bis zum Gesamtbudget von 5 € sind keine Garantie
      gegen abweichende oder verzögerte Google-Abrechnung.</p>
    <ImageTestPanel />
  </main>;
}
