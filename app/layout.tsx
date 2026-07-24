import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Creasy | Afinidad explicable",
  description: "Copiloto de enriquecimiento y afinidad crediticia explicable con datos autorizados.",
  openGraph: {
    title: "Creasy",
    description: "Necesidades explicables. Acciones relevantes.",
    images: [{ url: "/og.png", width: 1536, height: 864, alt: "Creasy — necesidades explicables y acciones relevantes" }],
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CO" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
