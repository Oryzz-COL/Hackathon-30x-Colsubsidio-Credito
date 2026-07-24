import Image from "next/image";
import Link from "next/link";

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`colsubsidio-lockup ${compact ? "compact" : ""}`} aria-label="Creasy para Colsubsidio, ir al inicio">
      <span className="brand-image">
        <Image
          src="/brand/colsubsidio-logo-amarillo-blanco.png"
          alt="Colsubsidio"
          width={160}
          height={56}
          priority
        />
      </span>
      <span className="brand-product"><strong>Creasy</strong><small>Prototipo</small></span>
    </Link>
  );
}
