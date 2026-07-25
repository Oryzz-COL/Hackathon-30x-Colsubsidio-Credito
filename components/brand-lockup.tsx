import Image from "next/image";
import Link from "next/link";

export function BrandLockup({ compact = false, surface = "dark" }: { compact?: boolean; surface?: "dark" | "light" }) {
  return (
    <Link href="/" className={`colsubsidio-lockup on-${surface} ${compact ? "compact" : ""}`} aria-label="Creasy para Colsubsidio, ir al inicio">
      <span className="brand-image">
        <Image
          src={surface === "light"
            ? "/brand/colsubsidio-logo-amarillo-negro.png"
            : "/brand/colsubsidio-logo-amarillo-blanco.png"}
          alt="Colsubsidio"
          width={160}
          height={56}
          priority
        />
      </span>
      <span className="brand-product"><strong>Creasy</strong><small>Orientación</small></span>
    </Link>
  );
}
