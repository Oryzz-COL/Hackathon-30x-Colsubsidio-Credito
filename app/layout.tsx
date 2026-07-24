import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Creasy para Colsubsidio | Hiperpersonalización explicable",
  description: "Contexto vivo y orientación crediticia hiperpersonalizada con señales propias, recientes y autorizadas.",
  openGraph: {
    title: "Creasy | Hiperpersonalización sin fricción",
    description: "Señales autorizadas, contexto vivo y crédito relevante con explicación y control.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Creasy — señales autorizadas, contexto vivo y crédito relevante" }],
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CO" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
