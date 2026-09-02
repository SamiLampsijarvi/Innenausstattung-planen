import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalPage({ title, notice, children }: { title: string; notice?: string; children: ReactNode }) {
  return <div className="legal-shell">
    <header><Link className="pilot-brand" href="/"><span>R</span> Raumly</Link></header>
    <main><small>RAUMLY · VORABVERSION</small><h1>{title}</h1>{notice && <p className="legal-notice" role="note">{notice}</p>}<div className="legal-copy">{children}</div></main>
    <footer><Link href="/">Zur Startseite</Link></footer>
  </div>;
}
