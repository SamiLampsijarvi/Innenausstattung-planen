import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raumly",
  description: "KI-gestützte Einrichtungsplanung für das Zuhause",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
