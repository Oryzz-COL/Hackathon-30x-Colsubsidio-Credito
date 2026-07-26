import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Eye, Fingerprint, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { BRAND } from "@/config/brand";
import { BrandLockup } from "@/components/brand-lockup";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <BrandLockup/>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16}/> Afinidad explicable, no aprobación automática</p>
          <h1>{BRAND.tagline}</h1>
          <p className="hero-lead">Enriquece perfiles con señales internas, externas y contextuales para convertir una oferta genérica en producto, condición, canal y momento personalizados.</p>
          <div className="experience-gates" aria-label="Selecciona tu experiencia">
            <Link href="/orientacion" className="experience-card affiliate-entry">
              <span><UserRound/></span>
              <div><small>Soy afiliado</small><strong>Encuentra una opción para ti</strong><p>Recibe orientación inmediata y explicable.</p></div>
              <ArrowRight/>
            </Link>
            <Link href="/demo?view=enrichment&jury=1" className="experience-card advisor-entry">
              <span><BriefcaseBusiness/></span>
              <div><small>Quiero ver el reto resuelto</small><strong>Abrir Signal Lab</strong><p>Ingresa una cédula sintética y mira qué cambia.</p></div>
              <ArrowRight/>
            </Link>
          </div>
          <div className="trust-row">
            <span><ShieldCheck/> Privacidad por diseño</span>
            <span><Eye/> Evidencia visible</span>
            <span><Fingerprint/> Revisión humana</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Vista previa de un análisis explicable">
          <div className="visual-head"><span className="avatar">VR</span><div><strong>Valentina R.</strong><small>Categoría A · Bogotá</small></div><span className="source-pill">3 fuentes</span></div>
          <div className="need-note"><small>Necesidad declarada</small><strong>Financiar una especialización</strong><p>Fuente: formulario del afiliado · hace 3 días</p></div>
          <div className="score-preview">
            <div className="score-ring"><strong>3</strong><small>señales</small></div>
            <div><small>Correspondencia orientativa</small><h3>Crédito educativo</h3><p><CheckCircle2/> Evidencia disponible para revisar</p></div>
          </div>
          <div className="human-strip"><ShieldCheck size={17}/><span>Requiere validación formal y revisión humana</span></div>
        </div>
      </section>
      <section className="challenge-context" aria-labelledby="challenge-title">
        <div><span className="eyebrow">Crédito hiperpersonalizado</span><h2 id="challenge-title">La opción adecuada, en el momento oportuno y por el canal elegido</h2><p>Creasy parte de una cédula sintética, enriquece el perfil con señales exógenas autorizadas y explica qué dato cambió cada oferta.</p></div>
        <div className="challenge-metrics"><article><strong>Dato externo</strong><span>Interés o evento autorizado</span></article><article><strong>Oferta</strong><span>Producto y condición</span></article><article><strong>Activación</strong><span>Canal y momento</span></article></div>
        <small>La persona conserva el control de sus autorizaciones y toda orientación requiere revisión humana.</small>
      </section>
      <section className="value-grid">
        <article><strong>100 %</strong><span>de recomendaciones explicables en la demo</span></article>
        <article><strong>36</strong><span>casos de ejemplo listos para explorar</span></article>
        <article><strong>7</strong><span>opciones documentadas en el catálogo público</span></article>
        <article><strong>0</strong><span>decisiones de aprobación automatizadas</span></article>
      </section>
      <section className="principle"><p>Colsubsidio no necesita más datos sin contexto.</p><h2>Necesita convertir datos autorizados en necesidades explicables y acciones relevantes.</h2></section>
    </main>
  );
}
