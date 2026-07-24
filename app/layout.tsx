import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Creasy para Colsubsidio | Afinidad explicable",
  description: "Orientación crediticia explicable con datos declarados, preferencias y autorizaciones por finalidad.",
  openGraph: {
    title: "Creasy para Colsubsidio",
    description: "Necesidades explicables. Acciones relevantes. Control para el afiliado.",
    images: [{ url: "/og.png", width: 1536, height: 864, alt: "Creasy para Colsubsidio — orientación explicable" }],
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CO" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
